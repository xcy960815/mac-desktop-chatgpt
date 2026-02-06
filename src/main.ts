import * as path from 'path'

import { setupTrayContextMenu } from '@/tray-context-menu'
import {
  ModelUrl,
  TOOLTIP,
  Model,
  MAIN_WINDOW_WIDTH,
  MAIN_WINDOW_HEIGHT
} from '@/constants'
import {
  resolveMainIndexUrl
  // checkProxy,
  // fixGoogleLogin
} from '@/utils/common'
import {
  createWindowManager,
  WindowManager
} from '@/window-manager'
import { createShortcutManager } from '@/shortcut-manager'
import { initializeLastVisitedUrlTracking } from '@/url-tracker'
import { registerWebContentsHandlers } from '@/webview-handlers'
import { createUpdateManager } from '@/utils/update-manager'
import { readUserSetting } from '@/utils/user-setting'

import {
  app,
  globalShortcut,
  nativeImage,
  Tray,
  Menu,
  BrowserWindow
} from 'electron'

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
// 防止后台窗口被节流，解决隐藏后再打开白屏的问题
app.commandLine.appendSwitch(
  'disable-backgrounding-occluded-windows',
  'true'
)

// 标记 ready 事件是否已触发
let isMenubarReady = false
let windowManager: WindowManager | null = null

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

  // 创建窗口管理器
  windowManager = createWindowManager()

  // 创建浏览器窗口
  const browserWindow = new BrowserWindow({
    icon: image,
    transparent: true,
    width: MAIN_WINDOW_WIDTH,
    height: MAIN_WINDOW_HEIGHT,
    useContentSize: true,
    show: false, // 初始状态隐藏
    // titleBarStyle: 'hidden', // 在 macOS 上显示红绿灯
    titleBarStyle: 'hiddenInset', // 在 macOS 上显示红绿灯
    trafficLightPosition: { x: 10, y: 6 }, // 调整红绿灯位置避免与内容重叠
    ...(process.platform !== 'darwin'
      ? { titleBarOverlay: true }
      : {}),
    // 为自定义 UI 设置窗口属性
    // 确保无边框窗口以适配自定义设计
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      // 启用webview标签
      webviewTag: true,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  browserWindow.once('ready-to-show', async () => {
    await windowManager.showWindow()
    if (process.platform === 'darwin') {
      app.show()
    }
    app.focus()
  })

  browserWindow.loadURL(indexUrl)

  if (process.platform === 'darwin') {
    const dockIcon = nativeImage.createFromPath(
      path.join(appPath, 'images', 'icon.png')
    )
    app.dock.setIcon(dockIcon)

    if (!userSetting.showInDock) {
      app.dock.hide()
    }
  } else if (process.platform === 'linux') {
    // Linux 行为可能也需要检查此设置，但目前根据需求主要关注 macOS
    browserWindow.setSkipTaskbar(true)
  }

  windowManager.setMainBrowserWindow(browserWindow)

  // 设置初始行为
  const initialSetting = readUserSetting()
  if (initialSetting.alwaysOnTop) {
    windowManager.setAlwaysOnTop(true)
  }

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
  // 检查是否需要设置应用程序菜单
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

  // 托盘事件处理程序
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

  // 初始显示由 ready-to-show 事件处理

  app.on('activate', () => {
    windowManager.showWindow()
  })
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

app.on('before-quit', () => {
  if (windowManager) {
    windowManager.setWillQuit(true)
  }
})
