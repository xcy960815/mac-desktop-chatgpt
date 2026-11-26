# 架构与数据流

## 按职责定位

| 改动 | 起点 |
| --- | --- |
| 启动、窗口、托盘生命周期 | `src/main.ts` 在 Electron 就绪后调用 `src/core/bootstrap.ts`。窗口显示与隐藏还涉及 `src/window-manager.ts`。 |
| 托盘菜单与设置动作 | `src/tray-context-menu.ts` 组装菜单，`src/i18n/tray-menu.ts` 提供文案，`src/services/tray-action-service.ts` 执行操作。托盘和应用图标位于 `images/`。 |
| 桌面界面与服务商网页 | 根目录的 `index.html`、`index.css` 和 `src/renderer.ts` 构成桌面界面。`src/preload.ts` 向界面提供 Electron 桥接 API，`src/webview-preload.ts` 在服务商网页环境中运行。 |
| 快捷键与代理 | 从 `src/handlers/` 找到编辑流程。全局快捷键注册位于 `src/shortcut-manager.ts`，输入框模板位于 `src/dialogs/`。 |

## 跟踪一次模型切换

托盘动作先保存当前模型，再通过 `model-changed` 将模型和目标 URL 传给桌面界面。`src/renderer.ts` 负责加载网页。排查“切换后打开了错误会话”时，先核对设置服务返回的 URL，再看渲染进程实际加载的地址。

`src/services/settings-service.ts` 恢复地址时，依次检查该模型保存的 URL、旧版 `lastVisitedUrl` 和 `ModelUrl` 中的默认值。调整服务商域名时，要考虑已保存的旧域名。`src/utils/user-setting.ts` 定义首次启动的默认值，并将设置写入 Electron 的 `userData/config/settings.json`。
