import { BrowserWindow } from 'electron'
import { WindowManager } from '@/window-manager'
import { Model } from '@/utils/constants'
import { TrayContextMenuOptions } from '@/tray-context-menu'

/**
 * 获取可用的浏览器窗口
 */
export const getAvailableBrowserWindow = (
  windowManager: WindowManager,
  getMainBrowserWindow: TrayContextMenuOptions['getMainBrowserWindow']
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
  keyof TrayContextMenuOptions['urls']
> = {
  [Model.ChatGPT]: 'chatgpt',
  [Model.DeepSeek]: 'deepseek',
  [Model.Grok]: 'grok',
  [Model.Gemini]: 'gemini',
  [Model.Qwen]: 'qwen',
  [Model.Doubao]: 'doubao'
}
