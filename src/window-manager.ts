import {
  BrowserWindow,
  app,
  globalShortcut,
  Rectangle
} from 'electron'
import { EventEmitter } from 'events'
import { WindowBehavior } from '@/constants'
// import { delay } from '@/utils/common'

/**
 * 浏览器窗口操作选项
 */
export type WithBrowserWindowOptions = {
  /** 失败时的错误消息（可选） */
  onFailureMessage?: string
}

/**
 * 窗口管理器事件
 */
export interface WindowManagerEvents {
  show: () => void
  hide: () => void
  'after-show': () => void
  'after-hide': () => void
  'focus-lost': () => void
}

/**
 * 窗口管理器接口
 */
export interface WindowManager extends EventEmitter {
  getMainBrowserWindow(): BrowserWindow | null
  setMainBrowserWindow(window: BrowserWindow | null): void
  ensureBrowserWindow(): Promise<BrowserWindow | null>
  withBrowserWindow<T>(
    task: (win: BrowserWindow) => T | Promise<T>,
    options?: WithBrowserWindowOptions
  ): Promise<T | null>

  // Window Control logic
  showWindow(): Promise<void>
  hideWindow(): void
  toggleWindow(trayBounds?: Rectangle): Promise<void>
  setWindowBehavior(behavior: WindowBehavior): void
  isWindowLocked(): boolean
  bringWindowToFront(): Promise<void>

  // Auto-hide control
  disableAutoHide(): void
  enableAutoHide(): void
}

