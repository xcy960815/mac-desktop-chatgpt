# Mac Desktop ChatGPT 项目重构总结架构规范

本文档用于总结 2026年3月 针对系统托盘 (Tray) 和 右键菜单 (Context Menu) 的重构部分和编码风格规范。所有的后续功能增加和维护都应尽最大努力符合以下架构设计准则。

## 1. 重构背景与痛点
在重构前，项目的入口文件 `src/main.ts` 承载了过多本不属于主程序初始化的职责：
- 系统托盘实例 (`Tray`) 的直接创建及多形态（深浅色）应用逻辑。
- 各菜单项被点击后的业务逻辑高度耦合在内部。
- 面向对象的单例类（如原有的 `class UpdateManager`）需要在 `main.ts` 中初始化后像传家宝一样一层层往下透传，增加了方法签名的复杂度。

## 2. 本次重构主要模块
本次重构的核心动作是将**所有的托盘级功能解耦为无状态的高阶闭包函数 (Handlers)**。

### 2.1 托盘生命周期与渲染解耦 (AppTray)
- 原本在 `main.ts` 中的托盘创建，被合并至 `src/tray-context-menu.ts` 导出的 `setupAppTray` 函数中统一管理。
- `main.ts` 只用一行代码完成托盘初始化，并用全局顶层变量 `let appTray: Tray | null = null` 承接引用，一举解决了**因为 V8 垃圾回收机制 (GC) 导致 Tray 图标神秘消失** 的边界 Bug。
- 配置参数收敛为 `AppTrayOptions` 接口。

### 2.2 统一的函数式处理流 (Handlers)
将所有的弹窗、系统设置项交互、检查更新等，统一放置于 `src/handlers/` 目录下。摒弃传统的 Class 写法。
包括如下文件均采用同一范式：
- `model-handler.ts` (模型切换)
- `proxy-handler.ts` (代理设置)
- `shortcut-handler.ts` (快捷键设置)
- `update-handler.ts` (检查更新)
- `system-handler.ts` (重新加载、开机自启等全局操作)

## 3. 编码风格与开发规范 (Coding Style)

如果你要在本项目中新增一项右键菜单功能（例如“清理缓存”），必须遵循如下风格指导：

### 3.1 闭包注入 (High Order Function)
不要定义 class 或单例。如果你的功能需要状态（例如防止按钮连击的 `isChecking` 变量），直接将其写在模块或函数的闭包作用域中。
所有新注册的交互功能，都应以 `createXXXHandler` 的形式暴露：
```typescript
// 规范示例
let isProcessing = false;

export const createMyNewHandler = (
  options: AppTrayOptions & { tray: Tray },
  menuLanguage: MenuLanguage
) => {
  return async () => {
    if (isProcessing) return;
    isProcessing = true;
    try {
      // 执行你的业务功能
    } finally {
      isProcessing = false;
    }
  }
}
```

### 3.2 界面语言本地化 (i18n)
弹窗、报错信息、占位符等 UI 相关文本**必须禁止硬编码 (Hardcode)** 写在 Handler 中。
- 所有的提示词全部提炼到 `src/i18n/tray-menu.ts` 中的 `TrayMenuMessageKey`。
- 如果需要做动态替换，在字符串中使用 `{variable}` 的形式占位（例如 `当前已是最新版本 ({currentVersion})`），并通过 `.replace('{variable}', value)` 填充。

### 3.3 按需获取目标窗口
不要为了调用弹窗而在函数外部缓存 `BrowserWindow`。`src/handlers/utils.ts` 提供了一个非常可靠的获取主窗口句柄的方法 `getAvailableBrowserWindow(windowManager, getMainBrowserWindow)`，在各种环境下能安全地给 dialog 定位焦点。

## 4. 总结
新的基于 `Handlers` 的纯函数式组件化结构让代码心智模型变得极其简单：`触发点击 -> 进入 Handler -> 完成交互 -> 关闭闭包`。这降低了主进程心智负担，提高了代码的一致性。开发新功能时请按这个思路依葫芦画瓢。

---

## 5. 主进程入口重构规范 (main.ts)
在对右键菜单和托盘完成基于 `Handlers` 的重构之后，为了进一步收拢 `src/main.ts` 的职责，我们对应用的主入口文件进行了大规模精简，确定了 **主进程仅作为“管线装配车间”** 的架构原则。后续如果要修改全局配置或生命周期，应该在此规范下进行。

