import { globalShortcut, ipcMain } from 'electron'
import { settingsService } from '@/services/settings-service'
import { DEFAULT_TOGGLE_SHORTCUT } from '@/utils/constants'

export type ShortcutManager = ReturnType<
  typeof createShortcutManager
>

export const createShortcutManager = (
  toggleWindow: () => void
) => {
  let registered: string | null = null
  let editing = false

  function register(shortcut: string): boolean {
    try {
      if (globalShortcut.register(shortcut, toggleWindow)) {
        registered = shortcut
        return true
      }
    } catch {
      // Electron throws for malformed accelerators and returns false for conflicts.
    }
    return false
  }

  function unregister() {
    if (registered) globalShortcut.unregister(registered)
    registered = null
  }

  function restorePrevious(previous: string | null) {
    if (!registered && previous && !register(previous)) {
      throw new Error(`无法恢复快捷键 ${previous}`)
    }
  }

  function registerToggleShortcut() {
    unregister()
    const saved = settingsService.getToggleShortcut()
    if (
      !register(saved) &&
      saved !== DEFAULT_TOGGLE_SHORTCUT
    ) {
      register(DEFAULT_TOGGLE_SHORTCUT)
    }
  }

  // null cancels the edit. An empty string requests a confirmed reset.
  async function editToggleShortcut(
    choose: () => Promise<string | null>,
    remember = true
  ) {
    if (editing) return null
    editing = true
    const previous = registered
    try {
      unregister()
      const input = await choose()
      if (input === null) return null
      const reset = !input.trim()
      const shortcut = reset
        ? DEFAULT_TOGGLE_SHORTCUT
        : input.trim()
      const success = register(shortcut)
      if (success) {
        try {
          settingsService.saveShortcut(
            shortcut,
            remember && !reset
          )
        } catch (error) {
          unregister()
          throw error
        }
      }
      return { success, shortcut, reset }
    } finally {
      editing = false
      restorePrevious(previous)
    }
  }

  function registerIpcHandlers() {
    ipcMain.handle(
      'set-toggle-shortcut',
      async (_event, shortcut: string) => {
        if (
          typeof shortcut !== 'string' ||
          !shortcut.trim()
        ) {
          return {
            success: false,
            message: '快捷键不能为空'
          }
        }
        if (editing)
          return {
            success: false,
            message: '正在编辑快捷键'
          }
        try {
          const result = await editToggleShortcut(
            async () => shortcut,
            false
          )
          const success = !!result?.success
          return {
            success,
            message: success
              ? '快捷键设置成功'
              : '快捷键已被占用或格式不正确，请尝试其他快捷键'
          }
        } catch (error) {
          return { success: false, message: String(error) }
        }
      }
    )
    ipcMain.handle(
      'get-toggle-shortcut',
      settingsService.getToggleShortcut
    )
  }

  return {
    registerToggleShortcut,
    registerIpcHandlers,
    editToggleShortcut
  }
}
