import { Model } from '@/utils/constants'
import {
  readUserSetting,
  writeUserSetting
} from '@/utils/user-setting'
import { TrayContextMenuOptions } from '@/tray-context-menu'
import {
  getAvailableBrowserWindow,
  MODEL_TO_URL_KEY
} from './utils'

export const createModelSwitchHandler = (
  model: Model,
  options: TrayContextMenuOptions,
  updateContextMenu: () => void,
  urls: TrayContextMenuOptions['urls']
) => {
  return () => {
    const userSetting = readUserSetting()
    const newUserSetting = writeUserSetting({
      ...userSetting,
      model
    })
    updateContextMenu()

    // 根据模型获取对应的 URL
    const urlKey = MODEL_TO_URL_KEY[
      model
    ] as keyof TrayContextMenuOptions['urls']
    const savedUrl =
      newUserSetting.urls?.[model] || urls[urlKey]

    getAvailableBrowserWindow(
      options.windowManager,
      options.getMainBrowserWindow
    )?.webContents.send(
      'model-changed',
      newUserSetting.model,
      savedUrl
    )
  }
}
