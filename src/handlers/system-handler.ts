import { app, dialog } from 'electron'
import {
  readUserSetting,
  writeUserSetting,
  resetUserUrls
} from '@/utils/user-setting'
import { TrayContextMenuOptions } from '@/tray-context-menu'
import { getTrayMenuText } from '@/i18n/tray-menu'
import {
  Model,
  ModelUrl,
  MenuLanguage
} from '@/utils/constants'
import { getAvailableBrowserWindow } from './utils'

export const handleAutoLaunchToggle = (
  enabled: boolean,
  menuLanguage: MenuLanguage,
  updateContextMenu: () => void
) => {
  try {
    app.setLoginItemSettings({
      openAtLogin: enabled,
      openAsHidden: true
    })
    const userSetting = readUserSetting()
    writeUserSetting({
      ...userSetting,
      autoLaunchOnStartup: enabled
    })
    updateContextMenu()
  } catch (error) {
    dialog.showErrorBox(
      getTrayMenuText('autoLaunchErrorTitle', menuLanguage),
      getTrayMenuText(
        'autoLaunchErrorMessage',
        menuLanguage
      )
    )
  }
}

export const handleAlwaysOnTopToggle = (
  options: TrayContextMenuOptions,
  updateContextMenu: () => void
) => {
  const current = readUserSetting()
  const newValue = !current.alwaysOnTop
  writeUserSetting({
    ...current,
    alwaysOnTop: newValue
  })
  options.windowManager.setAlwaysOnTop(newValue)
  updateContextMenu()
}

export const handleMenuLanguageChange = (
  language: MenuLanguage,
  updateContextMenu: () => void
) => {
  const latestSetting = readUserSetting()
  if (latestSetting.menuLanguage === language) {
    return
  }
  writeUserSetting({
    ...latestSetting,
    menuLanguage: language
  })
  updateContextMenu()
}

export const handleReload = async (
  options: TrayContextMenuOptions,
  menuLanguage: MenuLanguage
) => {
  const newUserSetting = resetUserUrls()
  await options.withBrowserWindow((win) => {
    if (win.isDestroyed()) {
      throw new Error(
        getTrayMenuText(
          'windowDestroyedError',
          menuLanguage
        )
      )
    }

    const currentModel = newUserSetting.model

    const modelUrlMap: Record<Model, string> = {
      [Model.ChatGPT]: ModelUrl.ChatGPT,
      [Model.DeepSeek]: ModelUrl.DeepSeek,
      [Model.Grok]: ModelUrl.Grok,
      [Model.Gemini]: ModelUrl.Gemini,
      [Model.Qwen]: ModelUrl.Qwen,
      [Model.Doubao]: ModelUrl.Doubao
    }

    const defaultUrl =
      newUserSetting.urls?.[currentModel] ||
      modelUrlMap[currentModel]

    win.webContents.send(
      'model-changed',
      currentModel,
      defaultUrl
    )
  })
}

export const handleCheckForUpdates = async (
  options: TrayContextMenuOptions
) => {
  const browserWindow = getAvailableBrowserWindow(
    options.windowManager,
    options.getMainBrowserWindow
  )
  await options.updateManager.checkForUpdates(browserWindow)
}

export const handleQuit = () => {
  resetUserUrls()
  app.quit()
}
