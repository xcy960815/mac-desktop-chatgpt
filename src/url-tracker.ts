import { BrowserWindow } from 'electron'

import {
  readUserSetting,
  writeUserSetting
} from './utils/user-setting'

/**
 * 初始化上次访问的 URL 跟踪
 * @param {BrowserWindow} browserWindow
 * @returns {void}
 */
export const initializeLastVisitedUrlTracking = (
  browserWindow: BrowserWindow
) => {
  const userSetting = readUserSetting()
  if (userSetting.lastVisitedUrl) {
    browserWindow.loadURL(userSetting.lastVisitedUrl)
  }

  browserWindow.webContents.on(
    'did-navigate',
    (_event, url) => {
      const currentSetting = readUserSetting()
      writeUserSetting({
        ...currentSetting,
        lastVisitedUrl: url
      })
    }
  )
}
