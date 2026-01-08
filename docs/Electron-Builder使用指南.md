# Electron Builder 使用指南

## 📦 概述

本项目已集成 `electron-builder` 用于优化打包体积和构建流程。相比 `electron-forge`，`electron-builder` 提供了更好的压缩选项和体积优化能力。

## 🚀 快速开始

### 安装依赖

```bash
npm install
```

### 构建命令

#### macOS 构建

```bash
# 构建所有架构 (arm64 + x64)
npm run build:builder:mac

# 仅构建 arm64
npm run build:builder:mac:arm64

# 仅构建 x64
npm run build:builder:mac:x64
```

#### Windows 构建

```bash
# 构建 Windows 版本
npm run build:builder:win

# 构建 Windows x64
npm run build:builder:win:x64
```

#### 构建所有平台

```bash
npm run build:builder:all
```

## 📁 输出目录

构建产物将输出到 `dist-electron-builder/` 目录：

```
dist-electron-builder/
├── desktop-chatgpt-1.1.1-arm64.zip
├── desktop-chatgpt-1.1.1-arm64.dmg
├── desktop-chatgpt-1.1.1-x64.zip
├── desktop-chatgpt-1.1.1-x64.dmg
└── ...
```

## 🎯 优化特性

### 1. 最大压缩

- **compression**: `maximum` - 使用最大压缩级别
- **DMG 压缩**: `compressionLevel: 9` - DMG 文件最大压缩
- **NSIS 压缩**: `compression: 'maximum'` - Windows 安装程序最大压缩

### 2. 文件排除优化

自动排除以下不必要的文件：
- 源代码文件 (`src/**/*`)
- 测试文件 (`**/*.test.*`, `**/*.spec.*`)
- 文档文件 (`**/*.md`, `**/README.md`)
- 配置文件 (`tsconfig.json`, `.eslintrc*`)
- 开发工具文件 (`.vscode`, `.idea`)
- Source map 文件 (`**/*.map`)

### 3. ASAR 打包

- 启用 ASAR 打包，减小文件数量
- 优化文件系统访问性能

## 📊 体积对比

### 预期优化效果

| 项目 | electron-forge | electron-builder | 优化 |
|------|----------------|-----------------|------|
| ZIP 文件 | ~250MB | ~240-245MB | 2-4% |
| DMG 文件 | - | ~235-240MB | 额外压缩 |
| 安装程序 | - | ~240-245MB | 支持增量更新 |

**注意**: Electron 框架本身 (~246MB) 无法大幅减少，主要优化在压缩和文件排除上。

## ⚙️ 配置说明

### electron-builder.config.js

主要配置项：

```javascript
{
  compression: 'maximum',  // 最大压缩
  asar: true,             // 启用 ASAR
  mac: { ... },           // macOS 配置
  win: { ... },           // Windows 配置
  exclude: [ ... ]        // 排除文件列表
}
```

### 自定义配置

如需修改配置，编辑 `electron-builder.config.js` 文件。

## 🔄 与 electron-forge 对比

| 特性 | electron-forge | electron-builder |
|------|----------------|------------------|
| 压缩选项 | 有限 | 丰富（最大压缩） |
| DMG 支持 | 基础 | 完整（可配置） |
| 安装程序 | 基础 | 完整（NSIS） |
| 增量更新 | 不支持 | 支持 |
| 配置复杂度 | 中等 | 较高 |
| 体积优化 | 一般 | 更好 |

## 📝 构建流程

1. **代码构建**: 使用 Vite 构建应用代码
2. **打包**: electron-builder 打包应用
3. **压缩**: 应用最大压缩选项
4. **输出**: 生成 ZIP/DMG/安装程序

## 🐛 常见问题

### 1. 构建失败

**问题**: 找不到 `.vite/build/main.js`

**解决**: 确保先运行 `npm run build` 构建代码

### 2. 图标文件缺失

**问题**: 找不到图标文件

**解决**: 确保 `images/icon.icns` (macOS) 和 `images/icon.ico` (Windows) 存在

### 3. 体积仍然很大

**问题**: 构建后体积仍然很大

**解决**: 
- Electron 框架本身约 246MB，这是正常的
- 主要优化在压缩和文件排除
- 如需进一步优化，考虑使用外部资源

## 🎯 最佳实践

1. **开发时**: 使用 `electron-forge` (`npm start`)
2. **生产构建**: 使用 `electron-builder` (`npm run build:builder:mac`)
3. **CI/CD**: 使用 `electron-builder` 进行自动化构建
4. **体积优化**: 定期检查 `exclude` 配置，排除不必要的文件

## 📚 参考资源

- [electron-builder 文档](https://www.electron.build/)
- [electron-builder 配置选项](https://www.electron.build/configuration/configuration)
- [体积优化指南](./ELECTRON_SIZE_OPTIMIZATION.md)

## 🔍 验证构建

构建完成后，检查输出：

```bash
# 查看构建产物
ls -lh dist-electron-builder/

# 检查文件大小
du -sh dist-electron-builder/*

# 验证应用结构（macOS）
unzip -l dist-electron-builder/desktop-chatgpt-1.1.1-arm64.zip
```

---

**提示**: 首次使用 electron-builder 时，可能需要下载一些依赖，请耐心等待。

