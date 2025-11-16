// import type { ForgeConfig } from '@electron-forge/shared-types'
// import { MakerSquirrel } from '@electron-forge/maker-squirrel'
// import { MakerZIP } from '@electron-forge/maker-zip'
// import { MakerDeb } from '@electron-forge/maker-deb'
// import { MakerRpm } from '@electron-forge/maker-rpm'
// import { VitePlugin } from '@electron-forge/plugin-vite'
// import { FusesPlugin } from '@electron-forge/plugin-fuses'
// import { FuseV1Options, FuseVersion } from '@electron/fuses'
// import pkg from './package.json'
// const config: ForgeConfig = {
//   packagerConfig: {
//     asar: true,
//     icon: 'images/icon',
//     // 应用程序的名称
//     name: pkg.name,
//     // 产品的版本
//     appVersion: pkg.version,
//     // 移除 ignore 配置，让 Vite 插件自动处理
//     // ignore: [
//     //   ".git",
//     //   ".vscode",
//     //   "node_modules/.cache",
//     //   "src"
//     // ],
//     // 是否覆盖已存在的打包文件
//     overwrite: true
//   },
//   rebuildConfig: {},
//   makers: [
//     new MakerSquirrel(
//       {
//         // Windows Squirrel 安装程序配置
//         name: pkg.name
//       },
//       ['win32']
//     ),
//     new MakerZIP({}, ['darwin', 'win32']),
//     new MakerRpm({}),
//     new MakerDeb({})
//   ],
//   plugins: [
//     new VitePlugin({
//       // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
//       // If you are familiar with Vite configuration, it will look really familiar.
//       build: [
//         {
//           // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
//           entry: 'src/main.ts',
//           config: 'vite.main.config.ts'
//         },
//         {
//           entry: 'src/preload.ts',
//           config: 'vite.preload.config.ts'
//         }
//       ],
//       renderer: [
//         {
//           name: 'main_window',
//           config: 'vite.renderer.config.ts'
//         }
//       ]
//     }),
//     // Fuses are used to enable/disable various Electron functionality
//     // at package time, before code signing the application
//     new FusesPlugin({
//       version: FuseVersion.V1,
//       [FuseV1Options.RunAsNode]: false,
//       [FuseV1Options.EnableCookieEncryption]: true,
//       [FuseV1Options.EnableNodeOptionsEnvironmentVariable]:
//         false,
//       [FuseV1Options.EnableNodeCliInspectArguments]: false,
//       [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]:
//         true,
//       [FuseV1Options.OnlyLoadAppFromAsar]: true
//     })
//   ]
// }

// export default config

// 原来 forge.config.ts 的内容
import type { ForgeConfig } from '@electron-forge/shared-types'
import { MakerSquirrel } from '@electron-forge/maker-squirrel'
import { MakerZIP } from '@electron-forge/maker-zip'
import { MakerDeb } from '@electron-forge/maker-deb'
import { MakerRpm } from '@electron-forge/maker-rpm'
import { VitePlugin } from '@electron-forge/plugin-vite'
import { FusesPlugin } from '@electron-forge/plugin-fuses'
import { FuseV1Options, FuseVersion } from '@electron/fuses'
import pkg from './package.json'

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
    new MakerSquirrel({}),
    new MakerZIP({}, ['darwin']),
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
