import { BrowserWindow, Menu, Tray } from 'electron'

import { MenuLanguage, Model } from '@/utils/constants'
import {
  getTrayMenuText,
  TrayMenuMessageKey
} from '@/i18n/tray-menu'
import { UpdateManager } from '@/utils/update-manager'
import { settingsService } from '@/services/settings-service'
import { createTrayActionService } from '@/services/tray-action-service'
import { createProxyHandler } from './handlers/proxy-handler'
import { createShortcutHandler } from './handlers/shortcut-handler'

export interface TrayMenuUrls {
  chatgpt: string
  deepseek: string
  grok: string
  gemini: string
  qwen: string
  doubao: string
}

export interface TrayContextMenuOptions {
  tray: Tray
  isMenubarReady(): boolean
  waitForMenubarReady(timeoutMs?: number): Promise<boolean>
  getBrowserWindow(): BrowserWindow | null
  toggleWindow(): void | Promise<void>
  setAlwaysOnTop(alwaysOnTop: boolean): void
  getCurrentShortcut(): string | null
  setCurrentShortcut(shortcut: string | null): void
  withBrowserWindow<T>(
    task: (win: BrowserWindow) => T | Promise<T>
  ): Promise<T | null>
  updateManager: UpdateManager
}

export interface TrayContextMenuController {
  updateContextMenu(): Promise<void>
  getContextMenu(): Menu | null
}

interface TrayMenuState {
  currentModel: Model
  alwaysOnTop: boolean
  isAutoLaunchEnabled: boolean
  menuLanguage: MenuLanguage
}

interface TrayMenuActions {
  onModelChange(model: Model): () => void
  onAlwaysOnTopToggle(): () => void
  onSetShortcut(): () => Promise<void>
  onSetProxy(): () => Promise<void>
  onAutoLaunchToggle(enabled: boolean): void
  onLanguageChange(language: MenuLanguage): () => void
  onReload(): () => Promise<void>
  onCheckForUpdates(): () => Promise<void>
  onQuit(): () => void
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

const createTrayMenuActions = (
  context: TrayContextMenuOptions,
  menuLanguage: MenuLanguage,
  updateContextMenu: () => void
): TrayMenuActions => {
  const trayActionService = createTrayActionService({
    context,
    menuLanguage,
    updateContextMenu
  })

  return {
    onModelChange: (model: Model) =>
      trayActionService.switchModel(model),
    onAlwaysOnTopToggle: () =>
      trayActionService.toggleAlwaysOnTop(),
    onSetShortcut: () =>
      createShortcutHandler(
        context,
        updateContextMenu,
        menuLanguage
      ),
    onSetProxy: () =>
      createProxyHandler(context, menuLanguage),
    onAutoLaunchToggle: (enabled: boolean) =>
      trayActionService.toggleAutoLaunch(enabled),
    onLanguageChange: (language: MenuLanguage) =>
      trayActionService.changeMenuLanguage(language),
    onReload: () => trayActionService.reloadCurrentModel(),
    onCheckForUpdates: () =>
      trayActionService.checkForUpdates(),
    onQuit: () => trayActionService.quit()
  }
}

/**
 * 设置托盘上下文菜单
 * @param {TrayContextMenuOptions} options - 托盘上下文菜单配置选项
 * @returns {() => void} 返回构建上下文菜单的函数
 */
export const setupTrayContextMenu = (
  options: TrayContextMenuOptions
): TrayContextMenuController => {
  const { tray } = options
  let currentContextMenu: Menu | null = null

  const updateContextMenu = async () => {
    const {
      currentModel,
      alwaysOnTop,
      isAutoLaunchEnabled,
      menuLanguage
    } = getTrayMenuState()
    const t = (key: TrayMenuMessageKey) =>
      getTrayMenuText(key, menuLanguage)
    const actions = createTrayMenuActions(
      options,
      menuLanguage,
      updateContextMenu
    )

    const contextMenu = Menu.buildFromTemplate([
      {
        label: t('model'),
        submenu: [
          {
            label: Model.ChatGPT,
            type: 'radio',
            checked: currentModel === Model.ChatGPT,
            click: actions.onModelChange(Model.ChatGPT)
          },
          {
            label: Model.Grok,
            type: 'radio',
            checked: currentModel === Model.Grok,
            click: actions.onModelChange(Model.Grok)
          },
          {
            label: Model.Gemini,
            type: 'radio',
            checked: currentModel === Model.Gemini,
            click: actions.onModelChange(Model.Gemini)
          },
          {
            label: Model.DeepSeek,
            type: 'radio',
            checked: currentModel === Model.DeepSeek,
            click: actions.onModelChange(Model.DeepSeek)
          },
          {
            label: Model.Qwen,
            type: 'radio',
            checked: currentModel === Model.Qwen,
            click: actions.onModelChange(Model.Qwen)
          },
          {
            label: Model.Doubao,
            type: 'radio',
            checked: currentModel === Model.Doubao,
            click: actions.onModelChange(Model.Doubao)
          }
        ]
      },
      { type: 'separator' },
      {
        label: t('windowAlwaysOnTop'),
        type: 'checkbox',
        checked: alwaysOnTop,
        click: actions.onAlwaysOnTopToggle()
      },
      {
        label: t('setShortcut'),
        click: actions.onSetShortcut()
      },
      {
        label: t('setProxy'),
        click: actions.onSetProxy()
      },
      {
        label: t('autoLaunchOnStartup'),
        type: 'checkbox',
        checked: isAutoLaunchEnabled,
        click: (menuItem) =>
          actions.onAutoLaunchToggle(
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
            click: actions.onLanguageChange(
              MenuLanguage.English
            )
          },
          {
            label: t('languageChinese'),
            type: 'radio',
            checked: menuLanguage === MenuLanguage.Chinese,
            click: actions.onLanguageChange(
              MenuLanguage.Chinese
            )
          }
        ]
      },
      { type: 'separator' },
      {
        label: t('reload'),
        click: actions.onReload()
      },
      {
        label: t('checkForUpdates'),
        click: actions.onCheckForUpdates()
      },
      {
        label: t('quit'),
        click: actions.onQuit()
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
