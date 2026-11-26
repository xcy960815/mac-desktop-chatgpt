import { app, session } from 'electron'
import type { MenubarReadiness } from './utils'
import { proxyInputDialog } from '@/proxy-input-dialog'
import {
  getTrayMenuText,
  type TrayMenuMessageKey
} from '@/i18n/tray-menu'
import type { MenuLanguage } from '@/utils/constants'
import { settingsService } from '@/services/settings-service'
import {
  ensureMenubarReady,
  showSettingsMessage
} from './utils'

const PROXY_ADDRESS =
  /^(?:(?:http|https|socks|socks4|socks5):\/\/)?(?:[\w-]+\.)+[\w-]+(?::\d+)?$/
let editing = false

export async function editProxy(
  options: MenubarReadiness,
  language: MenuLanguage
) {
  if (
    !(await ensureMenubarReady(options, language)) ||
    proxyInputDialog.focusIfOpen() ||
    editing
  )
    return
  editing = true
  const t = (key: TrayMenuMessageKey) =>
    getTrayMenuText(key, language)
  try {
    const settings = settingsService.get()
    const input = await proxyInputDialog.show(
      language,
      settings
    )
    if (input === null) return
    const proxy = input.trim()
    if (proxy && !PROXY_ADDRESS.test(proxy)) {
      await showSettingsMessage(
        language,
        'error',
        'formatErrorTitle',
        t('proxyFormatErrorMessage')
      )
      return
    }

    await session.defaultSession.setProxy({
      proxyRules: proxy
    })
    try {
      settingsService.saveProxy(proxy)
    } catch (error) {
      await session.defaultSession.setProxy({
        proxyRules: settings.proxy || ''
      })
      throw error
    }
    if (proxy)
      app.commandLine.appendSwitch('proxy-server', proxy)
    else app.commandLine.removeSwitch('proxy-server')
    await showSettingsMessage(
      language,
      'info',
      'settingSuccessTitle',
      t('proxySavedMessage')
    )
  } catch (error) {
    await showSettingsMessage(
      language,
      'error',
      'errorTitle',
      t('proxySetErrorMessagePrefix') + String(error)
    )
  } finally {
    editing = false
  }
}
