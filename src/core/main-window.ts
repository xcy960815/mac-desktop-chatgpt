import { BrowserWindow, app, nativeImage } from 'electron'
import * as path from 'path'

import { WindowManager } from '@/window-manager'
import {
  MAIN_WINDOW_HEIGHT,
  MAIN_WINDOW_WIDTH
} from '@/utils/constants'
import { UserSetting } from '@/utils/user-setting'

export interface CreateMainWindowOptions {
  appPath: string
  indexUrl: string
  userSetting: UserSetting
  windowManager: WindowManager
  iconPath: string
}

export const createMainWindow = async ({
  appPath,
  indexUrl,
  userSetting,
  windowManager,
  iconPath
}: CreateMainWindowOptions): Promise<BrowserWindow> => {
  const browserWindow = new BrowserWindow({
    icon: nativeImage.createFromPath(iconPath),
    width: MAIN_WINDOW_WIDTH,
    height: MAIN_WINDOW_HEIGHT,
    useContentSize: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
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
    browserWindow.setSkipTaskbar(true)
  }

  windowManager.setMainBrowserWindow(browserWindow)

  if (userSetting.alwaysOnTop) {
    windowManager.setAlwaysOnTop(true)
  }

  return browserWindow
}
