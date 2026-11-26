# 提交与协作

## 提交信息

使用 Conventional Commits，格式为 `type(scope): subject`，scope 可省略。按实际改动选择类型。仓库历史中的例子包括：

- `fix(ci): read release timestamp from the tagged commit` 修正 CI 行为。
- `refactor: simplify tray actions and settings dialogs` 调整内部结构。
- `docs: refresh project readme` 更新贡献者或用户文档。

Husky 的 `commit-msg` 钩子运行 commitlint。标题上限为 100 个字符，摘要末尾省略英文句号。详见 [commitlint 配置](../commitlint.config.js)。

## PR 描述

说明用户在什么场景遇到问题、这次改动后的行为，以及评审者如何验证。有关联 issue 时附链接；改动托盘、对话框等可见界面时附截图，并注明系统。

列出实际运行的检查和对应平台。例如，修复快捷键注册冲突时，写清是否运行了 `tests/shortcut.test.mts`，是否在桌面环境中触发过冲突，以及原快捷键能否继续使用。涉及更新时，再注明安装方式，因为安装版和便携版走不同的更新流程。
