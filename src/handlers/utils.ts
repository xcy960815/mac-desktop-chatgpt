import { BrowserWindow } from 'electron'
import { TrayContextMenuOptions } from '@/tray-context-menu'

/**
 * 获取可用的浏览器窗口
 * @param {TrayContextMenuOptions['getBrowserWindow']} getBrowserWindow - 获取主浏览器窗口的函数
 * @returns {BrowserWindow | null} 可用的浏览器窗口或 null
 */
export const getAvailableBrowserWindow = (
  getBrowserWindow: TrayContextMenuOptions['getBrowserWindow']
): BrowserWindow | null => {
  const browserWindow = getBrowserWindow()
  if (browserWindow && !browserWindow.isDestroyed()) {
    return browserWindow
  }

  return null
}
