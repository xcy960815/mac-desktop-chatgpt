# Desktop ChatGPT

> 一款基于 Electron + Vite + TypeScript 开发的跨平台桌面级 AI 助手应用，以单一托盘窗口集中承载多家模型的网页端，免去在不同 AI 对话框之间频繁来回切换。

桌面菜单栏是整个体验的核心：应用常驻系统托盘，快捷键唤起即可在同一视图内切换 ChatGPT、DeepSeek、Grok 与 Gemini，保持上下文与 URL 连续，适合需要在多模型间快速对比和验证的工作流。

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Electron](https://img.shields.io/badge/Electron-36.2.0-47848F?logo=electron)](https://www.electronjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.2-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2.3-646CFF?logo=vite)](https://vitejs.dev/)

## ✨ 功能特性

- 🚀 **菜单栏快捷访问** - 驻留系统托盘，一键唤起多种 AI 助手
- 🔄 **多模型支持** - 支持 ChatGPT、DeepSeek、Grok 和 Gemini 四种模型
- 🔄 **模型快速切换** - 支持多种 AI 模型无缝切换
- 💾 **智能 URL 记忆** - 自动保存每个模型的最后访问页面
- 🔗 **会话持久化** - 重启应用自动恢复到上次访问的对话
- 🎯 **导航事件监听** - 支持单页应用路由变化追踪
- ⌨️ **全局快捷键** - Cmd/Ctrl+G 显示/隐藏，Esc 快速关闭
- 🌐 **跨平台支持** - 支持 macOS (Intel/Apple Silicon) 和 Windows (32/64位)

## 📸 预览

<!-- 这里可以添加应用截图 -->

## 🛠️ 技术栈

- [Electron](https://www.electronjs.org/) - 跨平台桌面应用框架
- [Vite](https://vitejs.dev/) - 新一代前端构建工具
- [TypeScript](https://www.typescriptlang.org/) - 类型安全的 JavaScript 超集
- [Electron Forge](https://www.electronforge.io/) - 应用打包和分发工具

## 📦 安装

### macOS

1. 下载对应架构的 ZIP 文件：
   - Apple Silicon (M1/M2/M3)：`desktop-chatgpt-darwin-arm64-1.0.3.zip`
   - Intel 芯片：`desktop-chatgpt-darwin-x64-1.0.3.zip`
2. 解压并将 `Desktop ChatGPT.app` 拖入「应用程序」文件夹
3. 首次打开可能需要右键点击 → 打开（绕过安全检查）

### Windows

1. 下载对应架构的 ZIP 文件：
   - 64位系统：`desktop-chatgpt-win32-x64-1.0.3.zip`
   - 32位系统：`desktop-chatgpt-win32-ia32-1.0.3.zip`
2. 解压到任意目录
3. 运行 `Desktop ChatGPT.exe`
4. 首次运行可能需要允许通过 Windows Defender 防火墙

## 🚀 快速开始

### 环境要求

- Node.js >= 20.19.0
- pnpm >= 9.15.0

### 安装依赖

```bash
pnpm install
```

### 开发模式

```bash
pnpm start
```

启动开发服务器，支持热重载。

### 构建和测试

```bash
# 构建项目（不打包）
npm run build

# 构建并运行生产版本（用于测试构建产物）
npm run start:prod
```

### 代码检查

```bash
pnpm run lint
```

## 📦 构建

### 构建命令说明

| 命令 | 说明 | 用途 |
|------|------|------|
| `npm start` | 启动开发模式 | 开发时使用，支持热重载 |
| `npm run build` | 构建项目 | 仅构建代码，不打包，产物在 `.vite/build` 目录 |
| `npm run start:prod` | 构建并运行生产版本 | 构建后直接运行，用于测试生产环境 |
| `npm run package` | 打包应用 | 打包成可执行文件，不生成安装程序 |
| `npm run make` | 构建 macOS 版本（默认） | 生成 macOS (arm64 + x64) ZIP 文件 |
| `npm run make:mac` | 构建 macOS 版本 | 生成 macOS (arm64 + x64) ZIP 文件 |
| `npm run make:win` | 构建 Windows 版本 | 生成 Windows (x64) ZIP 文件 |
| `npm run make:win-installer` | 构建 Windows 安装程序* | 生成 Windows Squirrel 安装程序 |
| `npm run make:all` | 构建所有平台 | 同时构建 macOS 和 Windows 版本 |
| `npm run lint` | 代码检查 | 运行 ESLint 检查代码规范 |

> *注意：Windows 安装程序（.exe）需要在 Windows 环境中构建，或在 macOS 上安装 Wine 和 Mono

### 构建示例

#### 构建 macOS 版本

```bash
pnpm run make:mac
```

**输出文件：**
```
out/make/zip/darwin/
├── arm64/
│   └── desktop-chatgpt-darwin-arm64-1.0.3.zip
└── x64/
    └── desktop-chatgpt-darwin-x64-1.0.3.zip
```

#### 构建 Windows 版本

```bash
pnpm run make:win
```

**输出文件：**
```
out/make/zip/win32/
├── x64/
│   └── desktop-chatgpt-win32-x64-1.0.3.zip
└── ia32/
    └── desktop-chatgpt-win32-ia32-1.0.3.zip
```

#### 构建所有平台

```bash
pnpm run make:all
```

## 🎮 使用指南

### 快捷键

- `Cmd/Ctrl + G` - 显示/隐藏应用窗口
- `Esc` - 关闭应用窗口
- `Cmd/Ctrl + R` - 重新加载当前页面
- `Cmd/Ctrl + Q` - 退出应用
- `Cmd/Ctrl + O` - 在浏览器中打开当前模型

### 切换模型

1. 右键点击菜单栏图标
2. 选择 `model` → `ChatGPT`、`DeepSeek`、`Grok` 或 `Gemini`

### 数据存储

应用会自动保存以下数据到本地：
- 当前选择的模型
- 每个模型的最后访问 URL

**配置文件位置：**
- macOS: `~/Library/Application Support/desktop-chatgpt/config/settings.json`
- Windows: `%APPDATA%/desktop-chatgpt/config/settings.json`

## 🔧 开发指南

### 项目结构

```
desktop-chatgpt/
├── src/
│   ├── main.ts              # Electron 主进程
│   ├── preload.ts           # 预加载脚本（IPC 通信桥梁）
│   ├── renderer.ts          # 渲染进程
│   ├── electron-menubar.ts  # 菜单栏窗口管理
│   ├── tray-context-menu.ts # 系统托盘上下文菜单
│   ├── window-manager.ts    # 主窗口状态与行为
│   ├── shortcut-manager.ts  # 全局快捷键注册
│   ├── shortcut-input-dialog.ts # 快捷键输入对话框
│   ├── webview-handlers.ts  # WebView 事件与通信
│   ├── url-tracker.ts       # 模型 URL 追踪
│   ├── constants.ts         # 常量定义（模型和 URL 枚举）
│   └── utils/
│       ├── common.ts        # 通用工具函数
│       └── user-setting.ts  # 用户设置管理
├── images/                  # 图标资源
├── index.html               # 主 HTML 文件
├── index.css               # 主样式文件
├── forge.config.ts         # Electron Forge 配置
└── package.json            # 项目配置
```

### 主要功能实现

#### URL 记忆功能

应用通过监听 WebView 的导航事件实现 URL 记忆：

```typescript
// 监听完整页面导航
webContents.on('did-navigate', (_event, url) => {
  saveWebViewUrl(url, 'did-navigate')
})

// 监听单页应用内部路由变化
webContents.on('did-navigate-in-page', (_event, url) => {
  saveWebViewUrl(url, 'did-navigate-in-page')
})
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

### 提交规范

本项目使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 重构
- `test`: 测试相关
- `chore`: 构建/工具链相关

## 📝 更新日志

### v1.0.4

- ✨ 新增：支持 Grok 模型
- ✨ 新增：支持 Gemini 模型
- ♻️ 重构：使用 Model 和 ModelUrl 枚举统一管理模型和 URL
- 📦 优化：改进代码结构和类型安全

### v1.0.3

- ♻️ 重构：项目完整重命名，移除 mac 前缀，改为 desktop-chatgpt
- 📦 优化：更新所有配置文件和文档中的项目名称

### v1.0.2

- ✨ 新增：智能 URL 记忆功能
- ✨ 新增：支持页面内导航监听（SPA 路由变化）
- ✨ 新增：Windows 平台支持
- 🐛 修复：Electron Forge 配置问题
- 💄 优化：加载动画样式
- 🔧 优化：简化 URL 跟踪机制

## 📄 许可证

[MIT](LICENSE) © [xcy960815](https://github.com/xcy960815)

## 👨‍💻 作者

- **xcy960815**
- Email: 18763006837@163.com

## 🙏 鸣谢

- [Electron](https://www.electronjs.org/)
- [Vite](https://vitejs.dev/)
- [OpenAI ChatGPT](https://chat.openai.com/)
- [DeepSeek](https://chat.deepseek.com/)
- [Grok](https://grok.com/)
- [Google Gemini](https://gemini.google.com/)

---

<p align="center">
  如果觉得这个项目对你有帮助，请给个 ⭐️ Star 吧！
</p>
