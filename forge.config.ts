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

// 优先使用环境变量中的版本号（例如 CI 中从 Git tag 传入），否则回退到 package.json
const appVersionFromEnv =
  process.env.APP_VERSION && process.env.APP_VERSION.trim()
    ? process.env.APP_VERSION.trim()
    : pkg.version

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    icon: 'images/icon',
    // 应用程序的名称
    name: pkg.name,
    // 产品的版本（优先使用 APP_VERSION 环境变量）
    appVersion: appVersionFromEnv,
    // 配置自动更新（electron-updater 会从 GitHub Releases 获取更新）
    // 注意：需要在 package.json 中配置 repository 字段
    // 忽略不必要的文件
    // 注意：electron-forge 使用 minimatch，但某些复杂模式可能导致问题
    // 这里只保留最关键的排除项，避免构建错误
    ignore: [
      '.git',
      '.gitignore',
      '.gitattributes',
      '.vscode',
      '.idea',
      '/src$',
      'tsconfig.json',
      'vite.main.config.ts',
      'vite.preload.config.ts',
      'vite.renderer.config.ts',
      'vite.base.config.ts',
      'forge.config.ts',
      'forge.env.d.ts',
      'commitlint.config.js',
      'node_modules/.cache',
      'node_modules/.vite',
      'node_modules/.bin',
      'readme.md',
      'CHANGELOG.md',
      'scripts',
      'find-errors.log',
      'foge.config-backup.ts',
      'config/settings.json',
      'dist',
      '.DS_Store',
      'Thumbs.db'
    ],
    // 是否覆盖已存在的打包文件
    overwrite: true
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
