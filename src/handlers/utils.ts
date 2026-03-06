import { BrowserWindow, Tray } from 'electron'
import { WindowManager } from '@/window-manager'
import { Model } from '@/utils/constants'
import { AppTrayOptions } from '@/tray-context-menu'

/**
 * 获取可用的浏览器窗口
 * @param {WindowManager} windowManager - 窗口管理器实例
 * @param {TrayContextMenuOptions['getMainBrowserWindow']} getMainBrowserWindow - 获取主浏览器窗口的函数
 * @returns {BrowserWindow | null} 可用的浏览器窗口或 null
 */
export const getAvailableBrowserWindow = (
  windowManager: WindowManager,
  getMainBrowserWindow: AppTrayOptions['getMainBrowserWindow']
): BrowserWindow | null => {
  const mainBrowserWindow = getMainBrowserWindow()
  if (
    mainBrowserWindow &&
    !mainBrowserWindow.isDestroyed()
  ) {
    return mainBrowserWindow
  }

  const menubarWindow = windowManager.getMainBrowserWindow()
  if (menubarWindow && !menubarWindow.isDestroyed()) {
    return menubarWindow
  }

  return null
}

/**
 * 模型名称到 URL 配置键的映射
 */
export const MODEL_TO_URL_KEY: Record<
  Model,
  keyof AppTrayOptions['urls']
> = {
  [Model.ChatGPT]: 'chatgpt',
  [Model.DeepSeek]: 'deepseek',
  [Model.Grok]: 'grok',
  [Model.Gemini]: 'gemini',
  [Model.Qwen]: 'qwen',
  [Model.Doubao]: 'doubao'
}
