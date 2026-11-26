# 测试与验证

## 按行为选择回归用例

Vitest 从 `tests/**/*.test.mts` 收集测试。新增文件按 `<feature>.test.mts` 命名，用例名描述触发动作与可观察结果。项目未配置覆盖率门槛。

| 测试文件（位于 `tests/`） | 适合验证的行为 |
| --- | --- |
| `session.test.mts` | 切换模型、恢复旧会话、忽略过期导航。沿用临时用户目录隔离设置读写。 |
| `renderer.test.mts` | 加载失败后重试，以及从托盘重载当前网页。 |
| `shortcut.test.mts` | 编辑取消、注册冲突或保存失败后恢复快捷键。 |
| `proxy-handler.test.mts` | 保存失败后恢复代理，清除代理时等待 Electron 会话接受变更。 |
| `input-dialog.test.mts` | 重复打开、关闭窗口和 IPC 消息来源。 |
| `update.test.mts` | Windows 安装环境满足条件时初始化自动更新。 |

## 本地复查

迭代时可运行单个文件，例如 `pnpm exec vitest run tests/session.test.mts`。提交代码前可按 Windows CI 的顺序执行以下检查。

```sh
pnpm run lint
pnpm exec tsc --noEmit
pnpm test
```

三条命令分别检查 ESLint 规则、TypeScript 类型和测试行为。[PR 工作流](../.github/workflows/check.yml) 还在 Windows 上构建分发包、校验产物并启动打包后的程序。启动检查使用临时用户目录，确认桌面页面和 webview 已出现。服务商登录或会话恢复的结论还需要对应的功能验证。
