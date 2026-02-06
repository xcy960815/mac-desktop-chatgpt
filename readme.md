# ChatHub Desktop

> 一款基于 Electron + Vite + TypeScript 开发的跨平台桌面级 AI 助手应用，以单一托盘窗口集中承载多家模型的网页端，免去在不同 AI 对话框之间频繁来回切换。

桌面菜单栏是整个体验的核心：应用常驻系统托盘，快捷键唤起即可在同一视图内切换 ChatGPT、DeepSeek、Grok、Gemini、Qwen 与 Doubao，保持上下文与 URL 连续，适合需要在多模型间快速对比和验证的工作流。

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Electron](https://img.shields.io/badge/Electron-36.2.0-47848F?logo=electron)](https://www.electronjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.2-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2.3-646CFF?logo=vite)](https://vitejs.dev/)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows-lightgrey)](https://github.com/xcy960815/mac-desktop-chatgpt/releases)
[![GitHub release](https://img.shields.io/github/v/release/xcy960815/mac-desktop-chatgpt)](https://github.com/xcy960815/mac-desktop-chatgpt/releases)
[![GitHub stars](https://img.shields.io/github/stars/xcy960815/mac-desktop-chatgpt?style=social)](https://github.com/xcy960815/mac-desktop-chatgpt)

## 📖 目录

- [✨ 功能特性](#-功能特性)
- [📸 预览](#-预览)
- [🛠️ 技术栈](#️-技术栈)
- [📦 安装](#-安装)
- [🚀 快速开始](#-快速开始)
- [📦 构建](#-构建)
- [🎮 使用指南](#-使用指南)
- [🔧 开发指南](#-开发指南)
- [❓ 常见问题](#-常见问题)
- [🔧 故障排除](#-故障排除)
- [🗺️ 路线图](#️-路线图)
- [🛡️ 安全与隐私](#️-安全与隐私)
- [🤝 贡献](#-贡献)
- [📝 更新日志](#-更新日志)
- [📄 许可证](#-许可证)
- [👨‍💻 作者](#-作者)
- [🙏 鸣谢](#-鸣谢)

## ✨ 功能特性

- 🚀 **菜单栏快捷访问** - 驻留系统托盘，一键唤起多种 AI 助手
- 🔄 **多模型支持** - 支持 ChatGPT、DeepSeek、Grok、Gemini、Qwen 和 Doubao 六种模型
- 🔄 **模型快速切换** - 支持多种 AI 模型无缝切换
- 💾 **智能 URL 记忆** - 自动保存每个模型的最后访问页面
- 🔗 **会话持久化** - 重启应用自动恢复到上次访问的对话
- 🎯 **导航事件监听** - 支持单页应用路由变化追踪
- ⌨️ **全局快捷键** - Cmd/Ctrl+G 显示/隐藏，Esc 快速关闭
- 🌐 **跨平台支持** - 支持 macOS (Intel/Apple Silicon) 和 Windows (32/64位)
- 🧲 **窗口锁定模式** - 支持自动隐藏、锁定在桌面、置顶于所有应用三种模式
- 🔁 **一键开机自启** - 托盘菜单直接切换自动启动
- 🛡️ **自定义代理设置** - 支持 HTTP/HTTPS 代理配置，解决网络连接问题

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
   - Apple Silicon (M1/M2/M3)：`chathub-desktop-darwin-arm64-1.0.7.zip`
   - Intel 芯片：`chathub-desktop-darwin-x64-1.0.7.zip`
2. 解压并将 `ChatHub Desktop.app` 拖入「应用程序」文件夹
3. 首次打开可能需要右键点击 → 打开（绕过安全检查）

### Windows

1. 下载对应架构的 ZIP 文件：
   - 64位系统：`chathub-desktop-windows-x64-1.0.7.zip`
   - 32位系统：`chathub-desktop-windows-ia32-1.0.7.zip`
2. 解压到任意目录
3. 运行 `ChatHub Desktop.exe`
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
out/make/zip/
├── chathub-desktop-darwin-arm64-1.0.7.zip
└── chathub-desktop-darwin-x64-1.0.7.zip
```

#### 构建 Windows 版本

```bash
pnpm run make:win
```

**输出文件：**
```
out/make/zip/
├── chathub-desktop-windows-x64-1.0.7.zip
└── chathub-desktop-windows-ia32-1.0.7.zip
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

### 托盘菜单 & 切换模型

托盘菜单包含常用的窗口与启动项控制：

- `Auto-launch on startup`：勾选后随系统启动（macOS 通过 Login Item 设置）
- `窗口行为`：
  - `自动隐藏`：失焦 100ms 自动收起（默认行为）
  - `锁定在桌面`：窗口失焦依然保持可见，可被其他应用遮挡
  - `置顶于所有应用`：窗口始终置顶，适合持续对照参考
- `Set shortcut`：打开快捷键输入对话框，自定义全局快捷键
- `Set Proxy`：配置 HTTP/HTTPS 代理，解决网络连接问题

切换模型步骤：

1. 右键点击菜单栏图标
2. 选择 `model` → `ChatGPT`、`DeepSeek`、`Grok`、`Gemini`、`Qwen` 或 `Doubao`

### 数据存储

应用会自动保存以下数据到本地：
- 当前选择的模型
- 每个模型的最后访问 URL
- 代理设置
- 窗口行为偏好

**配置文件位置：**
- macOS: `~/Library/Application Support/chathub-desktop/config/settings.json`
- Windows: `%APPDATA%/chathub-desktop/config/settings.json`

## 🔧 开发指南

### 项目结构

```
chathub-desktop/
├── src/
│   ├── main.ts              # Electron 主进程
│   ├── preload.ts           # 预加载脚本（IPC 通信桥梁）
│   ├── webview-preload.ts   # WebView 预加载脚本
│   ├── renderer.ts          # 渲染进程
│   ├── tray-context-menu.ts # 系统托盘上下文菜单
│   ├── window-manager.ts    # 主窗口状态与行为
│   ├── shortcut-manager.ts  # 全局快捷键注册
│   ├── shortcut-input-dialog.ts # 快捷键输入对话框
│   ├── proxy-input-dialog.ts    # 代理设置对话框
│   ├── webview-handlers.ts  # WebView 事件与通信
│   ├── url-tracker.ts       # 模型 URL 追踪
│   ├── constants.ts         # 常量定义（模型和 URL 枚举）
│   ├── i18n/
│   │   └── tray-menu.ts     # 托盘菜单国际化
│   └── utils/
│       ├── common.ts        # 通用工具函数
│       ├── user-setting.ts  # 用户设置管理
│       └── update-manager.ts # 更新检查管理
├── images/                  # 图标资源
├── index.html               # 主 HTML 文件
├── index.css               # 主样式文件
├── forge.config.ts         # Electron Forge 配置
├── vite.base.config.ts     # Vite 基础配置
├── vite.main.config.ts     # Vite 主进程配置
├── vite.preload.config.ts  # Vite 预加载配置
├── vite.renderer.config.ts # Vite 渲染进程配置
└── package.json            # 项目配置
```

## ❓ 常见问题

<details>
<summary><b>Q: 如何登录 Google/ChatGPT 账号？</b></summary>

应用内置了浏览器环境模拟，大部分情况下可以正常登录。如遇到"此浏览器或应用可能不安全"提示，可以尝试：
1. 先在系统浏览器登录账号
2. 返回应用重新加载页面
3. 使用手机验证码方式登录
</details>

<details>
<summary><b>Q: 如何更改默认的快捷键？</b></summary>

右键点击托盘图标 → 选择「设置快捷键」→ 在弹出的对话框中按下新的快捷键组合 → 点击确定保存。
</details>

<details>
<summary><b>Q: 应用会收集我的数据吗？</b></summary>

不会。所有数据（包括登录状态、对话历史）都存储在本地，应用不会向任何第三方服务器发送数据。详见 [安全与隐私](#️-安全与隐私) 章节。
</details>

<details>
<summary><b>Q: 如何设置代理？</b></summary>

右键点击托盘图标 → 选择「设置代理」→ 输入代理地址（如 `http://127.0.0.1:7890`）→ 点击确定。支持 HTTP/HTTPS 代理。
</details>

<details>
<summary><b>Q: 支持哪些 AI 模型？</b></summary>

目前支持：ChatGPT、DeepSeek、Grok、Gemini（Google）、Qwen（通义千问）、Doubao（豆包）。如需添加新模型，欢迎提交 Issue 或 PR。
</details>

## 🔧 故障排除

| 问题 | 可能原因 | 解决方案 |
|------|----------|----------|
| 应用无法启动 | 系统权限问题 | macOS: 右键点击应用 → 打开；Windows: 以管理员身份运行 |
| 页面加载失败 | 网络连接问题 | 检查网络连接，或配置代理设置 |
| 快捷键不生效 | 与其他应用冲突 | 尝试更换快捷键组合 |
| 登录被拦截 | 浏览器安全检测 | 先在系统浏览器登录，再返回应用 |
| 窗口位置异常 | 多显示器切换 | 删除配置文件后重启应用 |
| 托盘图标不显示 | 系统托盘已满 | 检查系统托盘设置，清理不必要的图标 |

**重置应用配置：**

```bash
# macOS
rm -rf ~/Library/Application\ Support/chathub-desktop/config/

# Windows
rmdir /s %APPDATA%\chathub-desktop\config\
```

## 🗺️ 路线图

- [ ] 🌍 多语言界面支持（英语、日语等）
- [ ] 🔍 全局搜索功能
- [ ] 📋 对话历史本地备份
- [ ] 🎨 自定义主题和外观
- [ ] ⌨️ 更多快捷键支持
- [ ] 🔌 插件系统
- [ ] 📱 移动端适配（响应式）
- [ ] 🤖 更多 AI 模型支持

> 欢迎通过 [Issue](https://github.com/xcy960815/mac-desktop-chatgpt/issues) 提交功能建议！

## 🛡️ 安全与隐私

- **本地存储**: 所有用户数据（设置、登录状态、URL 记录）仅存储在本地，不会上传到任何服务器
- **无数据收集**: 应用不包含任何遥测或数据收集代码
- **开源透明**: 完整源代码公开，可自行审计
- **WebView 隔离**: 每个 AI 模型在独立的 WebView 中运行，相互隔离
- **安全更新**: 定期更新 Electron 和依赖库以修复安全漏洞

> ⚠️ **注意**: 应用通过 WebView 加载第三方 AI 服务网页，您在这些服务中输入的内容将直接发送到对应的服务提供商（如 OpenAI、Google 等），请遵循各服务的使用条款和隐私政策。

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

### 如何维护

遵循 Conventional Commits 约定后，可通过 `conventional-changelog` CLI 自动生成或更新 `CHANGELOG.md`：

```bash
pnpm changelog
# 或使用 npm/yarn:
# npm run changelog
# yarn changelog
```

> 首次运行会在根目录创建 `CHANGELOG.md`，后续执行会根据最新的提交记录追加内容。

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
- [Qwen](https://tongyi.aliyun.com/)
- [Doubao](https://www.doubao.com/)

---

<p align="center">
  如果觉得这个项目对你有帮助，请给个 ⭐️ Star 吧！
</p>
