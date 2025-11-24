import { BrowserWindow, globalShortcut, ipcMain } from 'electron'

import { ElectronMenubar } from './electron-menubar'
import {
  readUserSetting,
  writeUserSetting
} from './utils/user-setting'

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
   * @param {string | null} shortcut 
   * @returns {void}
   */
  setCurrentShortcut(shortcut: string | null): void
}

/**
 * 快捷键管理器选项
 * @interface ShortcutManagerOptions
 */
interface ShortcutManagerOptions {
  browserWindow: BrowserWindow
  electronMenubar: ElectronMenubar
}

/**
 * 创建快捷键管理器
 * @param {ShortcutManagerOptions} options 
 * @returns {ShortcutManager}
 */
export const createShortcutManager = ({
  browserWindow,
  electronMenubar
}: ShortcutManagerOptions): ShortcutManager => {
  let currentShortcut: string | null = null

  /**
   * 打开/关闭窗口
   * @returns {void}
   */
  const toggleWindow = () => {
    const menubarVisible = browserWindow.isVisible()
    if (menubarVisible) {
      electronMenubar.hideWindow()
    } else {
      electronMenubar.showWindow()
      if (process.platform === 'darwin') {
        electronMenubar.app.show()
      }
      electronMenubar.app.focus()
    }
  }

  /**
   * 注册快捷键
   * @param {string} shortcut 
   * @returns {boolean}
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
    const shortcut = userSetting.toggleShortcut || 'CommandOrControl+g'

    const registered = registerShortcut(shortcut)
    if (registered) {
      currentShortcut = shortcut
      console.log(`✅ 快捷键注册成功: ${shortcut}`)
      return
    }

    console.error(`❌ 快捷键注册失败: ${shortcut}`)

    if (shortcut === 'CommandOrControl+g') {
      return
    }

    const defaultRegistered = registerShortcut('CommandOrControl+g')
    if (defaultRegistered) {
      currentShortcut = 'CommandOrControl+g'
      console.log(`✅ 使用默认快捷键: CommandOrControl+g`)
    }
  }

  /**
   * 注册 IPC 处理程序
   * @returns {void}
   */
  const registerIpcHandlers = () => {
    ipcMain.handle('set-toggle-shortcut', async (_event, shortcut: string) => {
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
        message: '快捷键已被占用或格式不正确，请尝试其他快捷键'
      }
    })

    ipcMain.handle('get-toggle-shortcut', () => {
      const userSetting = readUserSetting()
      return userSetting.toggleShortcut || 'CommandOrControl+g'
    })
  }

  return {
    registerToggleShortcut,
    registerIpcHandlers,
    getCurrentShortcut: () => currentShortcut,
    setCurrentShortcut: (shortcut) => {
      currentShortcut = shortcut
    }
  }
}

