import * as path from 'path'

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
  Menu,
  BrowserWindow
} from 'electron'

import { readUserSetting } from '@/utils/user-setting'

/**
 * 带有上下文菜单的 Tray 接口
 */
interface TrayWithContextMenu extends Tray {
  _contextMenu?: Menu
}

// 设置应用名称，这会影响 Dock Hover Title
app.setName(TOOLTIP)

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

app.on('ready', async () => {
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
  tray.setToolTip(TOOLTIP)
  tray.setIgnoreDoubleClickEvents(true)

  const indexUrl = resolveMainIndexUrl({
    devServerUrl: MAIN_WINDOW_VITE_DEV_SERVER_URL,
    rendererDir: __dirname
  })

  // Create WindowManager
  const windowManager = createWindowManager()

  // Create BrowserWindow
  const browserWindow = new BrowserWindow({
    icon: image,
    transparent: true,
    width: MAIN_WINDOW_WIDTH,
    height: MAIN_WINDOW_HEIGHT,
    useContentSize: true,
    show: false, // Initially hidden
    frame: false, // Frameless for custom UI
    titleBarStyle: 'hidden', // Restore traffic lights on macOS
    // electron-menubar usually creates a frameless window.
    // The previous CSS had "full-height", suggesting it might control its own frame or be frameless.
    // The previous `src/electron-menubar.ts` options in main.ts didn't explicitly set frame: false in the user code I saw earlier,
    // but `ElectronMenubar` class likely defaulted it or `electron-positioner` usage implies it.
    // However, looking at the user's `index.html` (viewed earlier), it had "drag-region".
    // Let's assume frameless for now to match typical "menubar app" look, or standard if standard positioning.
    // User said "standard window position", but didn't say "standard window frame".
    // Usually these apps use custom frames. Let's stick to `frame: false` for now as it's safer for UI continuity.
    // Wait, I saw `src/main.ts` passed options: `transparent: true`. Transparent usually implies frameless.
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      // 启用webview标签
      webviewTag: true,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  browserWindow.loadURL(indexUrl)

  // Setup separate Taskbar icon behavior?
  // Previous code:
  // if (process.platform === 'darwin') { app.dock.hide() }
  // else if (process.platform === 'linux') { browserWindow.setSkipTaskbar(true) }

  if (process.platform === 'darwin') {
    const dockIcon = nativeImage.createFromPath(
      path.join(appPath, 'images', 'icon.png')
    )
    app.dock.setIcon(dockIcon)

    if (!userSetting.showInDock) {
      app.dock.hide()
    }
  } else if (process.platform === 'linux') {
    // Linux behavior could also check this setting potentially, but for now focus on Mac as requested
    browserWindow.setSkipTaskbar(true)
  }

  windowManager.setMainBrowserWindow(browserWindow)

  // Set initial behavior
  const initialSetting = readUserSetting()
  const initialBehavior =
    initialSetting.windowBehavior ||
    (initialSetting.lockWindowOnBlur
      ? WindowBehavior.LockOnDesktop
      : WindowBehavior.AutoHide)
  windowManager.setWindowBehavior(initialBehavior)

  isMenubarReady = true

  initializeLastVisitedUrlTracking(browserWindow)

  const template: Electron.MenuItemConstructorOptions[] = [
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
  // Check if we need to set application menu
  Menu.setApplicationMenu(menu)

  const shortcutManager = createShortcutManager({
    browserWindow,
    windowManager
  })

  const updateManager = createUpdateManager()

  setupTrayContextMenu({
    tray,
    windowManager,
    menu,
    urls: {
      chatgpt: ModelUrl.ChatGPT,
      deepseek: ModelUrl.DeepSeek,
      grok: ModelUrl.Grok,
      gemini: ModelUrl.Gemini,
      qwen: ModelUrl.Qwen,
      doubao: ModelUrl.Doubao
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

  // Tray Event Handlers
  tray.on('click', () => {
    windowManager.toggleWindow()
  })

  tray.on('right-click', () => {
    const contextMenu = (
      tray as unknown as TrayWithContextMenu
    )._contextMenu
    if (contextMenu) {
      tray.popUpContextMenu(contextMenu)
    }
  })

  shortcutManager.registerToggleShortcut()
  shortcutManager.registerIpcHandlers()

  globalShortcut.register(
    'CommandOrControl+Shift+I',
    () => {
      if (browserWindow && !browserWindow.isDestroyed()) {
        browserWindow.webContents.toggleDevTools()
      }
    }
  )

  registerWebContentsHandlers(windowManager)

  windowManager.on('after-show', async () => {
    const win = windowManager.getMainBrowserWindow()
    if (!win) return

    const userSetting = readUserSetting()
    // 使用 ModelUrl 枚举映射简化 URL 获取逻辑
    const modelUrlMap: Record<Model, string> = {
      [Model.ChatGPT]: ModelUrl.ChatGPT,
      [Model.DeepSeek]: ModelUrl.DeepSeek,
      [Model.Grok]: ModelUrl.Grok,
      [Model.Gemini]: ModelUrl.Gemini,
      [Model.Qwen]: ModelUrl.Qwen,
      [Model.Doubao]: ModelUrl.Doubao
    }
    const savedUrl =
      userSetting.urls?.[userSetting.model] ||
      modelUrlMap[userSetting.model]

    win.webContents.send(
      'model-changed',
      userSetting.model,
      savedUrl
    )
  })

  // Initial show
  await windowManager.showWindow()
  if (process.platform === 'darwin') {
    app.show()
  }
  app.focus()
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
