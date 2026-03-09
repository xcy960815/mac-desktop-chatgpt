import { globalShortcut, ipcMain } from 'electron'
import { WindowManager } from '@/core/window-manager'
import {
  readUserSetting,
  writeUserSetting
} from '@/utils/user-setting'

/**
 * 注册全局快捷键（打开/关闭主窗口与 DevTools）
 * @param {WindowManager} windowManager
 */
export const setupGlobalShortcuts = (
  windowManager: WindowManager
) => {
  const toggleWindow = () => {
    windowManager.toggleWindow()
  }

  // 1. 注册核心显隐快捷键
  const registerToggleShortcut = () => {
    const userSetting = readUserSetting()
    const shortcut =
      userSetting.toggleShortcut || 'CommandOrControl+g'

    const registered = globalShortcut.register(
      shortcut,
      toggleWindow
    )
    if (registered) return

    // 用户快捷键注册失败时回退默认配置
    if (shortcut !== 'CommandOrControl+g') {
      const defaultRegistered = globalShortcut.register(
        'CommandOrControl+g',
        toggleWindow
      )
      if (defaultRegistered) {
        // 由于没有内存状态保持，仅在回退成功时依靠覆盖逻辑（IPC 更新时处理一致）
      }
    }
  }

  // 2. 注册开发者工具控制台快捷键
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

  registerToggleShortcut()
  registerDevToolsShortcut()
}

/**
 * 注册与快捷键相关的 IPC 通信处理器
 * 用于渲染进程发往主进程的快捷键修改请求
 * @param {WindowManager} windowManager - 仅作闭包透传使用
 */
export const setupShortcutIpcHandlers = (
  windowManager: WindowManager
) => {
  const toggleWindow = () => {
    windowManager.toggleWindow()
  }

  ipcMain.handle(
    'set-toggle-shortcut',
    async (_event, shortcut: string) => {
      if (!shortcut || shortcut.trim() === '') {
        return {
          success: false,
          message: '快捷键不能为空'
        }
      }

      const userSetting = readUserSetting()
      const oldShortcut =
        userSetting.toggleShortcut || 'CommandOrControl+g'

      // 取消注册原有快捷键
      globalShortcut.unregister(oldShortcut)

      // 注册新快捷键
      const registered = globalShortcut.register(
        shortcut,
        toggleWindow
      )

      if (registered) {
        writeUserSetting({
          ...userSetting,
          toggleShortcut: shortcut
        })
        return {
          success: true,
          message: '快捷键设置成功'
        }
      }

      // 注册失败时立刻恢复原来的快捷键
      globalShortcut.register(oldShortcut, toggleWindow)
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
