import * as path from 'path'

import { setupTrayContextMenu } from '@/tray-context-menu'
import {
  ModelUrl,
  TOOLTIP,
  Model,
  MAIN_WINDOW_WIDTH,
  MAIN_WINDOW_HEIGHT
} from '@/utils/constants'
import { resolveMainIndexUrl } from '@/utils/common'
import {
  createWindowManager,
  WindowManager
} from '@/window-manager'
import { createShortcutManager } from '@/shortcut-manager'
import { initializeLastVisitedUrlTracking } from '@/utils/url-tracker'
import { registerWebContentsHandlers } from '@/webview-handlers'
import { createUpdateManager } from '@/utils/update-manager'
import { readUserSetting } from '@/utils/user-setting'

import {
  app,
  globalShortcut,
  nativeImage,
  nativeTheme,
  Tray,
  Menu,
  BrowserWindow
} from 'electron'

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
    _event,
    _webContents,
    _url,
    _error,
    _certificate,
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

  const appPath = app.getAppPath()

  /**
   * 根据系统主题获取对应的托盘图标路径
   */
  const getTrayIconPath = () => {
    // macOS 上使用 Template 图片，系统会自动处理深浅色适配
    if (process.platform === 'darwin') {
      return path.join(
        appPath,
        'images',
        'gptIconTemplate.png'
      )
    }
    // Windows/Linux 根据系统当前是否为深色模式，返回不同的图标
    // 深色模式使用浅色图片，浅色模式使用深色图片
    return nativeTheme.shouldUseDarkColors
      ? path.join(appPath, 'images', 'gptIconLight.png')
      : path.join(appPath, 'images', 'gptIconDark.png')
  }

  /**
   * @desc 创建菜单栏图标
   * @type {Tray}
   */
  const image = nativeImage.createFromPath(
    getTrayIconPath()
  )

  const tray = new Tray(image)
  tray.setToolTip(TOOLTIP)
  tray.setIgnoreDoubleClickEvents(true)

  // 监听系统主题变化，动态更新托盘图标
  if (process.platform !== 'darwin') {
    nativeTheme.on('updated', () => {
      tray.setImage(
        nativeImage.createFromPath(getTrayIconPath())
      )
    })
  }

  const indexUrl = resolveMainIndexUrl({
    devServerUrl: MAIN_WINDOW_VITE_DEV_SERVER_URL,
    rendererDir: __dirname
  })

  // 创建窗口管理器
  windowManager = createWindowManager()

  // 创建浏览器窗口
  const browserWindow = new BrowserWindow({
    icon: image,
    width: MAIN_WINDOW_WIDTH,
    height: MAIN_WINDOW_HEIGHT,
    useContentSize: true,
    show: false, // 初始状态隐藏
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

  // macOS 保留系统应用菜单（关于、退出等），非 macOS 平台隐藏菜单栏
  if (process.platform === 'darwin') {
    const template: Electron.MenuItemConstructorOptions[] =
      [
        {
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
        },
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
    const menu = Menu.buildFromTemplate(template)
    Menu.setApplicationMenu(menu)
  } else {
    // Windows/Linux 隐藏菜单栏
    Menu.setApplicationMenu(null)

    // 通过 before-input-event 在 Windows/Linux 手动实现快捷键支持
    // 因为这部分平台隐藏了顶部菜单栏，没有系统原生的 Edit 支持
    browserWindow.webContents.on(
      'before-input-event',
      (event, input) => {
        if (!input.control) return

        switch (input.key.toLowerCase()) {
          case 'c':
            browserWindow.webContents.copy()
            break
          case 'v':
            browserWindow.webContents.paste()
            break
          case 'x':
            browserWindow.webContents.cut()
            break
          case 'a':
            browserWindow.webContents.selectAll()
            break
          case 'z':
            if (input.shift) {
              browserWindow.webContents.redo()
            } else {
              browserWindow.webContents.undo()
            }
            break
        }
      }
    )
  }

  const shortcutManager = createShortcutManager({
    windowManager
  })

  const updateManager = createUpdateManager()

  setupTrayContextMenu({
    tray,
    windowManager,
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

  if (process.platform !== 'linux') {
    tray.on('right-click', () => {
      const contextMenu = tray._contextMenu
      if (contextMenu) {
        tray.popUpContextMenu(contextMenu)
      }
    })
  }

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
