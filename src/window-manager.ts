import {
  BrowserWindow,
  app,
  globalShortcut,
  Rectangle
} from 'electron'
import { EventEmitter } from 'events'

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

  // 窗口控制逻辑
  showWindow(): Promise<void>
  hideWindow(): void
  toggleWindow(trayBounds?: Rectangle): Promise<void>
  setAlwaysOnTop(alwaysOnTop: boolean): void
  bringWindowToFront(): Promise<void>
}

export const createWindowManager = (): WindowManager => {
  const eventEmitter = new EventEmitter()
  let mainBrowserWindow: BrowserWindow | null = null

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
      // 如果需要，允许使用 Esc 关闭；如果标准应用不需要则移除
      // 目前保留作为实用功能
      if (mainBrowserWindow?.isVisible()) {
        hideWindow()
      }
    })
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
  }

  const showWindow = async (): Promise<void> => {
    if (!mainBrowserWindow) return

    emit('show')

    // 标准显示逻辑
    mainBrowserWindow.center()
    mainBrowserWindow.restore()
    mainBrowserWindow.focus()
    mainBrowserWindow.show()

    emit('after-show')
  }

  const toggleWindow = async () => {
    if (!mainBrowserWindow) return

    if (mainBrowserWindow.isVisible()) {
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
    if (
      !mainBrowserWindow ||
      mainBrowserWindow.isDestroyed()
    )
      return

    if (alwaysOnTop) {
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

    // 尝试在 macOS 上使用 moveTop
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

  // --- 窗口监听器设置 ---
  const registerWindowListeners = (win: BrowserWindow) => {
    win.on('focus', () => {
      registerEscShortcut()
    })

    win.on('blur', () => {
      unregisterEscShortcut()
    })

    // 关闭时清理
    win.on('closed', () => {
      unregisterEscShortcut()
      mainBrowserWindow = null
    })
  }

  const setMainBrowserWindow = (
    window: BrowserWindow | null
  ) => {
    mainBrowserWindow = window
    if (window) {
      registerWindowListeners(window)
      // 我们不在这里自动应用 alwaysOnTop，因为不再在 WindowManager 中存储状态
      // 预期 main.ts 会进行初始设置
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
      return null
    }

  const withBrowserWindow = async <T>(
    task: (win: BrowserWindow) => T | Promise<T>,
    options?: WithBrowserWindowOptions
  ): Promise<T | null> => {
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

  // 返回带有 mixin 的对象
  const instance = Object.assign(eventEmitter, {
    getMainBrowserWindow: () => mainBrowserWindow,
    setMainBrowserWindow,
    ensureBrowserWindow,
    withBrowserWindow,
    showWindow,
    hideWindow,
    toggleWindow,
    setAlwaysOnTop,
    bringWindowToFront
  })

  return instance as WindowManager
}
