import { app, shell, WebContents } from 'electron'
import contextMenu from 'electron-context-menu'

import { WindowManager } from '@/window-manager'
import { settingsService } from '@/services/settings-service'

/**
 * 注册导航监听器，监听 WebView 的导航事件
 * @param {WebContents} webContents - WebContents 实例
 * @returns {void}
 */
const registerNavigationListeners = (
  webContents: WebContents
) => {
  webContents.on('did-navigate', (_event, url) => {
    settingsService.setCurrentModelUrl(url)
  })

  webContents.on(
    'did-navigate-in-page',
    (_event, url, isMainFrame) => {
      if (isMainFrame)
        settingsService.setCurrentModelUrl(url)
    }
  )
}

/**
 * 注册输入快捷键处理器，支持复制、粘贴、撤销等快捷键
 * @param {WebContents} webContents - WebContents 实例
 * @returns {void}
 */
const registerInputShortcuts = (
  webContents: WebContents
) => {
  webContents.on('before-input-event', (_event, input) => {
    const { control, meta, key } = input
    if (!control && !meta) return

    switch (key) {
      case 'x':
        webContents.cut()
        break
      case 'c':
        webContents.copy()
        break
      // case 'v':
      //   webContents.paste()
      //   break
      case 'a':
        webContents.selectAll()
        break
      case 'z':
        webContents.undo()
        break
      case 'y':
        webContents.redo()
        break
      case 'q':
        app.quit()
        break
      case 'r':
        webContents.reload()
        break
    }
  })
}

/** macOS 隐藏处理器是否已注册 */
let macHideHandlerRegistered = false

/**
 * 注册 macOS 隐藏处理器
 * @param {WindowManager} windowManager - 窗口管理器实例
 * @returns {void}
 */
const registerMacHideHandler = (
  windowManager: WindowManager
) => {
  if (
    process.platform !== 'darwin' ||
    macHideHandlerRegistered
  ) {
    return
  }

  windowManager.on('window-did-hide', () => {
    if (process.platform === 'darwin') {
      app.hide()
    }
  })

  macHideHandlerRegistered = true
}

/**
 * 注册 WebContents 处理器，包括导航监听、加载失败处理、输入快捷键等
 * @param {WindowManager} windowManager - 窗口管理器实例
 * @returns {void}
 */
export const registerWebContentsHandlers = (
  windowManager: WindowManager
) => {
  registerMacHideHandler(windowManager)

  // commandLine.appendSwitch 已移动到 main.ts 以确保在 app ready 之前运行

  app.on('web-contents-created', (_event, webContents) => {
    if (webContents.getType() !== 'webview') {
      return
    }

    registerNavigationListeners(webContents)

    webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url)
      return { action: 'deny' }
    })

    contextMenu({
      window: webContents
    })

    registerInputShortcuts(webContents)
  })
}
