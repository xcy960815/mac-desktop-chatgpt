import { app, globalShortcut, Menu } from 'electron'

import { setupTrayContextMenu } from '@/tray-context-menu'
import { resolveMainIndexUrl } from '@/utils/common'
import {
  createWindowManager,
  WindowManager
} from '@/window-manager'
import {
  createShortcutManager,
  ShortcutManager
} from '@/shortcut-manager'
import { initializeLastVisitedUrlTracking } from '@/utils/url-tracker'
import { registerWebContentsHandlers } from '@/webview-handlers'
import {
  createUpdateManager,
  UpdateManager
} from '@/utils/update-manager'
import { createAppTray, getTrayIconPath } from '@/core/tray'
import { createMainWindow } from '@/core/main-window'
import {
  registerAppLifecycleEvents,
  registerModelSyncEvents
} from '@/core/app-events'
import { settingsService } from '@/services/settings-service'
import { createReadySignal } from '@/utils/ready-signal'

export interface BootstrapAppResult {
  windowManager: WindowManager
  shortcutManager: ShortcutManager
  updateManager: UpdateManager
}

const setupApplicationMenu = (): void => {
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
    return
  }

  Menu.setApplicationMenu(null)
}

const registerWindowInputShortcuts = (
  browserWindow: Electron.BrowserWindow
): void => {
  if (process.platform === 'darwin') {
    return
  }

  browserWindow.webContents.on(
    'before-input-event',
    (_event, input) => {
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

const registerTrayEvents = (
  tray: Electron.Tray,
  windowManager: WindowManager,
  getContextMenu: () => Electron.Menu | null
): void => {
  tray.on('click', () => {
    windowManager.toggleWindow()
  })

  if (process.platform !== 'linux') {
    tray.on('right-click', () => {
      const contextMenu = getContextMenu()
      if (contextMenu) {
        tray.popUpContextMenu(contextMenu)
      }
    })
  }
}

const registerDevtoolsShortcut = (
  browserWindow: Electron.BrowserWindow
): void => {
  globalShortcut.register(
    'CommandOrControl+Shift+I',
    () => {
      if (browserWindow && !browserWindow.isDestroyed()) {
        browserWindow.webContents.toggleDevTools()
      }
    }
  )
}

export const bootstrapApp =
  async (): Promise<BootstrapAppResult> => {
    const userSetting = settingsService.get()
    if (userSetting.proxy) {
      app.commandLine.appendSwitch(
        'proxy-server',
        userSetting.proxy
      )
    }

    const appPath = app.getAppPath()
    const windowManager = createWindowManager()
    const shortcutManager = createShortcutManager({
      windowManager
    })
    const updateManager = createUpdateManager({
      getWindow: () => windowManager.getMainBrowserWindow()
    })

    const tray = createAppTray({ appPath })
    const browserWindow = await createMainWindow({
      appPath,
      indexUrl: resolveMainIndexUrl({
        devServerUrl: MAIN_WINDOW_VITE_DEV_SERVER_URL,
        rendererDir: __dirname
      }),
      userSetting,
      windowManager,
      iconPath: getTrayIconPath({ appPath })
    })

    const menubarReadySignal = createReadySignal()

    setupApplicationMenu()
    registerWindowInputShortcuts(browserWindow)

    const trayContextMenuController = setupTrayContextMenu({
      tray,
      isMenubarReady: menubarReadySignal.isReady,
      waitForMenubarReady:
        menubarReadySignal.waitUntilReady,
      getBrowserWindow: () =>
        windowManager.getMainBrowserWindow(),
      toggleWindow: () => windowManager.toggleWindow(),
      setAlwaysOnTop: (alwaysOnTop) =>
        windowManager.setAlwaysOnTop(alwaysOnTop),
      getCurrentShortcut: () =>
        shortcutManager.getCurrentShortcut(),
      setCurrentShortcut: (shortcut) => {
        shortcutManager.setCurrentShortcut(shortcut)
      },
      withBrowserWindow: windowManager.withBrowserWindow,
      updateManager
    })

    registerTrayEvents(
      tray,
      windowManager,
      trayContextMenuController.getContextMenu
    )

    shortcutManager.registerToggleShortcut()
    shortcutManager.registerIpcHandlers()

    registerDevtoolsShortcut(browserWindow)
    registerWebContentsHandlers(windowManager)
    registerModelSyncEvents(windowManager)
    registerAppLifecycleEvents(windowManager)

    initializeLastVisitedUrlTracking(browserWindow)
    updateManager.initialize()

    menubarReadySignal.markReady()

    return {
      windowManager,
      shortcutManager,
      updateManager
    }
  }
