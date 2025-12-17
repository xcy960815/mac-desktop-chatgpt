# Electron 应用体积优化指南

## 📊 当前体积分析

- **总应用大小**: ~250MB
- **Electron 框架**: ~247MB (主要占用)
- **应用代码**: ~2.1MB (app.asar)

## 🎯 优化策略

### 1. 代码层面优化 ✅ (已实现)

#### 1.1 Vite 构建优化
- ✅ 启用 Terser 压缩
- ✅ 移除 console 和 debugger
- ✅ Tree shaking
- ✅ 代码分割
- ✅ 移除 sourcemap

#### 1.2 依赖优化
- ✅ 只打包生产依赖
- ✅ 排除开发工具和测试文件

### 2. 打包配置优化 ✅ (已实现)

#### 2.1 ignore 配置优化
已优化 `forge.config.ts` 中的 ignore 配置，排除：
- 测试文件 (`**/*.test.*`, `**/*.spec.*`)
- 文档文件 (`**/*.md`, `**/README.md`)
- 配置文件 (`**/tsconfig.json`, `**/.eslintrc*`)
- 示例和文档目录 (`**/examples`, `**/docs`)
- Source map 文件 (`**/*.map`)

### 3. 进一步优化建议

#### 3.1 使用 electron-builder (可选)

如果当前体积仍然过大，可以考虑迁移到 `electron-builder`，它提供更多优化选项：

```bash
npm install --save-dev electron-builder
```

优势：
- 更好的压缩支持
- 增量更新支持
- 更灵活的配置选项

#### 3.2 移除不必要的 Chromium 组件

如果应用不需要某些 Chromium 功能，可以考虑：

1. **禁用 PDF 查看器**（如果不需要）
2. **移除不必要的语言包**
3. **禁用 DevTools**（生产环境）

在 `src/main.ts` 中：

```typescript
// 禁用 DevTools（生产环境）
if (process.env.NODE_ENV === 'production') {
  app.commandLine.appendSwitch('disable-dev-shims');
}
```

#### 3.3 使用更轻量的 Electron 版本

考虑使用 `electron-lite` 或自定义 Electron 构建（需要更多配置）：

```bash
# 查看可用的 Electron 版本
npm view electron versions
```

#### 3.4 优化 node_modules

在打包前清理 node_modules：

```bash
# 只安装生产依赖
npm ci --production

# 或使用工具清理
npx depcheck
npx npm-check-updates
```

#### 3.5 使用外部资源

将大型资源文件（如图片、字体）移到 CDN 或外部服务器，运行时下载。

#### 3.6 代码分割和懒加载

确保只加载必要的代码：

```typescript
// 使用动态导入
const module = await import('./heavy-module');
```

### 4. 体积对比工具

使用以下工具分析打包体积：

```bash
# 分析 asar 文件内容
npx asar list app.asar

# 查看文件大小
du -sh out/desktop-chatgpt-darwin-arm64/desktop-chatgpt.app/Contents/Resources/app.asar

# 分析 node_modules
npx bundle-phobia
```

### 5. 预期优化效果

| 优化项 | 预期减少 | 说明 |
|--------|---------|------|
| 移除测试文件 | 5-10MB | 取决于依赖数量 |
| 移除文档文件 | 2-5MB | README、LICENSE 等 |
| 移除 sourcemap | 1-3MB | 如果之前包含 |
| 代码压缩优化 | 1-2MB | 进一步压缩 |
| **总计** | **9-20MB** | 约 3-8% 减少 |

### 6. 注意事项

⚠️ **重要提示**：
- Electron 框架本身 (~247MB) 是必需的，无法大幅减少
- 250MB 对于 Electron 应用来说是正常大小
- 过度优化可能影响功能或稳定性
- 建议在优化后进行充分测试

### 7. 其他优化方向

#### 7.1 使用增量更新
考虑使用 `electron-updater` 实现增量更新，减少用户下载量。

#### 7.2 压缩分发文件
在 CI/CD 中使用压缩工具（如 `7z`）进一步压缩 ZIP 文件。

#### 7.3 平台特定优化
- macOS: 使用 `.dmg` 格式（可能比 ZIP 更小）
- Windows: 使用安装程序（支持增量更新）

## 📝 实施步骤

1. ✅ 已完成：优化 ignore 配置
2. ✅ 已完成：Vite 构建优化
3. 🔄 可选：考虑迁移到 electron-builder
4. 🔄 可选：移除不必要的 Chromium 组件
5. 🔄 可选：使用外部资源

## 🔍 验证优化效果

```bash
# 重新打包
npm run package

# 查看体积
du -sh out/desktop-chatgpt-darwin-arm64/desktop-chatgpt.app

# 对比优化前后
```

## 📚 参考资源

- [Electron 性能优化](https://www.electronjs.org/docs/latest/tutorial/performance)
- [Vite 构建优化](https://vitejs.dev/guide/build.html)
- [electron-builder 文档](https://www.electron.build/)

