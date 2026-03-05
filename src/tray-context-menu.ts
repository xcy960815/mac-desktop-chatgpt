import { BrowserWindow, Menu, Tray } from 'electron'
import { WindowManager } from '@/window-manager'
import { readUserSetting } from '@/utils/user-setting'
import { MenuLanguage, Model } from '@/utils/constants'
import {
  getTrayMenuText,
  TrayMenuMessageKey
} from '@/i18n/tray-menu'
import { UpdateManager } from '@/utils/update-manager'

import { createModelSwitchHandler } from './handlers/model-handler'
import { createShortcutHandler } from './handlers/shortcut-handler'
import { createProxyHandler } from './handlers/proxy-handler'
import {
  handleAutoLaunchToggle,
  handleAlwaysOnTopToggle,
  handleMenuLanguageChange,
  handleReload,
  handleCheckForUpdates,
  handleQuit
} from './handlers/system-handler'

/**
 * 带有上下文菜单的 Tray 接口
 */
interface TrayWithContextMenu extends Tray {
  _contextMenu?: Menu
}

export interface TrayContextMenuOptions {
  /** 系统托盘实例 */
  tray: Tray
  /** 窗口管理器实例 */
  windowManager: WindowManager
  /** 菜单实例 */
  menu: Menu
  /** 各模型的 URL 配置 */
  urls: {
    chatgpt: string
    deepseek: string
    grok: string
    gemini: string
    qwen: string
    doubao: string
  }
  /** 检查菜单栏是否已就绪 */
  isMenubarReady(): boolean
  /** 获取主浏览器窗口 */
  getMainBrowserWindow(): BrowserWindow | null
  /** 设置主浏览器窗口 */
  setMainBrowserWindow(window: BrowserWindow | null): void
  /** 获取当前快捷键 */
  getCurrentShortcut(): string | null
  /** 设置当前快捷键 */
  setCurrentShortcut(shortcut: string | null): void
  /** 在浏览器窗口上执行任务 */
  withBrowserWindow<T>(
    task: (win: BrowserWindow) => T | Promise<T>
  ): Promise<T | null>
  /** 更新管理器 */
  updateManager: UpdateManager
}

/**
 * 设置托盘上下文菜单
 * @param {TrayContextMenuOptions} options - 托盘上下文菜单配置选项
 * @returns {() => void} 返回构建上下文菜单的函数
 */
export const setupTrayContextMenu = (
  options: TrayContextMenuOptions
) => {
  const { tray } = options

  const updateContextMenu = async () => {
    const userSetting = readUserSetting()
    const currentModel = userSetting.model || Model.ChatGPT
    const isChatGPT = currentModel === Model.ChatGPT
    const isDeepSeek = currentModel === Model.DeepSeek
    const isGrok = currentModel === Model.Grok
    const isGemini = currentModel === Model.Gemini
    const isQwen = currentModel === Model.Qwen
    const isDoubao = currentModel === Model.Doubao

    const alwaysOnTop = !!userSetting.alwaysOnTop
    const isAutoLaunchEnabled =
      !!userSetting.autoLaunchOnStartup

    const menuLanguage =
      userSetting.menuLanguage ?? MenuLanguage.Chinese
    const t = (key: TrayMenuMessageKey) =>
      getTrayMenuText(key, menuLanguage)

    const contextMenu = Menu.buildFromTemplate([
      {
        label: t('model'),
        submenu: [
          {
            label: Model.ChatGPT,
            type: 'radio',
            checked: isChatGPT,
            click: createModelSwitchHandler(
              Model.ChatGPT,
              options,
              updateContextMenu,
              options.urls
            )
          },
          {
            label: Model.DeepSeek,
            type: 'radio',
            checked: isDeepSeek,
            click: createModelSwitchHandler(
              Model.DeepSeek,
              options,
              updateContextMenu,
              options.urls
            )
          },
          {
            label: Model.Grok,
            type: 'radio',
            checked: isGrok,
            click: createModelSwitchHandler(
              Model.Grok,
              options,
              updateContextMenu,
              options.urls
            )
          },
          {
            label: Model.Gemini,
            type: 'radio',
            checked: isGemini,
            click: createModelSwitchHandler(
              Model.Gemini,
              options,
              updateContextMenu,
              options.urls
            )
          },
          {
            label: Model.Qwen,
            type: 'radio',
            checked: isQwen,
            click: createModelSwitchHandler(
              Model.Qwen,
              options,
              updateContextMenu,
              options.urls
            )
          },
          {
            label: Model.Doubao,
            type: 'radio',
            checked: isDoubao,
            click: createModelSwitchHandler(
              Model.Doubao,
              options,
              updateContextMenu,
              options.urls
            )
          }
        ]
      },
      { type: 'separator' },
      {
        label: t('windowAlwaysOnTop'),
        type: 'checkbox',
        checked: alwaysOnTop,
        click: () =>
          handleAlwaysOnTopToggle(
            options,
            updateContextMenu
          )
      },
      {
        label: t('setShortcut'),
        click: createShortcutHandler(
          options,
          updateContextMenu,
          menuLanguage
        )
      },
      {
        label: t('setProxy'),
        click: createProxyHandler(options, menuLanguage)
      },
      {
        label: t('autoLaunchOnStartup'),
        type: 'checkbox',
        checked: isAutoLaunchEnabled,
        click: (menuItem) =>
          handleAutoLaunchToggle(
            Boolean(menuItem.checked),
            menuLanguage,
            updateContextMenu
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
              handleMenuLanguageChange(
                MenuLanguage.English,
                updateContextMenu
              )
          },
          {
            label: t('languageChinese'),
            type: 'radio',
            checked: menuLanguage === MenuLanguage.Chinese,
            click: () =>
              handleMenuLanguageChange(
                MenuLanguage.Chinese,
                updateContextMenu
              )
          }
        ]
      },
      { type: 'separator' },
      {
        label: t('reload'),
        click: () => handleReload(options, menuLanguage)
      },
      {
        label: t('checkForUpdates'),
        click: () => handleCheckForUpdates(options)
      },
      {
        label: t('quit'),
        click: () => handleQuit()
      }
    ])

    // 存储上下文菜单，供右键事件处理程序使用
    ;(tray as unknown as TrayWithContextMenu)._contextMenu =
      contextMenu
  }

  updateContextMenu()

  return updateContextMenu
}
