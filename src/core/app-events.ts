import { app, globalShortcut } from 'electron'

import { WindowManager } from '@/window-manager'

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
