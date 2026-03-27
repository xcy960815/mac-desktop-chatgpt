import {
  BrowserWindow,
  app,
  globalShortcut
} from 'electron'
import { EventEmitter } from 'events'
import { CustomBrowserWindow } from '@/utils/constants'

/**
 * 窗口管理器事件
 */
export interface WindowManagerEvents {
  'window-will-show': () => void
  'window-did-show': () => void
  'window-will-hide': () => void
  'window-did-hide': () => void
}

/**
 * 窗口管理器接口
 */
export interface WindowManager extends EventEmitter {
  getMainBrowserWindow(): BrowserWindow | null
  setMainBrowserWindow(window: BrowserWindow | null): void
  ensureBrowserWindow(): BrowserWindow | null
  withBrowserWindow<T>(
    task: (win: BrowserWindow) => T | Promise<T>
  ): Promise<T | null>

  // 窗口控制逻辑
  showWindow(): Promise<void>
  hideWindow(): void
  toggleWindow(): Promise<void>
  setAlwaysOnTop(alwaysOnTop: boolean): void
  bringWindowToFront(): Promise<void>
  setWillQuit(quit: boolean): void
}

export const createWindowManager = (): WindowManager => {
  const eventEmitter = new EventEmitter()
  let mainBrowserWindow: BrowserWindow | null = null
  const noop = () => undefined
  let cleanupWindowListeners = noop

  // Helper to emit typed events
  const emit = (
    event: keyof WindowManagerEvents,
    ...args: unknown[]
  ) => {
    eventEmitter.emit(event, ...args)
  }

  const unregisterEscShortcut = () => {
    globalShortcut.unregister('esc')
  }

  const getUsableMainBrowserWindow =
    (): BrowserWindow | null => {
      if (
        mainBrowserWindow &&
        !mainBrowserWindow.isDestroyed()
      ) {
        return mainBrowserWindow
      }

      return null
    }

  const registerEscShortcut = () => {
    unregisterEscShortcut()
    globalShortcut.register('esc', () => {
      // 如果需要，允许使用 Esc 关闭；如果标准应用不需要则移除
      // 目前保留作为实用功能
      const browserWindow = getUsableMainBrowserWindow()
      if (browserWindow?.isVisible()) {
        hideWindow()
      }
    })
  }

  const hideWindow = () => {
    const browserWindow = getUsableMainBrowserWindow()
    if (!browserWindow || !browserWindow.isVisible()) {
      return
    }

    emit('window-will-hide')
    browserWindow.hide()
    emit('window-did-hide')
  }

  const showWindow = async (): Promise<void> => {
    const browserWindow = getUsableMainBrowserWindow()
    if (!browserWindow) {
      return
    }

    emit('window-will-show')

    // 标准显示逻辑
    browserWindow.center()
    browserWindow.restore()
    browserWindow.show()
    browserWindow.focus()

    emit('window-did-show')
  }

  const toggleWindow = async () => {
    const browserWindow = getUsableMainBrowserWindow()
    if (!browserWindow) {
      return
    }

    if (
      browserWindow.isVisible() &&
      browserWindow.isFocused()
    ) {
      hideWindow()
    } else {
      await showWindow()
      if (process.platform === 'darwin') {
        app.show()
      }
      app.focus()
    }
  }

  const setAlwaysOnTop = (alwaysOnTop: boolean) => {
    const browserWindow = getUsableMainBrowserWindow()
    if (!browserWindow) {
      return
    }

    if (alwaysOnTop) {
      browserWindow.setAlwaysOnTop(true, 'floating')
    } else {
      browserWindow.setAlwaysOnTop(false)
    }
  }

  const bringWindowToFront = async () => {
    const browserWindow = getUsableMainBrowserWindow()
    if (!browserWindow) {
      return
    }

    if (!browserWindow.isVisible()) {
      await showWindow()
      return
    }

    // 尝试在 macOS 上使用 moveTop
    const movableWindow =
      browserWindow as CustomBrowserWindow
    if (typeof movableWindow.moveTop === 'function') {
      try {
        movableWindow.moveTop()
      } catch {
        /* ignore */
      }
    }

    browserWindow.show()
    browserWindow.focus()
    if (process.platform === 'darwin') {
      app.focus()
    }
  }

  let willQuit = false

  const setWillQuit = (quit: boolean) => {
    willQuit = quit
  }

  // --- 窗口监听器设置 ---
  const registerWindowListeners = (win: BrowserWindow) => {
    const handleFocus = () => {
      registerEscShortcut()
    }

    const handleBlur = () => {
      unregisterEscShortcut()
    }

    const handleClose = (event: Electron.Event) => {
      if (!willQuit && process.platform === 'darwin') {
        event.preventDefault()
        hideWindow()
      }
      // 非 macOS 或正在退出时，允许窗口关闭
    }

    // 关闭时清理
    const handleClosed = () => {
      unregisterEscShortcut()
      if (mainBrowserWindow === win) {
        mainBrowserWindow = null
        cleanupWindowListeners = noop
      }
    }

    win.on('focus', handleFocus)
    win.on('blur', handleBlur)
    win.on('close', handleClose)
    win.on('closed', handleClosed)

    return () => {
      win.off('focus', handleFocus)
      win.off('blur', handleBlur)
      win.off('close', handleClose)
      win.off('closed', handleClosed)
    }
  }

  const setMainBrowserWindow = (
    window: BrowserWindow | null
  ) => {
    cleanupWindowListeners()
    mainBrowserWindow = window
    cleanupWindowListeners = noop
    if (window) {
      cleanupWindowListeners =
        registerWindowListeners(window)
      // 我们不在这里自动应用 alwaysOnTop，因为不再在 WindowManager 中存储状态
      // 预期 main.ts 会进行初始设置
    }
  }

  const ensureBrowserWindow = (): BrowserWindow | null =>
    getUsableMainBrowserWindow()

  const withBrowserWindow = async <T>(
    task: (win: BrowserWindow) => T | Promise<T>
  ): Promise<T | null> => {
    const win = ensureBrowserWindow()
    if (win) {
      try {
        return await task(win)
      } catch (e) {
        console.error(e)
      }
    }
    return null
  }

  // 返回带有 mixin 的对象
  const instance = Object.assign(eventEmitter, {
    getMainBrowserWindow: getUsableMainBrowserWindow,
    setMainBrowserWindow,
    ensureBrowserWindow,
    withBrowserWindow,
    showWindow,
    hideWindow,
    toggleWindow,
    setAlwaysOnTop,
    bringWindowToFront,
    setWillQuit
  })

  return instance as WindowManager
}
