import { createInputDialog } from '@/dialogs/input-dialog-shared'
import { createProxyDialogHtml } from '@/dialogs/proxy-input-dialog-template'
import { settingsService } from '@/services/settings-service'
import type { UserSetting } from '@/utils/user-setting'

export const proxyInputDialog =
  createInputDialog<UserSetting>({
    title: 'proxyDialogTitle',
    responseChannel: 'proxy-input-response',
    deleteChannel: 'delete-proxy-history',
    removeHistory: settingsService.removeProxyHistory,
    render: (settings, language) =>
      createProxyDialogHtml({
        language,
        currentProxy: settings.proxy?.trim() ?? '',
        history: settings.proxyHistory ?? []
      })
  })
