## 1.1.0 (2025-11-24)

* feat: 多语言 锁定窗口 ([9d07b56](https://github.com/xcy960815/mac-desktop-chatgpt/commit/9d07b56))
* fix(menubar): hide on desktop click with auto hide ([1860f16](https://github.com/xcy960815/mac-desktop-chatgpt/commit/1860f16))
* chore: add conventional changelog support ([1f3ef2f](https://github.com/xcy960815/mac-desktop-chatgpt/commit/1f3ef2f))



## <small>1.1.1 (2025-11-24)</small>

* chore: add husky pre-push proxy hook ([e47c969](https://github.com/xcy960815/mac-desktop-chatgpt/commit/e47c969))
* chore: flatten zip outputs ([aa4e8aa](https://github.com/xcy960815/mac-desktop-chatgpt/commit/aa4e8aa))
* chore: tidy mac make scripts ([43732a6](https://github.com/xcy960815/mac-desktop-chatgpt/commit/43732a6))
* chore(build): rename win32 outputs to windows ([e67b5f1](https://github.com/xcy960815/mac-desktop-chatgpt/commit/e67b5f1))
* feat: 更新菜单和快捷键 ([348fdc9](https://github.com/xcy960815/mac-desktop-chatgpt/commit/348fdc9))
* docs: 更新 README 添加所有 scripts 命令说明 ([a309b35](https://github.com/xcy960815/mac-desktop-chatgpt/commit/a309b35))
* docs: 添加中文 jsdoc ([be7e1c1](https://github.com/xcy960815/mac-desktop-chatgpt/commit/be7e1c1))
* fix: normalize win artifacts and update tray hotkeys ([eacebcf](https://github.com/xcy960815/mac-desktop-chatgpt/commit/eacebcf))



## 1.1.0 (2025-11-21)

* feat: 设置快捷键弹框样式调整 ([604932b](https://github.com/xcy960815/mac-desktop-chatgpt/commit/604932b))
* feat: 添加 Windows x64 支持 ([76a984c](https://github.com/xcy960815/mac-desktop-chatgpt/commit/76a984c))
* feat: 添加多项功能优化 ([d2bda6d](https://github.com/xcy960815/mac-desktop-chatgpt/commit/d2bda6d))
* feat: 添加重置 URL 功能 ([9843482](https://github.com/xcy960815/mac-desktop-chatgpt/commit/9843482))
* feat: 添加Gemini模型支持并改用Model枚举 ([1f34653](https://github.com/xcy960815/mac-desktop-chatgpt/commit/1f34653))
* feat: 添加grok 模型 ([1d49968](https://github.com/xcy960815/mac-desktop-chatgpt/commit/1d49968))
* feat: 问题修复 ([1c988c9](https://github.com/xcy960815/mac-desktop-chatgpt/commit/1c988c9))
* feat: improve shortcut dialog UI ([ccf7ca3](https://github.com/xcy960815/mac-desktop-chatgpt/commit/ccf7ca3))
* feat: modularize webview handling and url tracking ([f8c4edc](https://github.com/xcy960815/mac-desktop-chatgpt/commit/f8c4edc))
* feat: optimize windows menubar experience ([061aa0b](https://github.com/xcy960815/mac-desktop-chatgpt/commit/061aa0b))
* feat: overhaul shortcut dialog and manager ([2aeee1c](https://github.com/xcy960815/mac-desktop-chatgpt/commit/2aeee1c))
* refactor: 将URL地址改为使用ModelUrl枚举 ([922b397](https://github.com/xcy960815/mac-desktop-chatgpt/commit/922b397))
* refactor: 移除 electron-menubar 中 index 的默认值设置 ([3f98868](https://github.com/xcy960815/mac-desktop-chatgpt/commit/3f98868))
* refactor: 优化代码并清理调试日志 ([56f803a](https://github.com/xcy960815/mac-desktop-chatgpt/commit/56f803a))
* refactor: extract window manager and common helpers ([ff2ca85](https://github.com/xcy960815/mac-desktop-chatgpt/commit/ff2ca85))
* build: tidy forge/vite config ([1a73d03](https://github.com/xcy960815/mac-desktop-chatgpt/commit/1a73d03))
* docs: add jsdoc comments to menubar ([d7fe5b4](https://github.com/xcy960815/mac-desktop-chatgpt/commit/d7fe5b4))
* docs: update readme for multi-model support ([f30d1d3](https://github.com/xcy960815/mac-desktop-chatgpt/commit/f30d1d3))
* 优化快捷键设置对话框：支持直接监听键盘组合输入 ([b82cd5c](https://github.com/xcy960815/mac-desktop-chatgpt/commit/b82cd5c))
* refactor tray context menu ([96e6689](https://github.com/xcy960815/mac-desktop-chatgpt/commit/96e6689))
* fix: 修复快捷键输入对话框返回null的问题 ([1d60ebd](https://github.com/xcy960815/mac-desktop-chatgpt/commit/1d60ebd))
* fix: 修复生产环境下 MAIN_WINDOW_VITE_DEV_SERVER_URL 为 undefined 的问题 ([83fd480](https://github.com/xcy960815/mac-desktop-chatgpt/commit/83fd480))
* fix: 修复index.html资源找不到的问题 ([d45c039](https://github.com/xcy960815/mac-desktop-chatgpt/commit/d45c039))
* fix: guard menubar resize watchers ([5c01529](https://github.com/xcy960815/mac-desktop-chatgpt/commit/5c01529))
* fix: resolve shortcut dialog preload path ([6691cc3](https://github.com/xcy960815/mac-desktop-chatgpt/commit/6691cc3))
* chore: silence unused event param ([88deabb](https://github.com/xcy960815/mac-desktop-chatgpt/commit/88deabb))



## <small>1.0.3 (2025-11-16)</small>

* chore: 发布版本 v1.0.3 ([8e8f34c](https://github.com/xcy960815/mac-desktop-chatgpt/commit/8e8f34c))
* chore: 更新配置文件中的项目名称 ([847d0e6](https://github.com/xcy960815/mac-desktop-chatgpt/commit/847d0e6))
* refactor: 简化URL跟踪机制，使用did-navigate事件保存最后访问的URL ([362cd8d](https://github.com/xcy960815/mac-desktop-chatgpt/commit/362cd8d))
* refactor: 重命名 DMG 配置文件 ([01ea8a9](https://github.com/xcy960815/mac-desktop-chatgpt/commit/01ea8a9))
* feat: 添加跨平台支持和智能 URL 记忆功能 ([df04848](https://github.com/xcy960815/mac-desktop-chatgpt/commit/df04848))
* fix: 修复 Electron Forge 配置问题并添加 URL 记忆功能 ([d562b49](https://github.com/xcy960815/mac-desktop-chatgpt/commit/d562b49))



## <small>1.0.2 (2025-05-12)</small>

* style: 将加载模型的样式变更回去 ([a0d5856](https://github.com/xcy960815/mac-desktop-chatgpt/commit/a0d5856))
* style: 样式优化 ([9b39dd0](https://github.com/xcy960815/mac-desktop-chatgpt/commit/9b39dd0))
* style: 优化加载模型动画 ([e283701](https://github.com/xcy960815/mac-desktop-chatgpt/commit/e283701))
* Revert "fix: 修复ssl握手问题" ([ac604b4](https://github.com/xcy960815/mac-desktop-chatgpt/commit/ac604b4))
* test commit ([85ac93b](https://github.com/xcy960815/mac-desktop-chatgpt/commit/85ac93b))
* test commit ([aff3c9c](https://github.com/xcy960815/mac-desktop-chatgpt/commit/aff3c9c))
* feat: 去除无用代码 ([4fccdf3](https://github.com/xcy960815/mac-desktop-chatgpt/commit/4fccdf3))
* feat: 添加代码格式化 ([bf0edd1](https://github.com/xcy960815/mac-desktop-chatgpt/commit/bf0edd1))
* feat: 样式调整 ([460a315](https://github.com/xcy960815/mac-desktop-chatgpt/commit/460a315))
* feat: 样式还原 ([c611484](https://github.com/xcy960815/mac-desktop-chatgpt/commit/c611484))
* feat: dmg打包配置 ([80c9db7](https://github.com/xcy960815/mac-desktop-chatgpt/commit/80c9db7))
* fix: 修复打不开的问题 ([3998274](https://github.com/xcy960815/mac-desktop-chatgpt/commit/3998274))
* fix: 修复开发环境箱进程通讯问题 ([31f65bb](https://github.com/xcy960815/mac-desktop-chatgpt/commit/31f65bb))
* fix: 修复ssl握手问题 ([52a4c18](https://github.com/xcy960815/mac-desktop-chatgpt/commit/52a4c18))
* test: 测试 commit 信息约束 ([19f9efe](https://github.com/xcy960815/mac-desktop-chatgpt/commit/19f9efe))
* test: 测试 commit 信息约束 ([1483ef9](https://github.com/xcy960815/mac-desktop-chatgpt/commit/1483ef9))



## <small>1.0.1 (2025-03-30)</small>

* feat: 代码优化 ([5815abc](https://github.com/xcy960815/mac-desktop-chatgpt/commit/5815abc))
* feat: 暂存代码 ([f95d49a](https://github.com/xcy960815/mac-desktop-chatgpt/commit/f95d49a))
* feat: 支持多模型 ([986c6bd](https://github.com/xcy960815/mac-desktop-chatgpt/commit/986c6bd))
* feat: 支持多模型 ([c7c7362](https://github.com/xcy960815/mac-desktop-chatgpt/commit/c7c7362))
* feat: 支持多模型 ([5e52c50](https://github.com/xcy960815/mac-desktop-chatgpt/commit/5e52c50))
* feat: 支持监听图标在状态栏的位置变化,加载webview的时候添加loading 动画 ([15da6fc](https://github.com/xcy960815/mac-desktop-chatgpt/commit/15da6fc))
* feat: 支持deepseek ([0c82b78](https://github.com/xcy960815/mac-desktop-chatgpt/commit/0c82b78))



## 1.0.0 (2024-10-11)

* feat:优化代码 ([4c72c7b](https://github.com/xcy960815/mac-desktop-chatgpt/commit/4c72c7b))
* fix:打包的状态栏背景色根据壁纸切换 ([08c546a](https://github.com/xcy960815/mac-desktop-chatgpt/commit/08c546a))
* feat: 🍗 ([8e92f2c](https://github.com/xcy960815/mac-desktop-chatgpt/commit/8e92f2c))
* feat: 窗口失去焦点的时候 关闭窗口 ([7c7bb8e](https://github.com/xcy960815/mac-desktop-chatgpt/commit/7c7bb8e))
* feat: 代码优化 ([cbc2f58](https://github.com/xcy960815/mac-desktop-chatgpt/commit/cbc2f58))
* feat: 修复了esc全局占用造成别的软件无法使用的问题 ([ab4f63e](https://github.com/xcy960815/mac-desktop-chatgpt/commit/ab4f63e))
* feat: 修复bug ([dffa748](https://github.com/xcy960815/mac-desktop-chatgpt/commit/dffa748))
* feat: 暂存提交 ([eed1b6b](https://github.com/xcy960815/mac-desktop-chatgpt/commit/eed1b6b))
* feat: 暂存提交 ([8559f7d](https://github.com/xcy960815/mac-desktop-chatgpt/commit/8559f7d))
* feat: 整合代码 ([f0912d6](https://github.com/xcy960815/mac-desktop-chatgpt/commit/f0912d6))
* feat: 整理全局ts声明,不用import 引用 ([5faa5a7](https://github.com/xcy960815/mac-desktop-chatgpt/commit/5faa5a7))
* feat: 支持在webview中使用默认浏览器打开链接 ([45a4f3d](https://github.com/xcy960815/mac-desktop-chatgpt/commit/45a4f3d))



