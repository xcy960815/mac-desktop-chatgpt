/* eslint-disable @typescript-eslint/no-var-requires */
const pkg = require('./package.json')

/**
 * Electron Builder 配置
 * 用于优化打包体积和构建流程
 */
module.exports = {
  // 基础配置
  appId: 'com.desktop-chatgpt.app',
  productName: pkg.productName,
  copyright: `Copyright © ${new Date().getFullYear()} ${
    pkg.author.name
  }`,

  // 目录配置
  directories: {
    output: 'dist-electron-builder',
    buildResources: 'build'
  },

  // 文件配置
  files: [
    '.vite/build/**/*',
    'package.json',
    'node_modules/**/*'
  ],

  // 排除文件（优化体积）
  extraMetadata: {
    main: '.vite/build/main.js'
  },

  // 压缩配置
  compression: 'maximum', // 最大压缩
  asar: true,
  asarUnpack: [],

  // macOS 配置
  mac: {
    category: 'public.app-category.productivity',
    target: [
      {
        target: 'zip',
        arch: ['arm64', 'x64']
      },
      {
        target: 'dmg',
        arch: ['arm64', 'x64']
      }
    ],
    icon: 'images/icon.icns',
    hardenedRuntime: false,
    gatekeeperAssess: false,
    entitlements: null,
    entitlementsInherit: null,
    // 优化选项
    artifactName:
      '${productName}-${version}-${arch}.${ext}',
    // 压缩 DMG
    dmg: {
      contents: [
        {
          x: 130,
          y: 220
        },
        {
          x: 410,
          y: 220,
          type: 'link',
          path: '/Applications'
        }
      ],
      compressionLevel: 9 // 最大压缩
    }
  },

  // Windows 配置
  win: {
    target: [
      {
        target: 'zip',
        arch: ['x64']
      },
      {
        target: 'nsis',
        arch: ['x64']
      }
    ],
    icon: 'images/icon.ico',
    // 优化选项
    artifactName: '${productName}-${version}-${arch}.${ext}'
  },

  // NSIS 安装程序配置（Windows）
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: pkg.productName,
    // 压缩选项
    compression: 'maximum'
  },

  // Linux 配置
  linux: {
    target: ['AppImage', 'deb', 'rpm'],
    category: 'Utility',
    icon: 'images/icon.png'
  },

  // 优化配置
  buildVersion: pkg.version,

  // 排除不必要的文件（进一步优化体积）
  exclude: [
    '**/.git/**/*',
    '**/.vscode/**/*',
    '**/.idea/**/*',
    '**/src/**/*',
    '**/tsconfig.json',
    '**/vite.*.config.ts',
    '**/forge.config.ts',
    '**/forge.env.d.ts',
    '**/commitlint.config.js',
    '**/node_modules/.cache/**/*',
    '**/node_modules/.vite/**/*',
    '**/node_modules/.bin/**/*',
    '**/readme.md',
    '**/CHANGELOG.md',
    '**/scripts/**/*',
    '**/find-errors.log',
    '**/foge.config-backup.ts',
    '**/config/settings.json',
    '**/dist/**/*',
    '**/.DS_Store',
    '**/Thumbs.db',
    '**/*.map',
    '**/*.test.js',
    '**/*.test.ts',
    '**/*.spec.js',
    '**/*.spec.ts',
    '**/test/**/*',
    '**/tests/**/*',
    '**/__tests__/**/*',
    '**/*.md',
    '**/README.md',
    '**/CHANGELOG.md',
    '**/LICENSE',
    '**/LICENSE.txt',
    '**/LICENSE.md',
    '**/.npmignore',
    '**/.gitignore',
    '**/.eslintrc*',
    '**/.prettierrc*',
    '**/tsconfig.json',
    '**/jest.config.js',
    '**/karma.conf.js',
    '**/.travis.yml',
    '**/.github/**/*',
    '**/examples/**/*',
    '**/example/**/*',
    '**/docs/**/*',
    '**/doc/**/*'
  ],

  // 发布配置（可选）
  publish: null
}
