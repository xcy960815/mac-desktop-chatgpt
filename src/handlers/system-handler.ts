import { app, BrowserWindow, Tray, dialog } from 'electron'
import {
  readUserSetting,
  writeUserSetting,
  resetUserUrls
} from '@/utils/user-setting'
import { AppTrayOptions } from '@/core/tray-context-menu'
import { getTrayMenuText } from '@/i18n/tray-menu'
import { getAppIcon } from '@/utils/common'
import {
  Model,
  ModelUrl,
  MenuLanguage
} from '@/utils/constants'
import { getAvailableBrowserWindow } from './utils'

/**
 * 处理开机自启切换
 * @param {boolean} enabled - 是否启用开机自启（true 代表启用，false 代表禁用）
 * @param {MenuLanguage} menuLanguage - 当前菜单语言
 * @param {() => void} updateContextMenu - 更新上下文菜单的回调函数
 * @returns {void}
 */
export const handleAutoLaunchToggle = (
  enabled: boolean,
  menuLanguage: MenuLanguage,
  updateContextMenu: () => void
) => {
  try {
    app.setLoginItemSettings({
      openAtLogin: enabled,
      openAsHidden: true
    })
    const userSetting = readUserSetting()
    writeUserSetting({
      ...userSetting,
      autoLaunchOnStartup: enabled
    })
    updateContextMenu()
  } catch (error) {
    dialog.showMessageBox({
      icon: getAppIcon(),
      type: 'error',
      title: getTrayMenuText(
        'autoLaunchErrorTitle',
        menuLanguage
      ),
      message: getTrayMenuText(
        'autoLaunchErrorMessage',
        menuLanguage
      ),
      buttons: [getTrayMenuText('confirm', menuLanguage)]
    })
  }
}

/**
 * 处理窗口置顶切换
 * @param {TrayContextMenuOptions} options - 托盘上下文菜单配置选项
 * @param {() => void} updateContextMenu - 更新上下文菜单的回调函数
 * @returns {void}
 */
export const handleAlwaysOnTopToggle = (
  options: AppTrayOptions & { tray: Tray },
  updateContextMenu: () => void
) => {
  const current = readUserSetting()
  const newValue = !current.alwaysOnTop
  writeUserSetting({
    ...current,
    alwaysOnTop: newValue
  })
  options.windowManager.setAlwaysOnTop(newValue)
  updateContextMenu()
}

/**
 * 处理菜单语言设定
 * @param {MenuLanguage} language - 目标菜单语言类型
 * @param {() => void} updateContextMenu - 更新上下文菜单的回调函数
 * @returns {void}
 */
export const handleMenuLanguageChange = (
  language: MenuLanguage,
  updateContextMenu: () => void
) => {
  const latestSetting = readUserSetting()
  if (latestSetting.menuLanguage === language) {
    return
  }
  writeUserSetting({
    ...latestSetting,
    menuLanguage: language
  })
  updateContextMenu()
}

/**
 * 处理页面重新加载
 * @param {TrayContextMenuOptions} options - 托盘上下文菜单配置选项
 * @param {MenuLanguage} menuLanguage - 当前菜单语言
 * @returns {Promise<void>} 重新加载 Promise
 */
export const handleReload = async (
  options: AppTrayOptions & { tray: Tray },
  menuLanguage: MenuLanguage
) => {
  const newUserSetting = resetUserUrls()
  await options.windowManager.withBrowserWindow((win) => {
    if (win.isDestroyed()) {
      throw new Error(
        getTrayMenuText(
          'windowDestroyedError',
          menuLanguage
        )
      )
    }

    const currentModel = newUserSetting.model

    const modelUrlMap: Record<Model, string> = {
      [Model.ChatGPT]: ModelUrl.ChatGPT,
      [Model.DeepSeek]: ModelUrl.DeepSeek,
      [Model.Grok]: ModelUrl.Grok,
      [Model.Gemini]: ModelUrl.Gemini,
      [Model.Qwen]: ModelUrl.Qwen,
      [Model.Doubao]: ModelUrl.Doubao
    }

    const defaultUrl =
      newUserSetting.urls?.[currentModel] ||
      modelUrlMap[currentModel]

    win.webContents.send(
      'model-changed',
      currentModel,
      defaultUrl
    )
  })
}

/**
 * 处理退出应用
 * @returns {void}
 */
export const handleQuit = () => {
  resetUserUrls()
  app.quit()
}
