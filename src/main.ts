import * as path from 'path'

import { ElectronMenubar } from '@/electron-menubar'
import { setupTrayContextMenu } from '@/tray-context-menu'
import {
  ModelUrl,
  TOOLTIP,
  Model,
  MAIN_WINDOW_WIDTH,
  MAIN_WINDOW_HEIGHT,
  WindowBehavior
} from '@/constants'
import {
  resolveMainIndexUrl
  // checkProxy,
  // fixGoogleLogin
} from '@/utils/common'
import { createWindowManager } from '@/window-manager'
import { createShortcutManager } from '@/shortcut-manager'
import { initializeLastVisitedUrlTracking } from '@/url-tracker'
import { registerWebContentsHandlers } from '@/webview-handlers'
import { createUpdateManager } from '@/utils/update-manager'

import {
  app,
  globalShortcut,
  nativeImage,
  Tray,
  Menu
} from 'electron'

import { readUserSetting } from '@/utils/user-setting'

app.commandLine.appendSwitch('ignore-certificate-errors')
app.commandLine.appendSwitch(
  'disable-blink-features',
  'AutomationControlled'
)
app.commandLine.appendSwitch(
  'disable-features',
  'WebGPU,WebAuthn'
)
// 禁用 QUIC 协议，解决代理环境下 Google 服务连接不稳定/SSL 握手失败的问题
app.commandLine.appendSwitch('disable-quic')

// 标记 ready 事件是否已触发
let isMenubarReady = false

app.on(
  'certificate-error',
  (
    event,
    webContents,
    url,
    error,
    certificate,
    callback
  ) => {
    // 允许所有证书错误，防止自签名证书或代理证书导致连接失败
    event.preventDefault()
    callback(true)
  }
)

app.on('ready', () => {
  const userSetting = readUserSetting()
  if (userSetting.proxy) {
    app.commandLine.appendSwitch(
      'proxy-server',
      userSetting.proxy
    )
  }

  // checkProxy()

  // fixGoogleLogin()
  const appPath = app.getAppPath()
  /**
   * @desc 创建菜单栏图标
   * @type {Tray}
   * @param {nativeImage} image - 图标
   */
  const image = nativeImage.createFromPath(
    path.join(appPath, 'images', `gptIconTemplate.png`)
  )

  const tray = new Tray(image)

  const indexUrl = resolveMainIndexUrl({
    devServerUrl: MAIN_WINDOW_VITE_DEV_SERVER_URL,
    rendererDir: __dirname
  })

  const electronMenubar = new ElectronMenubar(app, {
    browserWindow: {
      icon: image,
      transparent: true,
      width: MAIN_WINDOW_WIDTH,
      height: MAIN_WINDOW_HEIGHT,
      useContentSize: true,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        // 启用webview标签
        webviewTag: true,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false
      }
    },
    index: indexUrl,
    tray,
    dir: appPath,
    showOnAllWorkspaces: true,
    preloadWindow: true,
    showDockIcon: false,
    icon: image,
    tooltip: TOOLTIP,
    showOnRightClick: false // 确保左键点击控制窗口显示，右键点击显示菜单
  })

  const initialSetting = readUserSetting()
  const initialBehavior =
    initialSetting.windowBehavior ||
    (initialSetting.lockWindowOnBlur
      ? WindowBehavior.LockOnDesktop
      : WindowBehavior.AutoHide)
  electronMenubar.setWindowBehavior(initialBehavior)

  const windowManager = createWindowManager(electronMenubar)

  electronMenubar.on('ready', async (menubar) => {
    const browserWindow = menubar.browserWindow

    windowManager.setMainBrowserWindow(browserWindow)
    isMenubarReady = true

    if (process.platform === 'darwin') {
      app.dock.hide()
    } else if (process.platform === 'linux') {
      browserWindow.setSkipTaskbar(true)
    }

    initializeLastVisitedUrlTracking(browserWindow)

    const template: Electron.MenuItemConstructorOptions[] =
      [
        {
          label: 'Edit',
          submenu: [
            { role: 'undo' },
            { role: 'redo' },
            { type: 'separator' },
            { role: 'cut' },
            { role: 'copy' },
            { role: 'paste' },
            { role: 'pasteAndMatchStyle' },
            { role: 'delete' },
            { role: 'selectAll' }
          ]
        }
      ]

    if (process.platform === 'darwin') {
      template.unshift({
        label: app.name,
        submenu: [
          { role: 'about' },
          { type: 'separator' },
          { role: 'services' },
          { type: 'separator' },
          { role: 'hide' },
          { role: 'hideOthers' },
          { role: 'unhide' },
          { type: 'separator' },
          { role: 'quit' }
        ]
      })
    }

    const menu = Menu.buildFromTemplate(template)

    const shortcutManager = createShortcutManager({
      browserWindow,
      electronMenubar
    })

    const updateManager = createUpdateManager()

    setupTrayContextMenu({
      tray,
      electronMenubar,
      menu,
      urls: {
        chatgpt: ModelUrl.ChatGPT,
        deepseek: ModelUrl.DeepSeek,
        grok: ModelUrl.Grok,
        gemini: ModelUrl.Gemini
      },
      isMenubarReady: () => isMenubarReady,
      getMainBrowserWindow: () =>
        windowManager.getMainBrowserWindow(),
      setMainBrowserWindow: (window) => {
        windowManager.setMainBrowserWindow(window)
      },
      getCurrentShortcut: () =>
        shortcutManager.getCurrentShortcut(),
      setCurrentShortcut: (shortcut) => {
        shortcutManager.setCurrentShortcut(shortcut)
      },
      withBrowserWindow: windowManager.withBrowserWindow,
      updateManager
    })

    shortcutManager.registerToggleShortcut()
    shortcutManager.registerIpcHandlers()

    Menu.setApplicationMenu(menu)

    // 打开开发工具
    // browserWindow.webContents.openDevTools()

    // 应用启动后默认显示窗口
    await electronMenubar.showWindow()
    if (process.platform === 'darwin') {
      electronMenubar.app.show()
    }
    // 确保应用获得焦点（所有平台）
    electronMenubar.app.focus()
  })

  registerWebContentsHandlers(electronMenubar)

  electronMenubar.on(
    'after-show',
    async ({ browserWindow }) => {
      const userSetting = readUserSetting()
      // 使用 ModelUrl 枚举映射简化 URL 获取逻辑
      const modelUrlMap: Record<Model, string> = {
        [Model.ChatGPT]: ModelUrl.ChatGPT,
        [Model.DeepSeek]: ModelUrl.DeepSeek,
        [Model.Grok]: ModelUrl.Grok,
        [Model.Gemini]: ModelUrl.Gemini
      }
      const savedUrl =
        userSetting.urls?.[userSetting.model] ||
        modelUrlMap[userSetting.model]

      browserWindow.webContents.send(
        'model-changed',
        userSetting.model,
        savedUrl
      )
    }
  )
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 应用退出时注销所有快捷键
app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})
