# 打包与发布

## 选择构建目标

在仓库根目录执行 `pnpm run package`，可在 `out/` 得到当前平台的应用。需要验证用户下载的分发格式时，使用对应平台的 make 命令，产物位于 `out/make/`。

| 构建环境 | 命令 | 产物 |
| --- | --- | --- |
| macOS | `pnpm run make:mac:arm64` 或 `pnpm run make:mac:x64` | 对应架构的应用 ZIP |
| Windows | `pnpm run make:win` | x64 便携 ZIP、Squirrel 安装程序、更新包及 `RELEASES` 索引 |
| Linux | `pnpm run make:linux` | x64 Debian 安装包 |

## 验证与发布边界

修改资源路径后，用打包产物启动一次应用。开发服务器能读取的文件可能被 [Forge 打包配置](../forge.config.ts) 排除。Windows 构建完成后，可复用 CI 的检查命令。

```sh
node scripts/check-windows-artifacts.cjs
node scripts/check-packaged-startup.cjs "out/ChatHub Desktop-windows-x64/chathub-desktop.exe"
```

需要各平台构建物做验证时，可手动运行 **Build and Release** 工作流，从 Actions 下载产物。推送匹配 `v*` 的标签会触发版本校验；构建成功后，工作流创建 GitHub Release，并执行默认分支版本同步。排查更新渠道时，先确认使用的是 Windows Squirrel 安装版还是便携 ZIP。[发布工作流](../.github/workflows/release.yml) · [自动更新接入说明](../docs/自动更新接入说明.md)
