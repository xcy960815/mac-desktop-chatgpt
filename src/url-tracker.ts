import { BrowserWindow } from 'electron'

import {
  readUserSetting,
  writeUserSetting
} from './utils/user-setting'

export const initializeLastVisitedUrlTracking = (
  browserWindow: BrowserWindow
) => {
  const userSetting = readUserSetting()
  if (userSetting.lastVisitedUrl) {
    browserWindow.loadURL(userSetting.lastVisitedUrl)
  }

  browserWindow.webContents.on('did-navigate', (_event, url) => {
    const currentSetting = readUserSetting()
    writeUserSetting({
      ...currentSetting,
      lastVisitedUrl: url
    })
  })
}

