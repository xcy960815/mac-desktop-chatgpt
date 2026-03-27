import { app, globalShortcut } from 'electron'

import { WindowManager } from '@/window-manager'
import { settingsService } from '@/services/settings-service'

export const registerAppLifecycleEvents = (
  windowManager: WindowManager
): void => {
  app.on('activate', () => {
    windowManager.showWindow()
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })

  app.on('will-quit', () => {
    globalShortcut.unregisterAll()
  })

  app.on('before-quit', () => {
    windowManager.setWillQuit(true)
  })
}

export const registerModelSyncEvents = (
  windowManager: WindowManager
): void => {
  windowManager.on('after-show', async () => {
    const win = windowManager.getMainBrowserWindow()
    if (!win) return

    const userSetting = settingsService.get()

    const savedUrl = settingsService.getCurrentModelUrl(
      userSetting.model
    )

    win.webContents.send(
      'model-changed',
      userSetting.model,
      savedUrl
    )
  })
}
