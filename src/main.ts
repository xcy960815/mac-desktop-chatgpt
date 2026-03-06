import { setupAppTray } from '@/tray-context-menu'
import { setupAppMenu } from '@/app-menu'
import {
  createWindowManager,
  WindowManager
} from '@/window-manager'
import { createShortcutManager } from '@/shortcut-manager'
import { registerWebContentsHandlers } from '@/webview-handlers'
import { setupAppConfig } from '@/app-config'
import { setupAppEvents } from '@/app-events'
import { app, Tray } from 'electron'

setupAppConfig()

let windowManager: WindowManager | null = null
let appTray: Tray | null = null

app.on('ready', async () => {
  // 创建窗口管理器
  windowManager = createWindowManager()

  // 创建并配置主窗口
  const browserWindow =
    await windowManager.createMainWindow()

  setupAppMenu(browserWindow)

  const shortcutManager = createShortcutManager({
    windowManager
  })

  appTray = setupAppTray({
    windowManager,
    getCurrentShortcut: () =>
      shortcutManager.getCurrentShortcut(),
    setCurrentShortcut: (shortcut) => {
      shortcutManager.setCurrentShortcut(shortcut)
    }
  })

  shortcutManager.registerToggleShortcut()
  shortcutManager.registerIpcHandlers()
  shortcutManager.registerDevToolsShortcut()

  registerWebContentsHandlers(windowManager)

  setupAppEvents(windowManager)
})
