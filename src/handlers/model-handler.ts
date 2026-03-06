import { Model } from '@/utils/constants'
import { BrowserWindow, Tray } from 'electron'
import {
  readUserSetting,
  writeUserSetting
} from '@/utils/user-setting'
import { AppTrayOptions } from '@/tray-context-menu'
import {
  getAvailableBrowserWindow,
  MODEL_TO_URL_KEY
} from './utils'

/**
 * 创建模型切换处理函数
 * @param {Model} model - 要切换的目标模型
 * @param {TrayContextMenuOptions} options - 托盘上下文菜单配置选项
 * @param {() => void} updateContextMenu - 更新上下文菜单的回调函数
 * @param {TrayContextMenuOptions['urls']} urls - 各种模型的 URL 配置
 * @returns {() => void} 模型切换处理函数
 */
export const createModelSwitchHandler = (
  model: Model,
  options: AppTrayOptions & { tray: Tray },
  updateContextMenu: () => void,
  urls: AppTrayOptions['urls']
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
    ] as keyof AppTrayOptions['urls']
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
