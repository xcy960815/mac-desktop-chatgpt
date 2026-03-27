import { app, dialog } from 'electron'

import { getTrayMenuText } from '@/i18n/tray-menu'
import { MenuLanguage, Model } from '@/utils/constants'
import { getAppIcon } from '@/utils/common'
import { settingsService } from '@/services/settings-service'
import { getAvailableBrowserWindow } from '@/handlers/utils'
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

export interface TrayActionService {
  switchModel(model: Model): () => void
  toggleAlwaysOnTop(): () => void
  toggleAutoLaunch(enabled: boolean): void
  changeMenuLanguage(language: MenuLanguage): () => void
  reloadCurrentModel(): () => Promise<void>
  checkForUpdates(): () => Promise<void>
  quit(): () => void
}

export const createTrayActionService = ({
  context,
  menuLanguage,
  updateContextMenu
}: CreateTrayActionServiceOptions): TrayActionService => {
  const switchModel = (model: Model) => () => {
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

  const toggleAlwaysOnTop = () => () => {
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
      dialog.showMessageBox({
        icon: getAppIcon(),
        type: 'error',
        title: getTrayMenuText(
          'autoLaunchErrorTitle',
          menuLanguage
        ),
        message: getTrayMenuText(
          'autoLaunchErrorMessage',
          menuLanguage
        ),
        buttons: [getTrayMenuText('confirm', menuLanguage)]
      })
    }
  }

  const changeMenuLanguage =
    (language: MenuLanguage) => () => {
      const latestSetting = settingsService.get()
      if (latestSetting.menuLanguage === language) {
        return
      }
      settingsService.setMenuLanguage(language)
      updateContextMenu()
    }

  const reloadCurrentModel = () => async () => {
    const newUserSetting = settingsService.resetUrls()
    await context.withBrowserWindow((win) => {
      if (win.isDestroyed()) {
        throw new Error(
          getTrayMenuText(
            'windowDestroyedError',
            menuLanguage
          )
        )
      }

      const currentModel = newUserSetting.model

      win.webContents.send(
        'model-changed',
        currentModel,
        settingsService.getCurrentModelUrl(currentModel)
      )
    })
  }

  const checkForUpdates = () => async () => {
    const browserWindow = getAvailableBrowserWindow(
      context.getBrowserWindow
    )
    await context.updateManager.checkForUpdates(
      browserWindow
    )
  }

  const quit = () => () => {
    settingsService.resetUrls()
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
