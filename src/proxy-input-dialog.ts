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
import { createProxyDialogHtml } from '@/dialogs/proxy-input-dialog-template'

/**
 * 显示代理输入对话框
 * @param {BrowserWindow} parentWindow - 父窗口实例
 * @param {string} currentProxy - 当前代理字符串
 * @returns {Promise<string | null>} 返回用户输入的代理字符串，如果取消则返回 null
 */
let activeProxyDialogWindow: BrowserWindow | null = null

export function showProxyInputDialog(
  parentWindow: BrowserWindow | null,
  currentProxy: string | null,
  language: MenuLanguage
): Promise<string | null> {
  // 如果窗口已存在，直接激活并返回（返回一个永远挂起的 Promise，因为原有的 Promise 仍在处理）
  if (
    activeProxyDialogWindow &&
    !activeProxyDialogWindow.isDestroyed()
  ) {
    if (activeProxyDialogWindow.isMinimized())
      activeProxyDialogWindow.restore()
    activeProxyDialogWindow.focus()
    return createPendingDialogPromise()
  }

  return new Promise((resolve) => {
    const inputWindow = createInputDialogWindow({
      parentWindow,
      title: getTrayMenuText('proxyDialogTitle', language)
    })

    activeProxyDialogWindow = inputWindow
    loadDialogHtml(
      inputWindow,
      createProxyDialogHtml({
        currentProxy: (currentProxy ?? '').trim(),
        history: settingsService.getProxyHistory(),
        language
      })
    )

    const CHANNEL = 'proxy-input-response'
    const DELETE_CHANNEL = 'delete-proxy-history'
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
      onDelete: (proxyUrl) => {
        settingsService.removeProxyHistory(proxyUrl)
      },
      onResolve: (value) => {
        if (isResolved) return
        finalize(value)
        closeDialogWindowSafely(inputWindow)
      }
    })

    inputWindow.once('closed', () => {
      activeProxyDialogWindow = null
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
