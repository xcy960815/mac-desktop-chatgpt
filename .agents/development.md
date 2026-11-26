# 本地开发与代码风格

## 首次启动

在仓库根目录使用 Node.js 20.19.0 和 pnpm 10.24.0，与 CI 的工具版本一致。

```sh
pnpm install --frozen-lockfile
pnpm start
```

第一条命令按现有锁文件安装依赖，第二条通过 Electron Forge 和 Vite 启动桌面应用。安装 Electron 二进制失败时，先核对网络能否访问 [.npmrc](../.npmrc) 配置的镜像。该文件还为 Forge 配置了 hoisted 依赖布局。

## 编写 TypeScript

- 沿用现有命名：文件用 kebab-case，如 `settings-service.ts`；函数和变量用 camelCase；接口和类型用 PascalCase。
- `@/` 指向 `src/`。例如，从服务层导入设置用 `@/services/settings-service`。
- 按 [.prettierrc.js](../.prettierrc.js) 使用双空格缩进、单引号和 60 列建议行宽，省略行末分号与尾逗号。可对单个改动文件执行 `pnpm exec prettier --write src/services/settings-service.ts`。
- 提交时，Husky 对暂存的 JS、TS 和 TSX 文件执行 ESLint 自动修复和 Prettier。`.mts` 测试文件也在 `pnpm run lint` 的检查范围内，但不匹配暂存格式化规则。
