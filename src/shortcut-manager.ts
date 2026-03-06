import { globalShortcut, ipcMain } from 'electron'

import { WindowManager } from '@/window-manager'
import {
  readUserSetting,
  writeUserSetting
} from '@/utils/user-setting'

/**
 * 快捷键管理器接口
 * @interface ShortcutManager
 */
export interface ShortcutManager {
  /**
   * 注册打开/关闭窗口的快捷键
   * @returns {void}
   */
  registerToggleShortcut(): void
  /**
   * 注册 IPC 处理程序
   * @returns {void}
   */
  registerIpcHandlers(): void
  /**
   * 获取当前的快捷键
   * @returns {string | null}
   */
  getCurrentShortcut(): string | null
  /**
   * 设置当前的快捷键
   * @param {string | null} shortcut - 快捷键字符串，如果为 null 则清除当前快捷键
   * @returns {void}
   */
  setCurrentShortcut(shortcut: string | null): void
  /**
   * 注册 DevTools 快捷键
   * @returns {void}
   */
  registerDevToolsShortcut(): void
}

/**
 * 快捷键管理器选项
 * @interface ShortcutManagerOptions
 */
interface ShortcutManagerOptions {
  /** 窗口管理器实例 */
  windowManager: WindowManager
}

/**
 * 创建快捷键管理器
 * @param {ShortcutManagerOptions} options - 快捷键管理器配置选项
 * @param {WindowManager} options.windowManager - 窗口管理器实例
 * @returns {ShortcutManager} 快捷键管理器实例
 */
export const createShortcutManager = ({
  windowManager
}: ShortcutManagerOptions): ShortcutManager => {
  let currentShortcut: string | null = null

  /**
   * 打开/关闭窗口
   * @returns {void}
   */
  const toggleWindow = () => {
    windowManager.toggleWindow()
  }

  /**
   * 注册快捷键
   * @param {string} shortcut - 快捷键字符串
   * @returns {boolean} 注册是否成功
   */
  const registerShortcut = (shortcut: string): boolean =>
    globalShortcut.register(shortcut, toggleWindow)

  /**
   * 注册打开/关闭窗口的快捷键
   * @returns {void}
   */
  const registerToggleShortcut = () => {
    if (currentShortcut) {
      globalShortcut.unregister(currentShortcut)
    }

    const userSetting = readUserSetting()
    const shortcut =
      userSetting.toggleShortcut || 'CommandOrControl+g'

    const registered = registerShortcut(shortcut)
    if (registered) {
      currentShortcut = shortcut
      return
    }

    if (shortcut === 'CommandOrControl+g') {
      return
    }

    const defaultRegistered = registerShortcut(
      'CommandOrControl+g'
    )
    if (defaultRegistered) {
      currentShortcut = 'CommandOrControl+g'
    }
  }

  /**
   * 注册 IPC 处理程序
   * @returns {void}
   */
  const registerIpcHandlers = () => {
    ipcMain.handle(
      'set-toggle-shortcut',
      async (_event, shortcut: string) => {
        if (!shortcut || shortcut.trim() === '') {
          return {
            success: false,
            message: '快捷键不能为空'
          }
        }

        if (currentShortcut) {
          globalShortcut.unregister(currentShortcut)
        }

        const registered = registerShortcut(shortcut)

        if (registered) {
          const userSetting = readUserSetting()
          writeUserSetting({
            ...userSetting,
            toggleShortcut: shortcut
          })
          currentShortcut = shortcut
          return {
            success: true,
            message: '快捷键设置成功'
          }
        }

        if (currentShortcut) {
          registerShortcut(currentShortcut)
        }

        return {
          success: false,
          message:
            '快捷键已被占用或格式不正确，请尝试其他快捷键'
        }
      }
    )

    ipcMain.handle('get-toggle-shortcut', () => {
      const userSetting = readUserSetting()
      return (
        userSetting.toggleShortcut || 'CommandOrControl+g'
      )
    })
  }

  /**
   * 注册 DevTools 快捷键
   * @returns {void}
   */
  const registerDevToolsShortcut = () => {
    globalShortcut.register(
      'CommandOrControl+Shift+I',
      () => {
        const browserWindow =
          windowManager.getMainBrowserWindow()
        if (browserWindow && !browserWindow.isDestroyed()) {
          browserWindow.webContents.toggleDevTools()
        }
      }
    )
  }

  return {
    registerToggleShortcut,
    registerIpcHandlers,
    getCurrentShortcut: () => currentShortcut,
    setCurrentShortcut: (shortcut) => {
      currentShortcut = shortcut
    },
    registerDevToolsShortcut
  }
}
