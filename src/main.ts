import * as path from 'path'

import { ElectronMenubar } from './electron-menubar'
import { setupTrayContextMenu } from './tray-context-menu'
import {
  ModelUrl,
  TOOLTIP,
  Model,
  MAIN_WINDOW_WIDTH,
  MAIN_WINDOW_HEIGHT,
  WindowBehavior,
  CHROME_USER_AGENT
} from './constants'
import { resolveMainIndexUrl } from './utils/common'
import { createWindowManager } from './window-manager'
import { createShortcutManager } from './shortcut-manager'
import { initializeLastVisitedUrlTracking } from './url-tracker'
import { registerWebContentsHandlers } from './webview-handlers'
import { createUpdateManager } from './utils/update-manager'

import {
  app,
  globalShortcut,
  nativeImage,
  Tray,
  Menu,
  session
} from 'electron'

import { readUserSetting } from './utils/user-setting'

app.commandLine.appendSwitch('ignore-certificate-errors')
app.commandLine.appendSwitch(
  'disable-blink-features',
  'AutomationControlled'
)
app.commandLine.appendSwitch('disable-features', 'WebGPU')

// 标记 ready 事件是否已触发
let isMenubarReady = false

/**
 * 修复 Google 登录时的 "此浏览器或应用可能不安全" 提示
 * @param {string} [partition] - Webview 的 partition 属性值，例如 'persist:webview'。如果未使用 partition，请传 undefined 或 null。
 */
async function fixGoogleLogin(partition?: string) {
  const ses = partition
    ? session.fromPartition(partition)
    : session.defaultSession

  // 清除缓存和存储，确保干净的登录环境（可选，如果用户反馈登录循环可开启）
  // await ses.clearStorageData()

  // 1. 获取原始 UA
  const originalUA = ses.getUserAgent()

  // 2. 清洗 UA：移除 Electron 和 应用名称，保留 Chrome/Safari 版本
  // 或者直接使用硬编码的 Chrome UA，这通常更稳妥
  const cleanUA = CHROME_USER_AGENT

  // 3. 设置全局 UA
  ses.setUserAgent(cleanUA)

  // 4. 强制拦截 Google 相关请求，确保 UA 绝对干净，并处理 Client Hints
  const filter = {
    urls: [
      '*://*.google.com/*',
      '*://accounts.google.com/*'
    ]
  }

  ses.webRequest.onBeforeSendHeaders(
    filter,
    (details, callback) => {
      const { requestHeaders } = details

      // 强制覆盖 User-Agent
      requestHeaders['User-Agent'] = cleanUA

      // 移除可能暴露 Electron 身份的 Client Hints
      // 或者伪造它们以匹配 Chrome UA
      // 简单起见，我们先移除它们，让服务器依赖 User-Agent
      delete requestHeaders['sec-ch-ua']
      delete requestHeaders['sec-ch-ua-mobile']
      delete requestHeaders['sec-ch-ua-platform']
      delete requestHeaders['sec-ch-ua-full-version']
      delete requestHeaders['sec-ch-ua-full-version-list']

      // 也可以尝试伪造（如果移除无效）：
      // requestHeaders['sec-ch-ua'] = '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"'
      // requestHeaders['sec-ch-ua-mobile'] = '?0'
      // requestHeaders['sec-ch-ua-platform'] = '"macOS"'

      callback({ requestHeaders })
    }
  )
}

app.on('ready', () => {
  fixGoogleLogin()
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
    // browserWindow.webContents.openDevTools({ mode: 'detach' })

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
