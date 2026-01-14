## <small>1.0.8 (2026-01-14)</small>

* chore: bump version to 1.0.8 ([fac9d8a](https://github.com/xcy960815/mac-desktop-chatgpt/commit/fac9d8a))
* fix: resolve double paste issue and blank window on startup ([84a4f89](https://github.com/xcy960815/mac-desktop-chatgpt/commit/84a4f89))
* docs: remove manual changelog from readme and update CHANGELOG.md ([5391571](https://github.com/xcy960815/mac-desktop-chatgpt/commit/5391571))
* feat: rename to ChatHub Desktop, add proxy validation and custom icon ([10c3cb7](https://github.com/xcy960815/mac-desktop-chatgpt/commit/10c3cb7))



## <small>1.0.7 (2026-01-13)</small>

* fix: 禁用 QUIC 和 WebAuthn 以优化 Google 登录稳定性，清理测试代码 ([4cb8255](https://github.com/xcy960815/mac-desktop-chatgpt/commit/4cb8255))
* chore: bump version to 1.0.7 ([1d71e71](https://github.com/xcy960815/mac-desktop-chatgpt/commit/1d71e71))
* feat: 优化代理设置与快捷键弹窗体验，修复粘贴与模块导入问题 ([e2b2a1f](https://github.com/xcy960815/mac-desktop-chatgpt/commit/e2b2a1f))



## <small>1.0.6 (2026-01-12)</small>

* 优化应用功能：改进菜单栏、主程序、托盘菜单和通用工具 ([29898e3](https://github.com/xcy960815/mac-desktop-chatgpt/commit/29898e3))
* feat: 优化项目配置与代码结构，增强 Webview 反检测能力 ([91e4f38](https://github.com/xcy960815/mac-desktop-chatgpt/commit/91e4f38))
* chore: bump version to 0.0.2 [skip ci] ([e04c0ff](https://github.com/xcy960815/mac-desktop-chatgpt/commit/e04c0ff))
* chore: bump version to 1.0.2 [skip ci] ([6f9b502](https://github.com/xcy960815/mac-desktop-chatgpt/commit/6f9b502))
* chore: bump version to 1.0.3 [skip ci] ([6f867a9](https://github.com/xcy960815/mac-desktop-chatgpt/commit/6f867a9))
* chore: bump version to 1.0.4 [skip ci] ([ff58d7b](https://github.com/xcy960815/mac-desktop-chatgpt/commit/ff58d7b))
* chore: bump version to 1.0.5 [skip ci] ([35954cc](https://github.com/xcy960815/mac-desktop-chatgpt/commit/35954cc))



## <small>1.0.5 (2026-01-08)</small>

* feat: 优化 Google 登录绕过方案，统一 UA 管理并清理日志 ([7b84da8](https://github.com/xcy960815/mac-desktop-chatgpt/commit/7b84da8))
* refactor(renderer): 移除手动设置 User-Agent 的代码，避免与主进程冲突 ([ae4ad07](https://github.com/xcy960815/mac-desktop-chatgpt/commit/ae4ad07))
* docs: 批量将文档文件名重命名为中文，并添加谷歌登录绕过方案文档 ([4040d8f](https://github.com/xcy960815/mac-desktop-chatgpt/commit/4040d8f))



## <small>1.0.4 (2025-12-21)</small>

* fix: remove duplicate menu item and adjust windows border radius ([1c96d82](https://github.com/xcy960815/mac-desktop-chatgpt/commit/1c96d82))
* chore: bump version to 1.0.4 ([c63ab9d](https://github.com/xcy960815/mac-desktop-chatgpt/commit/c63ab9d))
* chore: update package-lock.json ([f1f09ac](https://github.com/xcy960815/mac-desktop-chatgpt/commit/f1f09ac))



## <small>1.0.3 (2025-12-21)</small>

* chore: add windows icon ([d9bf75d](https://github.com/xcy960815/mac-desktop-chatgpt/commit/d9bf75d))
* chore: bump version to 1.0.3 ([2e7f2ff](https://github.com/xcy960815/mac-desktop-chatgpt/commit/2e7f2ff))
* chore: bump version to 1.0.3 ([9e061fc](https://github.com/xcy960815/mac-desktop-chatgpt/commit/9e061fc))
* fix: adjust windows platform styles and fix icon config ([ca7fc61](https://github.com/xcy960815/mac-desktop-chatgpt/commit/ca7fc61))



## <small>1.0.2 (2025-12-19)</small>

* fix: 修复 electron-builder.config.js 的 ESLint 错误 ([aad652b](https://github.com/xcy960815/mac-desktop-chatgpt/commit/aad652b))
* fix: 修复窗口行为逻辑中的多个bug ([ca348e1](https://github.com/xcy960815/mac-desktop-chatgpt/commit/ca348e1))
* fix: allow npm version to fail if version is already up to date ([dd94c49](https://github.com/xcy960815/mac-desktop-chatgpt/commit/dd94c49))
* fix: allow npm version to fail in sync step as well ([3675171](https://github.com/xcy960815/mac-desktop-chatgpt/commit/3675171))
* fix: bundle debug module with vite instead of externalizing it ([301f6d2](https://github.com/xcy960815/mac-desktop-chatgpt/commit/301f6d2))
* fix: ensure package.json version matches tag during build ([6f26a58](https://github.com/xcy960815/mac-desktop-chatgpt/commit/6f26a58))
* fix: externalize debug module and fix prettier syntax error ([6974e4f](https://github.com/xcy960815/mac-desktop-chatgpt/commit/6974e4f))
* fix: re-apply feed url before downloadUpdate to prevent ENOENT error ([2b543e1](https://github.com/xcy960815/mac-desktop-chatgpt/commit/2b543e1))
* fix: refine ignore pattern to avoid excluding src folders in node_modules ([08b68b5](https://github.com/xcy960815/mac-desktop-chatgpt/commit/08b68b5))
* fix: remove duplicate object keys and unused updater ([fc54d90](https://github.com/xcy960815/mac-desktop-chatgpt/commit/fc54d90))
* fix: strip html tags from release notes in update dialog ([97ec2d8](https://github.com/xcy960815/mac-desktop-chatgpt/commit/97ec2d8))
* fix: unpack debug module from asar to resolve runtime errors ([77c355c](https://github.com/xcy960815/mac-desktop-chatgpt/commit/77c355c))
* fix: update pnpm-lock.yaml to resolve missing dependency error ([40d3fb9](https://github.com/xcy960815/mac-desktop-chatgpt/commit/40d3fb9))
* chore: 移除 Electron Builder 并清理项目文件 ([b71eceb](https://github.com/xcy960815/mac-desktop-chatgpt/commit/b71eceb))
* chore: add debug to production dependencies ([16ace6e](https://github.com/xcy960815/mac-desktop-chatgpt/commit/16ace6e))
* chore: bump version to 1.1.6 [skip ci] ([1148260](https://github.com/xcy960815/mac-desktop-chatgpt/commit/1148260))
* chore: bump version to 1.1.7 [skip ci] ([ce6d04e](https://github.com/xcy960815/mac-desktop-chatgpt/commit/ce6d04e))
* chore: bump version to 1.1.8 [skip ci] ([bef06ce](https://github.com/xcy960815/mac-desktop-chatgpt/commit/bef06ce))
* chore: remove unused dependencies electron-updater and debug ([6f8d8cb](https://github.com/xcy960815/mac-desktop-chatgpt/commit/6f8d8cb))
* chore: sync pnpm lockfile for electron-updater ([42904af](https://github.com/xcy960815/mac-desktop-chatgpt/commit/42904af))
* refactor: replace electron-updater with manual GitHub API check ([20e95d6](https://github.com/xcy960815/mac-desktop-chatgpt/commit/20e95d6))
* refactor: simplify update check logic and remove latest-yml generation ([ef13d24](https://github.com/xcy960815/mac-desktop-chatgpt/commit/ef13d24))
* ci: fix version sync by fetching and rebasing target branch before push ([a9b2ff6](https://github.com/xcy960815/mac-desktop-chatgpt/commit/a9b2ff6))
* ci: format build time and add auto-version sync to package.json ([cf82352](https://github.com/xcy960815/mac-desktop-chatgpt/commit/cf82352))
* feat: 添加托盘检测更新菜单 ([769f80f](https://github.com/xcy960815/mac-desktop-chatgpt/commit/769f80f))
* style: 优化窗口样式并启用开发工具 ([7970a8c](https://github.com/xcy960815/mac-desktop-chatgpt/commit/7970a8c))



## <small>1.0.1 (2025-12-19)</small>

* feat: 添加检查更新功能 ([17f8c09](https://github.com/xcy960815/mac-desktop-chatgpt/commit/17f8c09))
* feat: generate latest-mac.yml in release workflow for auto-update support ([5ee4372](https://github.com/xcy960815/mac-desktop-chatgpt/commit/5ee4372))
* fix: explicitly configure electron-updater feed url to resolve missing app-update.yml error ([63cbaef](https://github.com/xcy960815/mac-desktop-chatgpt/commit/63cbaef))
* fix: packaging issue by ignoring only root src/scripts/dist directories ([9873c82](https://github.com/xcy960815/mac-desktop-chatgpt/commit/9873c82))
* fix: remove src/scripts/dist from ignore list to prevent missing module errors ([af044d0](https://github.com/xcy960815/mac-desktop-chatgpt/commit/af044d0))



## 1.0.0 (2025-12-19)

* ci: 修改构建时间格式为 yyyy-MM-dd HH:mm:ss ([37589ac](https://github.com/xcy960815/mac-desktop-chatgpt/commit/37589ac))
* ci: 优化 release 工作流，确保版本号同步和构建产物匹配 ([5d14d97](https://github.com/xcy960815/mac-desktop-chatgpt/commit/5d14d97))
* ci: add GitHub Actions workflow for automated releases ([567d546](https://github.com/xcy960815/mac-desktop-chatgpt/commit/567d546))
* chore: 发布版本 v1.0.3 ([8e8f34c](https://github.com/xcy960815/mac-desktop-chatgpt/commit/8e8f34c))
* chore: 更新 pnpm-lock.yaml 以匹配 package.json ([f72e9b5](https://github.com/xcy960815/mac-desktop-chatgpt/commit/f72e9b5))
* chore: 更新配置文件中的项目名称 ([847d0e6](https://github.com/xcy960815/mac-desktop-chatgpt/commit/847d0e6))
* chore: 更新依赖包锁定文件 ([4ccca22](https://github.com/xcy960815/mac-desktop-chatgpt/commit/4ccca22))
* chore: 优化本地构建配置和开发服务器设置 ([4c4ba30](https://github.com/xcy960815/mac-desktop-chatgpt/commit/4c4ba30))
* chore: 注释掉自动打开开发者工具的代码 ([ac60d16](https://github.com/xcy960815/mac-desktop-chatgpt/commit/ac60d16))
* chore: add conventional changelog support ([1f3ef2f](https://github.com/xcy960815/mac-desktop-chatgpt/commit/1f3ef2f))
* chore: add docstrings to electron menubar ([a6bf254](https://github.com/xcy960815/mac-desktop-chatgpt/commit/a6bf254))
* chore: add husky pre-push proxy hook ([e47c969](https://github.com/xcy960815/mac-desktop-chatgpt/commit/e47c969))
* chore: flatten zip outputs ([aa4e8aa](https://github.com/xcy960815/mac-desktop-chatgpt/commit/aa4e8aa))
* chore: remove auto-switch-proxy.sh and release.js, use GitHub Actions workflow ([56b8d72](https://github.com/xcy960815/mac-desktop-chatgpt/commit/56b8d72))
* chore: silence unused event param ([88deabb](https://github.com/xcy960815/mac-desktop-chatgpt/commit/88deabb))
* chore: tidy mac make scripts ([43732a6](https://github.com/xcy960815/mac-desktop-chatgpt/commit/43732a6))
* chore(build): rename win32 outputs to windows ([e67b5f1](https://github.com/xcy960815/mac-desktop-chatgpt/commit/e67b5f1))
* feat: 🍗 ([8e92f2c](https://github.com/xcy960815/mac-desktop-chatgpt/commit/8e92f2c))
* feat: 窗口失去焦点的时候 关闭窗口 ([7c7bb8e](https://github.com/xcy960815/mac-desktop-chatgpt/commit/7c7bb8e))
* feat: 代码优化 ([5815abc](https://github.com/xcy960815/mac-desktop-chatgpt/commit/5815abc))
* feat: 代码优化 ([cbc2f58](https://github.com/xcy960815/mac-desktop-chatgpt/commit/cbc2f58))
* feat: 多语言 锁定窗口 ([9d07b56](https://github.com/xcy960815/mac-desktop-chatgpt/commit/9d07b56))
* feat: 更新菜单和快捷键 ([348fdc9](https://github.com/xcy960815/mac-desktop-chatgpt/commit/348fdc9))
* feat: 去除无用代码 ([4fccdf3](https://github.com/xcy960815/mac-desktop-chatgpt/commit/4fccdf3))
* feat: 设置快捷键弹框样式调整 ([604932b](https://github.com/xcy960815/mac-desktop-chatgpt/commit/604932b))
* feat: 添加 Windows x64 支持 ([76a984c](https://github.com/xcy960815/mac-desktop-chatgpt/commit/76a984c))
* feat: 添加代码格式化 ([bf0edd1](https://github.com/xcy960815/mac-desktop-chatgpt/commit/bf0edd1))
* feat: 添加多项功能优化 ([d2bda6d](https://github.com/xcy960815/mac-desktop-chatgpt/commit/d2bda6d))
* feat: 添加跨平台支持和智能 URL 记忆功能 ([df04848](https://github.com/xcy960815/mac-desktop-chatgpt/commit/df04848))
* feat: 添加重置 URL 功能 ([9843482](https://github.com/xcy960815/mac-desktop-chatgpt/commit/9843482))
* feat: 添加Gemini模型支持并改用Model枚举 ([1f34653](https://github.com/xcy960815/mac-desktop-chatgpt/commit/1f34653))
* feat: 添加grok 模型 ([1d49968](https://github.com/xcy960815/mac-desktop-chatgpt/commit/1d49968))
* feat: 问题修复 ([1c988c9](https://github.com/xcy960815/mac-desktop-chatgpt/commit/1c988c9))
* feat: 修复了esc全局占用造成别的软件无法使用的问题 ([ab4f63e](https://github.com/xcy960815/mac-desktop-chatgpt/commit/ab4f63e))
* feat: 修复bug ([dffa748](https://github.com/xcy960815/mac-desktop-chatgpt/commit/dffa748))
* feat: 样式调整 ([460a315](https://github.com/xcy960815/mac-desktop-chatgpt/commit/460a315))
* feat: 样式还原 ([c611484](https://github.com/xcy960815/mac-desktop-chatgpt/commit/c611484))
* feat: 优化 Electron 应用体积配置并添加优化文档 ([6441b8d](https://github.com/xcy960815/mac-desktop-chatgpt/commit/6441b8d))
* feat: 暂存代码 ([f95d49a](https://github.com/xcy960815/mac-desktop-chatgpt/commit/f95d49a))
* feat: 暂存提交 ([eed1b6b](https://github.com/xcy960815/mac-desktop-chatgpt/commit/eed1b6b))
* feat: 暂存提交 ([8559f7d](https://github.com/xcy960815/mac-desktop-chatgpt/commit/8559f7d))
* feat: 整合代码 ([f0912d6](https://github.com/xcy960815/mac-desktop-chatgpt/commit/f0912d6))
* feat: 整理全局ts声明,不用import 引用 ([5faa5a7](https://github.com/xcy960815/mac-desktop-chatgpt/commit/5faa5a7))
* feat: 支持多模型 ([986c6bd](https://github.com/xcy960815/mac-desktop-chatgpt/commit/986c6bd))
* feat: 支持多模型 ([c7c7362](https://github.com/xcy960815/mac-desktop-chatgpt/commit/c7c7362))
* feat: 支持多模型 ([5e52c50](https://github.com/xcy960815/mac-desktop-chatgpt/commit/5e52c50))
* feat: 支持监听图标在状态栏的位置变化,加载webview的时候添加loading 动画 ([15da6fc](https://github.com/xcy960815/mac-desktop-chatgpt/commit/15da6fc))
* feat: 支持在webview中使用默认浏览器打开链接 ([45a4f3d](https://github.com/xcy960815/mac-desktop-chatgpt/commit/45a4f3d))
* feat: 支持deepseek ([0c82b78](https://github.com/xcy960815/mac-desktop-chatgpt/commit/0c82b78))
* feat: add build optimizations and release script ([44cbcca](https://github.com/xcy960815/mac-desktop-chatgpt/commit/44cbcca))
* feat: dmg打包配置 ([80c9db7](https://github.com/xcy960815/mac-desktop-chatgpt/commit/80c9db7))
* feat: improve shortcut dialog UI ([ccf7ca3](https://github.com/xcy960815/mac-desktop-chatgpt/commit/ccf7ca3))
* feat: modularize webview handling and url tracking ([f8c4edc](https://github.com/xcy960815/mac-desktop-chatgpt/commit/f8c4edc))
* feat: optimize windows menubar experience ([061aa0b](https://github.com/xcy960815/mac-desktop-chatgpt/commit/061aa0b))
* feat: overhaul shortcut dialog and manager ([2aeee1c](https://github.com/xcy960815/mac-desktop-chatgpt/commit/2aeee1c))
* fix: 修复 Electron Forge 配置问题并添加 URL 记忆功能 ([d562b49](https://github.com/xcy960815/mac-desktop-chatgpt/commit/d562b49))
* fix: 修复 forge.config.ts 中的 ignore 配置，移除通配符模式以避免构建错误 ([bd8b435](https://github.com/xcy960815/mac-desktop-chatgpt/commit/bd8b435))
* fix: 修复打不开的问题 ([3998274](https://github.com/xcy960815/mac-desktop-chatgpt/commit/3998274))
* fix: 修复开发环境箱进程通讯问题 ([31f65bb](https://github.com/xcy960815/mac-desktop-chatgpt/commit/31f65bb))
* fix: 修复快捷键输入对话框返回null的问题 ([1d60ebd](https://github.com/xcy960815/mac-desktop-chatgpt/commit/1d60ebd))
* fix: 修复生产环境下 MAIN_WINDOW_VITE_DEV_SERVER_URL 为 undefined 的问题 ([83fd480](https://github.com/xcy960815/mac-desktop-chatgpt/commit/83fd480))
* fix: 修复index.html资源找不到的问题 ([d45c039](https://github.com/xcy960815/mac-desktop-chatgpt/commit/d45c039))
* fix: 修复ssl握手问题 ([52a4c18](https://github.com/xcy960815/mac-desktop-chatgpt/commit/52a4c18))
* fix: apply initial window behavior ([487286c](https://github.com/xcy960815/mac-desktop-chatgpt/commit/487286c))
* fix: correct pnpm setup order in GitHub Actions workflow ([bae5ec9](https://github.com/xcy960815/mac-desktop-chatgpt/commit/bae5ec9))
* fix: enhance anti-detection measures for webview to bypass Cloudflare verification ([2645756](https://github.com/xcy960815/mac-desktop-chatgpt/commit/2645756))
* fix: guard menubar resize watchers ([5c01529](https://github.com/xcy960815/mac-desktop-chatgpt/commit/5c01529))
* fix: keep locked window focused ([1e5c604](https://github.com/xcy960815/mac-desktop-chatgpt/commit/1e5c604))
* fix: normalize win artifacts and update tray hotkeys ([eacebcf](https://github.com/xcy960815/mac-desktop-chatgpt/commit/eacebcf))
* fix: resolve shortcut dialog preload path ([6691cc3](https://github.com/xcy960815/mac-desktop-chatgpt/commit/6691cc3))
* fix: specify bash shell for Windows compatibility in GitHub Actions ([a091513](https://github.com/xcy960815/mac-desktop-chatgpt/commit/a091513))
* fix(menubar): hide on desktop click with auto hide ([1860f16](https://github.com/xcy960815/mac-desktop-chatgpt/commit/1860f16))
* docs: 更新 README 添加所有 scripts 命令说明 ([a309b35](https://github.com/xcy960815/mac-desktop-chatgpt/commit/a309b35))
* docs: 添加中文 jsdoc ([be7e1c1](https://github.com/xcy960815/mac-desktop-chatgpt/commit/be7e1c1))
* docs: 为 WindowBehavior 和 MenuLanguage 枚举添加中文注释 ([f1fb2d8](https://github.com/xcy960815/mac-desktop-chatgpt/commit/f1fb2d8))
* docs: 为所有源文件补充完整的 JSDoc 注释 ([043166f](https://github.com/xcy960815/mac-desktop-chatgpt/commit/043166f))
* docs: add jsdoc comments to menubar ([d7fe5b4](https://github.com/xcy960815/mac-desktop-chatgpt/commit/d7fe5b4))
* docs: update changelog entries ([9beea1e](https://github.com/xcy960815/mac-desktop-chatgpt/commit/9beea1e))
* docs: update readme for multi-model support ([f30d1d3](https://github.com/xcy960815/mac-desktop-chatgpt/commit/f30d1d3))
* refactor: 简化URL跟踪机制，使用did-navigate事件保存最后访问的URL ([362cd8d](https://github.com/xcy960815/mac-desktop-chatgpt/commit/362cd8d))
* refactor: 将URL地址改为使用ModelUrl枚举 ([922b397](https://github.com/xcy960815/mac-desktop-chatgpt/commit/922b397))
* refactor: 移除 electron-menubar 中 index 的默认值设置 ([3f98868](https://github.com/xcy960815/mac-desktop-chatgpt/commit/3f98868))
* refactor: 优化代码并清理调试日志 ([56f803a](https://github.com/xcy960815/mac-desktop-chatgpt/commit/56f803a))
* refactor: 重命名 DMG 配置文件 ([01ea8a9](https://github.com/xcy960815/mac-desktop-chatgpt/commit/01ea8a9))
* refactor: cleanup structure ([af6fe8c](https://github.com/xcy960815/mac-desktop-chatgpt/commit/af6fe8c))
* refactor: extract window manager and common helpers ([ff2ca85](https://github.com/xcy960815/mac-desktop-chatgpt/commit/ff2ca85))
* build: tidy forge/vite config ([1a73d03](https://github.com/xcy960815/mac-desktop-chatgpt/commit/1a73d03))
* 优化快捷键设置对话框：支持直接监听键盘组合输入 ([b82cd5c](https://github.com/xcy960815/mac-desktop-chatgpt/commit/b82cd5c))
* feat:优化代码 ([4c72c7b](https://github.com/xcy960815/mac-desktop-chatgpt/commit/4c72c7b))
* fix:打包的状态栏背景色根据壁纸切换 ([08c546a](https://github.com/xcy960815/mac-desktop-chatgpt/commit/08c546a))
* refactor tray context menu ([96e6689](https://github.com/xcy960815/mac-desktop-chatgpt/commit/96e6689))
* Revert "fix: 修复ssl握手问题" ([ac604b4](https://github.com/xcy960815/mac-desktop-chatgpt/commit/ac604b4))
* test commit ([85ac93b](https://github.com/xcy960815/mac-desktop-chatgpt/commit/85ac93b))
* test commit ([aff3c9c](https://github.com/xcy960815/mac-desktop-chatgpt/commit/aff3c9c))
* style: 将加载模型的样式变更回去 ([a0d5856](https://github.com/xcy960815/mac-desktop-chatgpt/commit/a0d5856))
* style: 样式优化 ([9b39dd0](https://github.com/xcy960815/mac-desktop-chatgpt/commit/9b39dd0))
* style: 优化加载模型动画 ([e283701](https://github.com/xcy960815/mac-desktop-chatgpt/commit/e283701))
* test: 测试 commit 信息约束 ([19f9efe](https://github.com/xcy960815/mac-desktop-chatgpt/commit/19f9efe))
* test: 测试 commit 信息约束 ([1483ef9](https://github.com/xcy960815/mac-desktop-chatgpt/commit/1483ef9))