export const createWindowManager = (): WindowManager => {
  const eventEmitter = new EventEmitter()
  let mainBrowserWindow: BrowserWindow | null = null
  let windowBehavior: WindowBehavior =
    WindowBehavior.AutoHide
  let lockWindow = false
  let autoHideDisabled = false
  let blurTimeout: NodeJS.Timeout | null = null
  const isWindows = process.platform === 'win32'

  // Helper to emit typed events
  const emit = (
    event: keyof WindowManagerEvents,
    ...args: any[]
  ) => {
    eventEmitter.emit(event, ...args)
  }

  const unregisterEscShortcut = () => {
    globalShortcut.unregister('esc')
  }

  const registerEscShortcut = () => {
    unregisterEscShortcut()
    globalShortcut.register('esc', () => {
      if (mainBrowserWindow?.isVisible()) {
        hideWindow()
      }
    })
  }

  const clearPendingBlurTimeout = () => {
    if (blurTimeout) {
      clearTimeout(blurTimeout)
      blurTimeout = null
    }
  }

  const hideWindow = () => {
    if (
      !mainBrowserWindow ||
      !mainBrowserWindow.isVisible()
    )
      return
    emit('hide')
    mainBrowserWindow.hide()
    emit('after-hide')
    if (blurTimeout) {
      clearTimeout(blurTimeout)
      blurTimeout = null
    }
  }

  const showWindow = async (): Promise<void> => {
    if (!mainBrowserWindow) return

    // 如果窗口已存在且可见，并且处于锁定在桌面模式，则不做任何操作
    if (
      mainBrowserWindow.isVisible() &&
      windowBehavior === WindowBehavior.LockOnDesktop
    ) {
      return
    }

    emit('show')

    // Standard show logic
    mainBrowserWindow.center()
    mainBrowserWindow.restore()
    mainBrowserWindow.focus()
    mainBrowserWindow.show()

    emit('after-show')
  }

  const toggleWindow = async () => {
    if (!mainBrowserWindow) return

    if (mainBrowserWindow.isVisible()) {
      if (lockWindow && !mainBrowserWindow.isFocused()) {
        await bringWindowToFront()
        return
      }
      hideWindow()
    } else {
      await showWindow()
      if (process.platform === 'darwin') {
        app.show()
      }
      app.focus()
    }
  }

  const setWindowBehavior = (behavior: WindowBehavior) => {
    windowBehavior = behavior
    const wasLocked = lockWindow
    lockWindow = behavior !== WindowBehavior.AutoHide

    if (!lockWindow && wasLocked && !autoHideDisabled) {
      autoHideDisabled = false
    }

    if (lockWindow) {
      clearPendingBlurTimeout()
    }

    applyWindowBehaviorToWindow()
  }

  const applyWindowBehaviorToWindow = () => {
    if (
      !mainBrowserWindow ||
      mainBrowserWindow.isDestroyed()
    )
      return

    const shouldAlwaysOnTop =
      windowBehavior === WindowBehavior.AlwaysOnTop
    if (shouldAlwaysOnTop) {
      mainBrowserWindow.setAlwaysOnTop(true, 'floating')
    } else {
      mainBrowserWindow.setAlwaysOnTop(false)
    }
  }

  const bringWindowToFront = async () => {
    if (
      !mainBrowserWindow ||
      mainBrowserWindow.isDestroyed()
    ) {
      if (mainBrowserWindow) await showWindow()
      return
    }

    if (!mainBrowserWindow.isVisible()) {
      await showWindow()
      return
    }

    // Try moveTop for macOS
    const movableWindow = mainBrowserWindow as any
    if (typeof movableWindow.moveTop === 'function') {
      try {
        movableWindow.moveTop()
      } catch {
        /* ignore */
      }
    }

    mainBrowserWindow.show()
    mainBrowserWindow.focus()
    if (process.platform === 'darwin') {
      app.focus()
    }
  }

  // --- Window Listeners Setup ---
  const registerWindowListeners = (win: BrowserWindow) => {
    win.on('blur', () => {
      unregisterEscShortcut()

      clearPendingBlurTimeout()

      if (lockWindow) {
        emit('focus-lost')
        return
      }

      if (autoHideDisabled) return

      const blurHideDelay = isWindows ? 150 : 100
      blurTimeout = setTimeout(() => {
        hideWindow()
      }, blurHideDelay)
    })

    win.on('focus', () => {
      registerEscShortcut()
    })

    // Clean up on close
    win.on('closed', () => {
      unregisterEscShortcut()
      clearPendingBlurTimeout()
      mainBrowserWindow = null
    })
  }

  const setMainBrowserWindow = (
    window: BrowserWindow | null
  ) => {
    mainBrowserWindow = window
    if (window) {
      registerWindowListeners(window)
      applyWindowBehaviorToWindow()
    }
  }

  const ensureBrowserWindow =
    async (): Promise<BrowserWindow | null> => {
      if (
        mainBrowserWindow &&
        !mainBrowserWindow.isDestroyed()
      ) {
        return mainBrowserWindow
      }
      // Logic to recreate window could go here, but for now we expect main.ts to handle creation
      // or we can trigger an event to request creation?
      // For this refactor, let's assume valid instance is managed via setMainBrowserWindow
      return null
    }

  const withBrowserWindow = async <T>(
    task: (win: BrowserWindow) => T | Promise<T>,
    options?: WithBrowserWindowOptions
  ): Promise<T | null> => {
    // Simplified version of original logic
    const win = await ensureBrowserWindow()
    if (win && !win.isDestroyed()) {
      try {
        return await task(win)
      } catch (e) {
        console.error(e)
      }
    }
    return null
  }

  // Return the object with mixins
  const instance = Object.assign(eventEmitter, {
    getMainBrowserWindow: () => mainBrowserWindow,
    setMainBrowserWindow,
    ensureBrowserWindow,
    withBrowserWindow,
    showWindow,
    hideWindow,
    toggleWindow,
    setWindowBehavior,
    isWindowLocked: () => lockWindow,
    bringWindowToFront,
    disableAutoHide: () => {
      autoHideDisabled = true
      clearPendingBlurTimeout()
    },
    enableAutoHide: () => {
      autoHideDisabled = false
    }
  })

  return instance as WindowManager
}
