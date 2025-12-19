# 解压后体积优化 - 最终分析

## 📊 当前情况

### 问题
- **Electron Builder 解压后**: 514MB（包含整个 node_modules）
- **Electron Forge 解压后**: 250MB
- **差异**: Electron Builder 比 Forge 大 264MB

### 根本原因

1. **Electron Builder 的默认行为**：
   - 自动打包所有 `package.json` 中的 `dependencies`
   - 即使依赖已经在 Vite 构建产物中，仍然会打包 node_modules
   - `files` 配置中的排除规则对 dependencies 无效

2. **Vite 配置已优化**：
   - ✅ 已修改 `vite.base.config.ts`，移除 dependencies 的 external 标记
   - ✅ 依赖已打包到 `.vite/build/main.js`（从 29KB 增加到 218KB）
   - ✅ 但 electron-builder 仍然会打包 node_modules

## 💡 解决方案

### 方案 1：使用 Electron Forge（推荐用于减小解压体积）

**如果目标是减小解压后的体积**，Electron Forge 是更好的选择：
- 解压后体积：250MB
- 配置简单
- 不自动打包 node_modules

### 方案 2：修改 package.json（临时方案）

在构建前临时将 dependencies 移到 devDependencies：

```bash
# 构建脚本
npm run build:optimized
```

但这可能影响应用运行。

### 方案 3：使用 electron-builder 的 afterPack 钩子

在打包后手动清理 app.asar 中的 node_modules：

```javascript
afterPack: async (context) => {
  // 使用 asar 工具提取、清理、重新打包
  // 但这很复杂且容易出错
}
```

### 方案 4：接受现状，优化压缩文件

虽然解压后体积大，但压缩文件小：
- ZIP: 212MB（比 Forge 压缩后小）
- DMG: 208MB
- 用户下载体积更小

## 🎯 建议

### 如果优先考虑解压后体积

**使用 Electron Forge**：
- 解压后：250MB
- 配置简单
- 满足需求

### 如果优先考虑下载体积

**使用 Electron Builder**：
- ZIP: 212MB（下载体积小）
- 解压后：514MB（但用户通常不关心）
- 支持增量更新

## 📝 结论

**对于你的需求（减小解压后体积）**：

1. **Electron Forge 更适合** - 解压后 250MB vs Builder 的 514MB
2. **Electron Builder 的优势在压缩文件** - 下载体积更小
3. **需要权衡** - 用户更关心下载体积还是解压后体积？

## 🔄 下一步

1. 如果选择 Forge：继续使用现有配置
2. 如果选择 Builder：接受解压后体积，但享受更小的下载体积
3. 混合方案：开发用 Forge，发布用 Builder（如果下载体积更重要）

---

**总结**：Electron Builder 在压缩文件优化上更好，但在解压后体积上不如 Forge。需要根据实际需求选择。

