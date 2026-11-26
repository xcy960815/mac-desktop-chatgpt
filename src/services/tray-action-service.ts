import { app } from 'electron'

import { getTrayMenuText } from '@/i18n/tray-menu'
import { MenuLanguage, Model } from '@/utils/constants'
import { settingsService } from '@/services/settings-service'
import {
  getAvailableBrowserWindow,
  showSettingsMessage
} from '@/handlers/utils'
import { UpdateManager } from '@/utils/update-manager'

export interface TrayActionContext {
  getBrowserWindow(): Electron.BrowserWindow | null
  setAlwaysOnTop(alwaysOnTop: boolean): void
  withBrowserWindow<T>(
    task: (win: Electron.BrowserWindow) => T | Promise<T>
  ): Promise<T | null>
  updateManager: UpdateManager
}

export interface CreateTrayActionServiceOptions {
  context: TrayActionContext
  menuLanguage: MenuLanguage
  updateContextMenu: () => void
}

export const createTrayActionService = ({
  context,
  menuLanguage,
  updateContextMenu
}: CreateTrayActionServiceOptions) => {
  const switchModel = (model: Model) => {
    const newUserSetting =
      settingsService.setCurrentModel(model)
    updateContextMenu()

    getAvailableBrowserWindow(
      context.getBrowserWindow
    )?.webContents.send(
      'model-changed',
      newUserSetting.model,
      settingsService.getCurrentModelUrl(model)
    )
  }

  const toggleAlwaysOnTop = () => {
    const current = settingsService.get()
    const newValue = !current.alwaysOnTop
    settingsService.setAlwaysOnTop(newValue)
    context.setAlwaysOnTop(newValue)
    updateContextMenu()
  }

  const toggleAutoLaunch = (enabled: boolean) => {
    try {
      app.setLoginItemSettings({
        openAtLogin: enabled,
        openAsHidden: true
      })
      settingsService.setAutoLaunchOnStartup(enabled)
      updateContextMenu()
    } catch {
      return showSettingsMessage(
        menuLanguage,
        'error',
        'autoLaunchErrorTitle',
        getTrayMenuText(
          'autoLaunchErrorMessage',
          menuLanguage
        )
      )
    }
  }

  const changeMenuLanguage = (language: MenuLanguage) => {
    const latestSetting = settingsService.get()
    if (latestSetting.menuLanguage === language) {
      return
    }
    settingsService.setMenuLanguage(language)
    updateContextMenu()
  }

  const reloadCurrentModel = async () => {
    await context.withBrowserWindow((win) => {
      win.webContents.send('reload-current-model')
    })
  }

  const checkForUpdates = async () => {
    const browserWindow = getAvailableBrowserWindow(
      context.getBrowserWindow
    )
    await context.updateManager.checkForUpdates(
      browserWindow
    )
  }

  const quit = () => {
    app.quit()
  }

  return {
    switchModel,
    toggleAlwaysOnTop,
    toggleAutoLaunch,
    changeMenuLanguage,
    reloadCurrentModel,
    checkForUpdates,
    quit
  }
}
