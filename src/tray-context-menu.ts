import { Menu, Tray } from 'electron'

import { MenuLanguage, Model } from '@/utils/constants'
import {
  getTrayMenuText,
  TrayMenuMessageKey
} from '@/i18n/tray-menu'
import type { ShortcutManager } from '@/shortcut-manager'
import { settingsService } from '@/services/settings-service'
import {
  createTrayActionService,
  type TrayActionContext
} from '@/services/tray-action-service'
import type { MenubarReadiness } from './handlers/utils'
import { editProxy } from './handlers/proxy-handler'
import { editShortcut } from './handlers/shortcut-handler'

export interface TrayContextMenuOptions
  extends TrayActionContext, MenubarReadiness {
  tray: Tray
  shortcutManager: ShortcutManager
}

export interface TrayContextMenuController {
  updateContextMenu(): void
  getContextMenu(): Menu | null
}

interface TrayMenuState {
  currentModel: Model
  alwaysOnTop: boolean
  isAutoLaunchEnabled: boolean
  menuLanguage: MenuLanguage
}

const getTrayMenuState = (): TrayMenuState => {
  const userSetting = settingsService.get()

  return {
    currentModel: userSetting.model || Model.ChatGPT,
    alwaysOnTop: !!userSetting.alwaysOnTop,
    isAutoLaunchEnabled: !!userSetting.autoLaunchOnStartup,
    menuLanguage:
      userSetting.menuLanguage ?? MenuLanguage.Chinese
  }
}

export const setupTrayContextMenu = (
  options: TrayContextMenuOptions
): TrayContextMenuController => {
  const { tray } = options
  let currentContextMenu: Menu | null = null

  const updateContextMenu = () => {
    const {
      currentModel,
      alwaysOnTop,
      isAutoLaunchEnabled,
      menuLanguage
    } = getTrayMenuState()
    const t = (key: TrayMenuMessageKey) =>
      getTrayMenuText(key, menuLanguage)
    const actions = createTrayActionService({
      context: options,
      menuLanguage,
      updateContextMenu
    })

    const contextMenu = Menu.buildFromTemplate([
      {
        label: t('model'),
        submenu: Object.values(Model).map((model) => ({
          label: model,
          type: 'radio' as const,
          checked: currentModel === model,
          click: () => actions.switchModel(model)
        }))
      },
      { type: 'separator' },
      {
        label: t('windowAlwaysOnTop'),
        type: 'checkbox',
        checked: alwaysOnTop,
        click: actions.toggleAlwaysOnTop
      },
      {
        label: t('setShortcut'),
        click: () => editShortcut(options, menuLanguage)
      },
      {
        label: t('setProxy'),
        click: () => editProxy(options, menuLanguage)
      },
      {
        label: t('autoLaunchOnStartup'),
        type: 'checkbox',
        checked: isAutoLaunchEnabled,
        click: (menuItem) =>
          actions.toggleAutoLaunch(
            Boolean(menuItem.checked)
          )
      },
      {
        label: t('language'),
        submenu: [
          {
            label: t('languageEnglish'),
            type: 'radio',
            checked: menuLanguage === MenuLanguage.English,
            click: () =>
              actions.changeMenuLanguage(
                MenuLanguage.English
              )
          },
          {
            label: t('languageChinese'),
            type: 'radio',
            checked: menuLanguage === MenuLanguage.Chinese,
            click: () =>
              actions.changeMenuLanguage(
                MenuLanguage.Chinese
              )
          }
        ]
      },
      { type: 'separator' },
      {
        label: t('reload'),
        click: actions.reloadCurrentModel
      },
      {
        label: t('checkForUpdates'),
        click: actions.checkForUpdates
      },
      {
        label: t('quit'),
        click: actions.quit
      }
    ])

    currentContextMenu = contextMenu

    // Linux 使用 setContextMenu 直接绑定（AppIndicator 不支持 right-click 事件）
    // macOS/Windows 通过显式 getter 暴露给右键事件处理程序
    if (process.platform === 'linux') {
      tray.setContextMenu(contextMenu)
    }
  }

  updateContextMenu()

  return {
    updateContextMenu,
    getContextMenu: () => currentContextMenu
  }
}
