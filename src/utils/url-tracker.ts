import { BrowserWindow } from 'electron'

import { settingsService } from '@/services/settings-service'

/**
 * 初始化上次访问的 URL 跟踪
 * @param {BrowserWindow} browserWindow
 * @returns {void}
 */
export const initializeLastVisitedUrlTracking = (
  browserWindow: BrowserWindow
) => {
  const userSetting = settingsService.get()
  if (userSetting.lastVisitedUrl) {
    browserWindow.loadURL(userSetting.lastVisitedUrl)
  }

  browserWindow.webContents.on(
    'did-navigate',
    (_event, url) => {
      settingsService.setLastVisitedUrl(url)
    }
  )
}
