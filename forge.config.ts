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

/**
 * 移除本地构建文件中的版本号
 * 只有通过 GitHub Actions 构建的才保留版本号
 */
const removeVersionFromLocalBuilds = async () => {
  // 检查是否是 CI 环境
  const isCI =
    process.env.CI === 'true' ||
    process.env.GITHUB_ACTIONS === 'true'

  // 如果是 CI 环境，保留版本号
  if (isCI) {
    return
  }

  const zipRoot = path.resolve(__dirname, 'out/make/zip')
  if (!existsSync(zipRoot)) {
    return
  }

  const entries = await readdir(zipRoot, {
    withFileTypes: true
  })

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.zip')) {
      continue
    }

    // 匹配版本号模式：-1.1.1 或 -1.1.1-xxx
    // 例如：desktop-chatgpt-darwin-arm64-1.1.1.zip -> desktop-chatgpt-darwin-arm64.zip
    // 匹配格式：-版本号.zip 或 -版本号-其他.zip
    const versionPattern =
      /-(\d+\.\d+\.\d+)(?:-[^.]*)?\.zip$/
    if (versionPattern.test(entry.name)) {
      const oldPath = path.join(zipRoot, entry.name)
      // 移除版本号部分，保留文件名和 .zip 扩展名
      const newName = entry.name.replace(
        versionPattern,
        '.zip'
      )
      const newPath = path.join(zipRoot, newName)

      // 如果新文件名已存在，先删除
      if (existsSync(newPath)) {
        await rm(newPath, { recursive: true, force: true })
      }

      await rename(oldPath, newPath)
      console.log(
        `📦 本地构建：已移除版本号 ${entry.name} -> ${newName}`
      )
    }
  }
}

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    icon: 'images/icon',
    // 应用程序的名称
    name: pkg.productName,
    // 可执行文件的名称，解决 Linux 找不到二进制文件的问题
    executableName: pkg.name,
    // 产品的版本
    appVersion: pkg.version,
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
      'find-errors.log',
      'foge.config-backup.ts',
      'config/settings.json',
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
      name: pkg.name,
      setupIcon: path.resolve(__dirname, 'images/icon.ico')
    }),
    new MakerZIP({}, ['darwin', 'win32']),
    new MakerRpm({
      options: {
        description:
          'A cross-platform desktop application based on electron + vite + typescript.',
        genericName: 'ChatHub Desktop',
        icon: path.resolve(__dirname, 'images/icon.png')
      }
    }),
    new MakerDeb({
      options: {
        description:
          'A cross-platform desktop application based on electron + vite + typescript.',
        genericName: 'ChatHub Desktop',
        icon: path.resolve(__dirname, 'images/icon.png')
      }
    })
  ],
  hooks: {
    postMake: async () => {
      await normalizeZipOutputs()
      await renameWin32PackageDirs()
      await removeVersionFromLocalBuilds()
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
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true
    })
  ]
}

export default config
