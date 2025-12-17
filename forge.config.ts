import type { ForgeConfig } from '@electron-forge/shared-types'
import { MakerSquirrel } from '@electron-forge/maker-squirrel'
import { MakerZIP } from '@electron-forge/maker-zip'
import { MakerDeb } from '@electron-forge/maker-deb'
import { MakerRpm } from '@electron-forge/maker-rpm'
import { VitePlugin } from '@electron-forge/plugin-vite'
import { FusesPlugin } from '@electron-forge/plugin-fuses'
import { FuseV1Options, FuseVersion } from '@electron/fuses'
import path from 'node:path'
import { existsSync } from 'node:fs'
import { readdir, rename, rm } from 'node:fs/promises'
import pkg from './package.json'

/**
 * 将一个文件夹下的所有内容移动至目标文件夹根目录
 */
const moveDirEntries = async (
  sourceDir: string,
  targetDir: string
) => {
  const entries = await readdir(sourceDir, {
    withFileTypes: true
  })

  for (const entry of entries) {
    const fromPath = path.join(sourceDir, entry.name)
    const toPath = path.join(targetDir, entry.name)

    if (existsSync(toPath)) {
      await rm(toPath, { recursive: true, force: true })
    }

    await rename(fromPath, toPath)
  }
}

/**
 * 将 win32 文件夹重命名为 windows，并去掉架构子目录
 */
const normalizeWinZipFolder = async () => {
  const zipRoot = path.resolve(__dirname, 'out/make/zip')
  const win32Dir = path.join(zipRoot, 'win32')
  const windowsDir = path.join(zipRoot, 'windows')

  if (!existsSync(win32Dir)) return

  if (existsSync(windowsDir)) {
    await rm(windowsDir, { recursive: true, force: true })
  }

  await rename(win32Dir, windowsDir)

  await flattenArchDirs(windowsDir)
  await renameWin32Artifacts(windowsDir)
}

/**
 * 将指定目录下的 arm64/x64 等架构子目录扁平化
 */
const flattenArchDirs = async (
  platformDir: string,
  archFolders = ['arm64', 'x64']
) => {
  if (!existsSync(platformDir)) return

  const dirEntries = await readdir(platformDir, {
    withFileTypes: true
  })

  for (const archDir of dirEntries) {
    if (!archDir.isDirectory()) continue
    if (!archFolders.includes(archDir.name)) continue

    const archDirPath = path.join(platformDir, archDir.name)
    await moveDirEntries(archDirPath, platformDir)
    await rm(archDirPath, { recursive: true, force: true })
  }
}

/**
 * 将 win32 字段替换为 windows，规范文件名
 */
const renameWin32Artifacts = async (
  platformDir: string
) => {
  if (!existsSync(platformDir)) return

  const dirEntries = await readdir(platformDir, {
    withFileTypes: true
  })

  for (const entry of dirEntries) {
    if (!entry.name.includes('win32')) continue

    const oldPath = path.join(platformDir, entry.name)
    const newName = entry.name.replace(/win32/gi, 'windows')
    const newPath = path.join(platformDir, newName)

    if (existsSync(newPath)) {
      await rm(newPath, { recursive: true, force: true })
    }

    await rename(oldPath, newPath)
  }
}

/**
 * 将 out 目录下所有包含 win32 的打包产物重命名为 windows
 */
const renameWin32PackageDirs = async () => {
  const outDir = path.resolve(__dirname, 'out')
  if (!existsSync(outDir)) return

  const dirEntries = await readdir(outDir, {
    withFileTypes: true
  })

  for (const entry of dirEntries) {
    if (!entry.isDirectory()) continue
    if (!entry.name.includes('win32')) continue

    const oldPath = path.join(outDir, entry.name)
    const newName = entry.name.replace(/win32/gi, 'windows')
    const newPath = path.join(outDir, newName)

    if (existsSync(newPath)) {
      await rm(newPath, { recursive: true, force: true })
    }

    await rename(oldPath, newPath)
  }
}

/**
 * 将指定平台目录下的产物移动到 zip 根目录，并删除该平台目录
 */
const movePlatformArtifactsToRoot = async (
  platformDir: string
) => {
  if (!existsSync(platformDir)) return

  const zipRoot = path.dirname(platformDir)

  await moveDirEntries(platformDir, zipRoot)
  await rm(platformDir, { recursive: true, force: true })
}

/**
 * 处理打包后 zip 目录的结构，满足 Windows/Mac 要求
 */
const normalizeZipOutputs = async () => {
  const zipRoot = path.resolve(__dirname, 'out/make/zip')
  await normalizeWinZipFolder()
  await movePlatformArtifactsToRoot(
    path.join(zipRoot, 'windows')
  )

  const darwinDir = path.join(zipRoot, 'darwin')
  await flattenArchDirs(darwinDir)
  await movePlatformArtifactsToRoot(darwinDir)
}

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    icon: 'images/icon',
    // 应用程序的名称
    name: pkg.name,
    // 产品的版本
    appVersion: pkg.version,
    ignore: [
      // 版本控制
      '.git',
      '.gitignore',
      '.gitattributes',
      // IDE 配置
      '.vscode',
      '.idea',
      '*.swp',
      '*.swo',
      '*~',
      // 源代码（已编译）
      'src',
      'src/**/*',
      // 构建工具和配置
      'tsconfig.json',
      'vite.*.config.ts',
      'vite.base.config.ts',
      'forge.config.ts',
      'forge.env.d.ts',
      'commitlint.config.js',
      // 开发依赖
      'node_modules/.cache',
      'node_modules/.vite',
      // 文档和说明
      'readme.md',
      'CHANGELOG.md',
      '*.md',
      // 测试文件
      '**/*.test.ts',
      '**/*.test.js',
      '**/*.spec.ts',
      '**/*.spec.js',
      // 开发脚本
      'scripts',
      // 临时文件
      '*.log',
      '*.tmp',
      '*.temp',
      'find-errors.log',
      // 备份文件
      '*.backup',
      '*.bak',
      'foge.config-backup.ts',
      // 配置文件（开发用）
      'config/settings.json',
      // 构建输出（旧版本）
      'dist',
      '.vite',
      // 其他
      '.DS_Store',
      'Thumbs.db',
      'desktop-chatgpt-*.json',
    ],
    // 是否覆盖已存在的打包文件
    overwrite: true,
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({
      // Windows Squirrel 安装程序配置
      name: pkg.name
    }),
    new MakerZIP({}, ['darwin', 'win32']),
    new MakerRpm({}),
    new MakerDeb({})
  ],
  hooks: {
    postMake: async () => {
      await normalizeZipOutputs()
      await renameWin32PackageDirs()
    }
  },
  plugins: [
    new VitePlugin({
      build: [
        {
          // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
          entry: 'src/main.ts',
          config: 'vite.main.config.ts'
        },
        {
          entry: 'src/preload.ts',
          config: 'vite.preload.config.ts'
        },
        {
          entry: 'src/webview-preload.ts',
          config: 'vite.preload.config.ts'
        }
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.ts'
        }
      ]
    }),
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]:
        false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]:
        true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true
    })
  ]
}

export default config
