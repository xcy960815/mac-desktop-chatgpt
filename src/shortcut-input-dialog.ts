import { BrowserWindow } from 'electron'

import { MenuLanguage } from '@/utils/constants'
import { getTrayMenuText } from '@/i18n/tray-menu'
import { settingsService } from '@/services/settings-service'
import {
  attachDialogFocusRestoreOnClose,
  bindDialogIpc,
  closeDialogWindowSafely,
  createInputDialogWindow,
  createPendingDialogPromise,
  loadDialogHtml,
  showDialogWindow
} from '@/dialogs/input-dialog-shared'
import { createShortcutDialogHtml } from '@/dialogs/shortcut-input-dialog-template'

let activeDialogWindow: BrowserWindow | null = null

/**
 * 显示快捷键输入对话框
 * @param {BrowserWindow} parentWindow - 父窗口实例
 * @param {string} currentShortcut - 当前快捷键字符串
 * @returns {Promise<string | null>} 返回用户输入的快捷键字符串，如果取消则返回 null
 */
export function showShortcutInputDialog(
  parentWindow: BrowserWindow | null,
  currentShortcut: string,
  language: MenuLanguage
): Promise<string | null> {
  // 如果窗口已存在，直接激活并返回（这里 Promise 处于未决状态直到窗口实际关闭，或者我们可以直接 focus 它）
  if (
    activeDialogWindow &&
    !activeDialogWindow.isDestroyed()
  ) {
    if (activeDialogWindow.isMinimized())
      activeDialogWindow.restore()
    activeDialogWindow.focus()
    return createPendingDialogPromise()
  }

  return new Promise((resolve) => {
    const inputWindow = createInputDialogWindow({
      parentWindow,
      title: getTrayMenuText(
        'shortcutDialogTitle',
        language
      )
    })

    activeDialogWindow = inputWindow
    loadDialogHtml(
      inputWindow,
      createShortcutDialogHtml({
        currentShortcut: (currentShortcut ?? '').trim(),
        history: settingsService.getShortcutHistory(),
        language
      })
    )

    const CHANNEL = 'shortcut-input-response'
    const DELETE_CHANNEL = 'delete-shortcut-history'
    let isResolved = false

    const finalize = (value: string | null) => {
      if (isResolved) {
        return
      }
      isResolved = true
      cleanupIpcListener()

      resolve(value)
    }

    const cleanupIpcListener = bindDialogIpc({
      channel: CHANNEL,
      deleteChannel: DELETE_CHANNEL,
      onDelete: (shortcut) => {
        settingsService.removeShortcutHistory(shortcut)
      },
      onResolve: (value) => {
        if (isResolved) return
        finalize(value)
        closeDialogWindowSafely(inputWindow)
      }
    })

    inputWindow.once('closed', () => {
      activeDialogWindow = null
      if (!isResolved) {
        finalize(null)
      } else {
        cleanupIpcListener()
      }
    })

    attachDialogFocusRestoreOnClose(
      inputWindow,
      parentWindow
    )
    inputWindow.on('close', () => {
      if (!isResolved) {
        finalize(null)
      }
    })

    showDialogWindow(inputWindow)
  })
}
