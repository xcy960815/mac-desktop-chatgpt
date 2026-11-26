import { createInputDialog } from '@/dialogs/input-dialog-shared'
import { createShortcutDialogHtml } from '@/dialogs/shortcut-input-dialog-template'
import { settingsService } from '@/services/settings-service'
import { DEFAULT_TOGGLE_SHORTCUT } from '@/utils/constants'
import type { UserSetting } from '@/utils/user-setting'

export const shortcutInputDialog =
  createInputDialog<UserSetting>({
    title: 'shortcutDialogTitle',
    responseChannel: 'shortcut-input-response',
    deleteChannel: 'delete-shortcut-history',
    removeHistory: settingsService.removeShortcutHistory,
    render: (settings, language) =>
      createShortcutDialogHtml({
        language,
        currentShortcut: (
          settings.toggleShortcut || DEFAULT_TOGGLE_SHORTCUT
        ).trim(),
        history: settings.shortcutHistory ?? []
      })
  })
