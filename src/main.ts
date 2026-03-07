import { setupAppTray } from '@/tray-context-menu'
import { setupAppMenu } from '@/app-menu'
import {
  createWindowManager,
  WindowManager
} from '@/window-manager'
import {
  setupGlobalShortcuts,
  setupShortcutIpcHandlers
} from '@/handlers/shortcut-setup'
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

  setupGlobalShortcuts(windowManager)
  setupShortcutIpcHandlers(windowManager)

  appTray = setupAppTray({
    windowManager
  })

  registerWebContentsHandlers(windowManager)

  setupAppEvents(windowManager)
})
