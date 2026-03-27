import { BrowserWindow, dialog } from 'electron'
import { TrayContextMenuOptions } from '@/tray-context-menu'
import { getTrayMenuText } from '@/i18n/tray-menu'
import { MenuLanguage } from '@/utils/constants'
import { getAppIcon } from '@/utils/common'

const MENUBAR_READY_TIMEOUT_MS = 2000

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

export const ensureMenubarReady = async (
  options: TrayContextMenuOptions,
  menuLanguage: MenuLanguage
): Promise<boolean> => {
  if (options.isMenubarReady()) {
    return true
  }

  const ready = await options.waitForMenubarReady(
    MENUBAR_READY_TIMEOUT_MS
  )

  if (ready) {
    return true
  }

  dialog.showMessageBox({
    icon: getAppIcon(),
    type: 'error',
    title: getTrayMenuText('errorTitle', menuLanguage),
    message: getTrayMenuText(
      'appNotReadyMessage',
      menuLanguage
    ),
    buttons: [getTrayMenuText('confirm', menuLanguage)]
  })

  return false
}
