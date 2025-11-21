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
 * 将win32 文件夹重命名为window，并去掉架构子目录
 */
const normalizeWinZipFolder = async () => {
  const zipRoot = path.resolve(__dirname, 'out/make/zip')
  const win32Dir = path.join(zipRoot, 'win32')
  const windowDir = path.join(zipRoot, 'window')

  if (!existsSync(win32Dir)) return

  if (existsSync(windowDir)) {
    await rm(windowDir, { recursive: true, force: true })
  }

  await rename(win32Dir, windowDir)

  await flattenArchDirs(windowDir)
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
 * 处理打包后 zip 目录的结构，满足 Windows/Mac 要求
 */
const normalizeZipOutputs = async () => {
  const zipRoot = path.resolve(__dirname, 'out/make/zip')
  await normalizeWinZipFolder()
  await flattenArchDirs(path.join(zipRoot, 'darwin'))
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
      '.git',
      '.vscode',
      'node_modules/.cache',
      'src'
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