### 5.1 配置分离 (`app-config.ts`)
我们不应该在 `main.ts` 中堆砌长串的 `app.commandLine.appendSwitch` 或是基础常量。
现在所有应用级别的、需要在 `app.ready` 之前设定好的前置配置（包括全局代理注入、证书忽略配置、性能标记位以及 Dock Hover 标题等）统一在 `src/app-config.ts` 中的 `setupAppConfig` 暴露，在 `main.ts` 第一时间执行。

### 5.2 窗口构建屏蔽细节 (`window-manager.ts`)
此前 `new BrowserWindow` 初始化有着巨量的参数和根据各平台做出的冗长条件分支（如图标路径映射、macOS Dock 控制、预加载脚本等）。
- 这些逻辑被彻底封转在 `src/window-manager.ts` 的 `createMainWindow()` 方法内部。
- 业务代码不需要关心 `indexUrl` 甚至是 `preload.js` 的绝对路径应该怎么拼装，只需调用无参方法 `windowManager.createMainWindow()` 一次性获取构建好的主窗口引用。
- **特有属性内聚**：如“上次访问 URL 的历史记录拦截 (`initializeLastVisitedUrlTracking`)”本身即为特定依附于 Window 对象的业务，不应该由主进程来主动为其附加，因此也被直接内联在了该方法深处。

### 5.3 应用生命周期解耦 (`app-events.ts`)
最拖累入口文件阅读体验的是大量无序的全局生命周期闭包函数。我们建立了独立的 `src/app-events.ts` 来掌管应用“骨架”层面的事件。
这类被提取出来的核心级事件包括：
- `activate`、`window-all-closed`、`certificate-error` 
- 退出的全局状态拦截 (`will-quit`, `before-quit`)
- **主窗口的显隐副作用**：如窗口 `after-show` 之后向渲染层推送 `model-changed` 同步数据的逻辑。

### 5.4 收敛所有的“系统交互”入列
原先游离于体系外的零星逻辑，应当归入对应的管理器中。
例如：触发隐藏开发者工具的组合键 `CommandOrControl+Shift+I` 应当属于“快捷键管辖范围”，所以被并入并改造为 `shortcutManager.registerDevToolsShortcut()`。

### 5.5 新的 main.ts 心智模型
经过清理，`main.ts` 已经从几百行下降到包含声明在内不足 50 行的代码骨架，成为了一个高度抽象的“装配”脚本。不要往里面再塞入任何常量枚举或未处理的逻辑。现在的流程是**严格且唯一**的：
1. `setupAppConfig()` 读取并应用底层设定。
2. 等待 Electron `ready`。
3. `createWindowManager()` -> `createMainWindow()` 构建基本盘。
4. 依次挂载菜单/托盘 (`setupAppMenu`, `setupAppTray`)。
5. 依次挂载所有外围能力交互 (`ShortcutManager`, `WebContentsHandlers`, `setupAppEvents`)。

### 5.6 🚨 未来可继续重构空间 (Next Steps for main.ts)
当前 `main.ts` 已经非常干净，但如果想追求极致的依赖反转，还有以下两个空间可以继续深挖：

#### A. 彻底解脱对特定管理器的反向依赖
仔细观察当前的挂载流程：
```typescript
  const shortcutManager = createShortcutManager({ windowManager })
  
  appTray = setupAppTray({
    windowManager,
    getCurrentShortcut: () => shortcutManager.getCurrentShortcut(),
    setCurrentShortcut: (shortcut) => shortcutManager.setCurrentShortcut(shortcut)
  })
```
为了让 `AppTray` 能够展示快捷键，我们在初始化时需要将 `shortcutManager` 的实例方法硬塞给 `setupAppTray`。这造成了“生命周期创建顺序被耦合”（必须先创建 Shortcut，再创建 Tray）。
未来的优化方案：引入极其轻量级的**发布-订阅模型 (Event Bus)** 或一个共享的运行时“应用管家” (App Context)。当发生依赖横跳时，不再硬编码互相传递，而是通过 `AppContext.getShortcut()` 获取。

#### B. Setup 方法的自动化挂载
目前的最后几步：
```typescript
  shortcutManager.registerToggleShortcut()
  shortcutManager.registerIpcHandlers()
  shortcutManager.registerDevToolsShortcut()
  registerWebContentsHandlers(windowManager)
  setupAppEvents(windowManager)
```
如果未来有更多的“能力插件”加入，`main.ts` 又会重新开始变成平铺函数的陈列室。
可以考虑抽象出一个 `Plugin/Feature` 的接口，统一将这些能力在内部各自做好 `register()` 闭包，主文件只需要 `[ShortcutManager, WebContentsManager, EventManager].forEach(module => module.bootstrap(windowManager))` 即可。
