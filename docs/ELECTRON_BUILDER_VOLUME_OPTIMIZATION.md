# Electron Builder 解压后体积优化方案

## 🎯 目标

**减小用户解压后的应用体积**，而不是压缩文件的大小。

## 📊 当前问题

Electron Builder 默认会打包所有 `dependencies` 到 `app.asar` 中，导致：
- app.asar 体积：265MB（包含整个 node_modules）
- 解压后 .app 体积：513MB
- 比 Electron Forge 的 250MB 大很多

## 🔍 问题根源

1. **Vite 配置**：`vite.base.config.ts` 中将所有 dependencies 标记为 `external`
2. **Electron Builder 行为**：默认打包所有 dependencies 到 app.asar
3. **依赖未打包**：Vite 构建产物中不包含依赖代码，需要运行时从 node_modules 加载

## 💡 解决方案

### 方案 1：让 Vite 打包所有依赖（推荐）

修改 `vite.base.config.ts`：

```typescript
// 只保留 Electron 和 Node.js 内置模块为外部依赖
export const external = [...builtins];
// 移除：...Object.keys(pkg.dependencies)
```

**优点**：
- 所有依赖被打包到构建产物中
- electron-builder 不需要打包 node_modules
- 解压后体积最小

**缺点**：
- 构建时间可能稍长
- 需要确保所有依赖都能被正确打包

### 方案 2：使用 electron-builder 的 exclude 配置

在 `electron-builder.config.js` 中：

```javascript
exclude: [
  'node_modules/**/*',
  '**/node_modules/**/*',
  // ... 其他排除项
]
```

**注意**：electron-builder 可能仍然会打包 dependencies，需要配合方案 1 使用。

### 方案 3：使用 beforePack 钩子

```javascript
beforePack: async (context) => {
  // 手动删除或排除 node_modules
  // 但这可能影响构建流程
}
```

## 🚀 实施步骤

1. ✅ 修改 `vite.base.config.ts`，移除 dependencies 的 external 标记
2. ✅ 更新 `electron-builder.config.js`，明确排除 node_modules
3. ✅ 重新构建并测试
4. ✅ 验证解压后体积

## 📝 注意事项

1. **依赖兼容性**：确保所有依赖都能被 Vite 正确打包
2. **构建时间**：打包所有依赖可能增加构建时间
3. **测试验证**：修改后需要充分测试应用功能

## 🔄 当前状态

- ✅ 已修改 Vite 配置
- ✅ 已更新 electron-builder 配置
- ⚠️ 需要验证构建结果

## 📚 参考

- [Vite 外部依赖配置](https://vitejs.dev/guide/build.html#library-mode)
- [Electron Builder 文件排除](https://www.electron.build/configuration/contents#files)

