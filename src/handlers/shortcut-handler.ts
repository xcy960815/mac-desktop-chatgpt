import { dialog } from 'electron'
import type { TrayContextMenuOptions } from '@/tray-context-menu'
import { shortcutInputDialog } from '@/shortcut-input-dialog'
import {
  getTrayMenuText,
  type TrayMenuMessageKey
} from '@/i18n/tray-menu'
import type { MenuLanguage } from '@/utils/constants'
import {
  ensureMenubarReady,
  showSettingsMessage
} from './utils'
import { getAppIcon } from '@/utils/common'
import { settingsService } from '@/services/settings-service'

export async function editShortcut(
  options: TrayContextMenuOptions,
  language: MenuLanguage
) {
  const t = (key: TrayMenuMessageKey) =>
    getTrayMenuText(key, language)
  try {
    if (
      !(await ensureMenubarReady(options, language)) ||
      shortcutInputDialog.focusIfOpen()
    )
      return
    const result =
      await options.shortcutManager.editToggleShortcut(
        async () => {
          const input = await shortcutInputDialog.show(
            language,
            settingsService.get()
          )
          if (input === null || input.trim()) return input

          const { response } = await dialog.showMessageBox({
            icon: getAppIcon(),
            type: 'question',
            title: t('shortcutResetConfirmTitle'),
            message: t('shortcutResetConfirmMessage'),
            buttons: [t('confirm'), t('cancel')],
            cancelId: 1
          })
          return response === 0 ? '' : null
        }
      )
    if (!result) return
    const { success, shortcut, reset } = result
    if (success) {
      const message = reset
        ? t('shortcutResetSuccessMessage')
        : t('shortcutSetSuccessMessagePrefix') + shortcut
      await showSettingsMessage(
        language,
        'info',
        'settingSuccessTitle',
        message
      )
    } else {
      await showSettingsMessage(
        language,
        'error',
        'settingFailedTitle',
        t(
          reset
            ? 'shortcutResetErrorMessage'
            : 'shortcutConflictMessage'
        )
      )
    }
  } catch (error) {
    await showSettingsMessage(
      language,
      'error',
      'errorTitle',
      t('shortcutSetErrorMessagePrefix') + String(error)
    )
  }
}
