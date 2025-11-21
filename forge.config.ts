import type { ForgeConfig } from '@electron-forge/shared-types'
import { MakerSquirrel } from '@electron-forge/maker-squirrel'
import { MakerZIP } from '@electron-forge/maker-zip'
import { MakerDeb } from '@electron-forge/maker-deb'
import { MakerRpm } from '@electron-forge/maker-rpm'
import { VitePlugin } from '@electron-forge/plugin-vite'
import { FusesPlugin } from '@electron-forge/plugin-fuses'
import { FuseV1Options, FuseVersion } from '@electron/fuses'
import { rmSync } from 'node:fs'
import { join } from 'node:path'
import pkg from './package.json'

const ELECTRON_LOCALES_TO_KEEP = ['en-US', 'zh-CN']

const pruneElectronLocales = async (
  buildPath: string,
  _electronVersion: string,
  platform: string
) => {
  try {
    if (platform === 'win32') {
      // Windows: 删除多余的 locales/*.pak，只保留需要的语言
      const localesDir = join(buildPath, 'locales')
      const fs = await import('node:fs/promises')
      try {
        const files = await fs.readdir(localesDir)
        await Promise.all(
          files.map(async (file) => {
            // 例如：en-US.pak
            const keep = ELECTRON_LOCALES_TO_KEEP.some((locale) =>
              file.startsWith(locale)
            )
            if (!keep && file.endsWith('.pak')) {
              await fs.unlink(join(localesDir, file))
            }
          })
        )
      } catch {
        // 没有 locales 目录时忽略
      }
    }

    if (platform === 'darwin') {
      // macOS: 删除多余 *.lproj 目录，只保留 en / zh 相关
      const resourcesDir = join(buildPath, 'desktop-chatgpt.app', 'Contents', 'Resources')
      const fs = await import('node:fs/promises')
      try {
        const entries = await fs.readdir(resourcesDir)
        await Promise.all(
          entries.map(async (entry) => {
            if (!entry.endsWith('.lproj')) return
            const lower = entry.toLowerCase()
            const keep =
              lower.startsWith('en') ||
              lower.startsWith('zh')
            if (!keep) {
              rmSync(join(resourcesDir, entry), { recursive: true, force: true })
            }
          })
        )
      } catch {
        // 没有 Resources 目录时忽略
      }
    }
  } catch {
    // 裁剪失败不影响整体打包，静默忽略
  }
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
    overwrite: true,
    // 打包后裁剪多余的 Electron 语言包 / 资源目录
    afterPrune: [pruneElectronLocales]
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
