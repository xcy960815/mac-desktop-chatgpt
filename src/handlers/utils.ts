import { BrowserWindow, dialog } from 'electron'
import {
  getTrayMenuText,
  type TrayMenuMessageKey
} from '@/i18n/tray-menu'
import { MenuLanguage } from '@/utils/constants'
import { getAppIcon } from '@/utils/common'

const MENUBAR_READY_TIMEOUT_MS = 2000

/**
 * 获取可用的浏览器窗口
 * @returns {BrowserWindow | null} 可用的浏览器窗口或 null
 */
export const getAvailableBrowserWindow = (
  getBrowserWindow: () => BrowserWindow | null
): BrowserWindow | null => {
  const browserWindow = getBrowserWindow()
  if (browserWindow && !browserWindow.isDestroyed()) {
    return browserWindow
  }

  return null
}

export interface MenubarReadiness {
  isMenubarReady(): boolean
  waitForMenubarReady(timeoutMs?: number): Promise<boolean>
}

export const ensureMenubarReady = async (
  options: MenubarReadiness,
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

  await showSettingsMessage(
    menuLanguage,
    'error',
    'errorTitle',
    getTrayMenuText('appNotReadyMessage', menuLanguage)
  )
  return false
}

export function showSettingsMessage(
  language: MenuLanguage,
  type: 'error' | 'info',
  title: TrayMenuMessageKey,
  message: string
) {
  return dialog.showMessageBox({
    type,
    title: getTrayMenuText(title, language),
    message,
    icon: getAppIcon(),
    buttons: [getTrayMenuText('confirm', language)]
  })
}
