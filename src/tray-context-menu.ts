import {
  BrowserWindow,
  Menu,
  Tray,
  app,
  nativeTheme,
  nativeImage
} from 'electron'
import * as path from 'path'

import { WindowManager } from '@/window-manager'
import { readUserSetting } from '@/utils/user-setting'
import {
  MenuLanguage,
  Model,
  TOOLTIP
} from '@/utils/constants'
import {
  getTrayMenuText,
  TrayMenuMessageKey
} from '@/i18n/tray-menu'

import { createModelSwitchHandler } from './handlers/model-handler'
import { createShortcutHandler } from './handlers/shortcut-handler'
import { createProxyHandler } from './handlers/proxy-handler'
import {
  handleAutoLaunchToggle,
  handleAlwaysOnTopToggle,
  handleMenuLanguageChange,
  handleReload,
  handleQuit
} from './handlers/system-handler'
import { createUpdateHandler } from './handlers/update-handler'

export interface AppTrayOptions {
  /** 窗口管理器实例 */
  windowManager: WindowManager

  /** 各模型的 URL 配置 */
  urls: {
    chatgpt: string
    deepseek: string
    grok: string
    gemini: string
    qwen: string
    doubao: string
  }
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
}

/**
 * 创建和设置应用托盘
 * @param {AppTrayOptions} options - 托盘配置选项
 * @returns {Tray} 返回创建的 Tray 实例
 */
export const setupAppTray = (
  options: AppTrayOptions
): Tray => {
  const appPath = app.getAppPath()

  /**
   * 根据系统主题获取对应的托盘图标路径
   */
  const getTrayIconPath = () => {
    // macOS 上使用 Template 图片，系统会自动处理深浅色适配
    if (process.platform === 'darwin') {
      return path.join(
        appPath,
        'images',
        'gptIconTemplate.png'
      )
    }
    // Windows/Linux 根据系统当前是否为深色模式，返回不同的图标
    // 深色模式使用浅色图片，浅色模式使用深色图片
    return nativeTheme.shouldUseDarkColors
      ? path.join(appPath, 'images', 'gptIconLight.png')
      : path.join(appPath, 'images', 'gptIconDark.png')
  }

  const image = nativeImage.createFromPath(
    getTrayIconPath()
  )
  const tray = new Tray(image)
  tray.setToolTip(TOOLTIP)
  tray.setIgnoreDoubleClickEvents(true)

  // 监听系统主题变化，动态更新托盘图标
  if (process.platform !== 'darwin') {
    nativeTheme.on('updated', () => {
      tray.setImage(
        nativeImage.createFromPath(getTrayIconPath())
      )
    })
  }

  // 为了向下兼容 handlers 中的 options 引用
  const handlerOptions = { ...options, tray }

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
              handlerOptions,
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
              handlerOptions,
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
              handlerOptions,
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
              handlerOptions,
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
              handlerOptions,
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
              handlerOptions,
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
            handlerOptions,
            updateContextMenu
          )
      },
      {
        label: t('setShortcut'),
        click: createShortcutHandler(
          handlerOptions,
          updateContextMenu,
          menuLanguage
        )
      },
      {
        label: t('setProxy'),
        click: createProxyHandler(
          handlerOptions,
          menuLanguage
        )
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
        click: () =>
          handleReload(handlerOptions, menuLanguage)
      },
      {
        label: t('checkForUpdates'),
        click: createUpdateHandler(
          handlerOptions,
          menuLanguage
        )
      },
      {
        label: t('quit'),
        click: () => handleQuit()
      }
    ])

    // Linux 使用 setContextMenu 直接绑定（AppIndicator 不支持 right-click 事件）
    // macOS/Windows 存储菜单供右键事件处理程序使用
    if (process.platform === 'linux') {
      tray.setContextMenu(contextMenu)
    } else {
      tray._contextMenu = contextMenu
    }
  }

  updateContextMenu()

  // 托盘事件处理程序
  tray.on('click', () => {
    options.windowManager.toggleWindow()
  })

  if (process.platform !== 'linux') {
    tray.on('right-click', () => {
      const menu = tray._contextMenu
      if (menu) {
        tray.popUpContextMenu(menu)
      }
    })
  }

  return tray
}
