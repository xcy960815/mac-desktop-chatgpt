import * as path from 'path'

import { ElectronMenubar } from './electron-menubar'
import { setupTrayContextMenu } from './tray-context-menu'
import {
  ModelUrl,
  TOOLTIP,
  Model,
  MAIN_WINDOW_WIDTH,
  MAIN_WINDOW_HEIGHT,
  WindowBehavior
} from './constants'
import { resolveMainIndexUrl } from './utils/common'
import { createWindowManager } from './window-manager'
import { createShortcutManager } from './shortcut-manager'
import { initializeLastVisitedUrlTracking } from './url-tracker'
import { registerWebContentsHandlers } from './webview-handlers'

import {
  app,
  globalShortcut,
  nativeImage,
  Tray,
  Menu
} from 'electron'

import { readUserSetting } from './utils/user-setting'

app.commandLine.appendSwitch('ignore-certificate-errors')

// 标记 ready 事件是否已触发
let isMenubarReady = false

app.on('ready', () => {
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
    tooltip: TOOLTIP
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
    console.log(
      '✅ Menubar ready 事件已触发，browserWindow 已保存'
    )

    if (process.platform === 'darwin') {
      app.dock.hide()
    } else if (process.platform === 'linux') {
      browserWindow.setSkipTaskbar(true)
    }

    initializeLastVisitedUrlTracking(browserWindow)

    const menu = new Menu()

    const shortcutManager = createShortcutManager({
      browserWindow,
      electronMenubar
    })

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
      withBrowserWindow: windowManager.withBrowserWindow
    })

    shortcutManager.registerToggleShortcut()
    shortcutManager.registerIpcHandlers()

    Menu.setApplicationMenu(menu)

    // 打开开发工具
    // browserWindow.webContents.openDevTools();
  })

  registerWebContentsHandlers(electronMenubar)

  electronMenubar.on(
    'after-show',
    async ({ browserWindow }) => {
      const userSetting = readUserSetting()
      const savedUrl =
        userSetting.urls?.[userSetting.model] ||
        (userSetting.model === Model.DeepSeek
          ? ModelUrl.DeepSeek
          : userSetting.model === Model.ChatGPT
          ? ModelUrl.ChatGPT
          : userSetting.model === Model.Gemini
          ? ModelUrl.Gemini
          : ModelUrl.Grok)

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
