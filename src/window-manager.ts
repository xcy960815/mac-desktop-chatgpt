import {
  BrowserWindow,
  app,
  globalShortcut,
  Rectangle,
  nativeTheme,
  nativeImage
} from 'electron'
import { EventEmitter } from 'events'
import * as path from 'path'
import {
  CustomBrowserWindow,
  MAIN_WINDOW_WIDTH,
  MAIN_WINDOW_HEIGHT
} from '@/utils/constants'
import { resolveMainIndexUrl } from '@/utils/common'
import { readUserSetting } from '@/utils/user-setting'

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
    task: (win: BrowserWindow) => T | Promise<T>
  ): Promise<T | null>

  // 窗口创建逻辑
  createMainWindow(): Promise<BrowserWindow>

  // 窗口控制逻辑
  showWindow(): Promise<void>
  hideWindow(): void
  toggleWindow(trayBounds?: Rectangle): Promise<void>
  setAlwaysOnTop(alwaysOnTop: boolean): void
  bringWindowToFront(): Promise<void>
  setWillQuit(quit: boolean): void
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

    if (
      mainBrowserWindow.isVisible() &&
      mainBrowserWindow.isFocused()
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
    const movableWindow =
      mainBrowserWindow as CustomBrowserWindow
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

  let willQuit = false

  const setWillQuit = (quit: boolean) => {
    willQuit = quit
  }

  // --- 窗口监听器设置 ---
  const registerWindowListeners = (win: BrowserWindow) => {
    win.on('focus', () => {
      registerEscShortcut()
    })

    win.on('blur', () => {
      unregisterEscShortcut()
    })

    win.on('close', (event) => {
      if (!willQuit && process.platform === 'darwin') {
        event.preventDefault()
        hideWindow()
      }
      // 非 macOS 或正在退出时，允许窗口关闭
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

  const createMainWindow =
    async (): Promise<BrowserWindow> => {
      const appPath = app.getAppPath()

      const indexUrl = resolveMainIndexUrl({
        devServerUrl: MAIN_WINDOW_VITE_DEV_SERVER_URL,
        rendererDir: __dirname
      })

      const preloadPath = path.join(__dirname, 'preload.js')

      const iconPath =
        process.platform === 'darwin'
          ? path.join(
              appPath,
              'images',
              'gptIconTemplate.png'
            )
          : nativeTheme.shouldUseDarkColors
            ? path.join(
                appPath,
                'images',
                'gptIconLight.png'
              )
            : path.join(
                appPath,
                'images',
                'gptIconDark.png'
              )

      const browserWindow = new BrowserWindow({
        icon: nativeImage.createFromPath(iconPath),
        width: MAIN_WINDOW_WIDTH,
        height: MAIN_WINDOW_HEIGHT,
        useContentSize: true,
        show: false, // 初始状态隐藏
        webPreferences: {
          preload: preloadPath,
          webviewTag: true,
          contextIsolation: true,
          nodeIntegration: false,
          sandbox: false
        }
      })

      browserWindow.once('ready-to-show', async () => {
        await showWindow()
        if (process.platform === 'darwin') {
          app.show()
        }
        app.focus()
      })

      browserWindow.loadURL(indexUrl)

      const userSetting = readUserSetting()

      if (process.platform === 'darwin') {
        const dockIcon = nativeImage.createFromPath(
          path.join(appPath, 'images', 'icon.png')
        )
        app.dock.setIcon(dockIcon)

        if (!userSetting.showInDock) {
          app.dock.hide()
        }
      } else if (process.platform === 'linux') {
        browserWindow.setSkipTaskbar(true)
      }

      setMainBrowserWindow(browserWindow)

      if (userSetting.alwaysOnTop) {
        setAlwaysOnTop(true)
      }

      return browserWindow
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
    task: (win: BrowserWindow) => T | Promise<T>
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
    createMainWindow,
    showWindow,
    hideWindow,
    toggleWindow,
    setAlwaysOnTop,
    bringWindowToFront,
    setWillQuit
  })

  return instance as WindowManager
}
