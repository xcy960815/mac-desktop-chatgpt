import { BrowserWindow, dialog } from 'electron'

import { ElectronMenubar } from './electron-menubar'
import { delay } from './utils/common'

export type WithBrowserWindowOptions = {
  onFailureMessage?: string
}

export interface WindowManager {
  /**
   * 获取主浏览器窗口
   * @returns {BrowserWindow | null}
   */
  getMainBrowserWindow(): BrowserWindow | null
  /**
   * 设置主浏览器窗口
   * @param {BrowserWindow | null} window 
   * @returns {void}
   */
  setMainBrowserWindow(window: BrowserWindow | null): void
  /**
   * 确保浏览器窗口存在
   * @returns {Promise<BrowserWindow | null>}
   */
  ensureBrowserWindow(): Promise<BrowserWindow | null>
  /**
   * 在浏览器窗口上执行任务
   * @param {function} task 
   * @param {WithBrowserWindowOptions} options 
   * @returns {Promise<T | null>}
   */
  withBrowserWindow<T>(
    task: (win: BrowserWindow) => T | Promise<T>,
    options?: WithBrowserWindowOptions
  ): Promise<T | null>
}

export const createWindowManager = (
  electronMenubar: ElectronMenubar
): WindowManager => {
  let mainBrowserWindow: BrowserWindow | null = null
  /**
   * 确保浏览器窗口存在
   * @returns {Promise<BrowserWindow | null>}
   */   
  const ensureBrowserWindow = async (): Promise<BrowserWindow | null> => {
    const candidates = [
      mainBrowserWindow,
      electronMenubar.browserWindow
    ].filter(Boolean) as BrowserWindow[]

    for (const candidate of candidates) {
      if (!candidate.isDestroyed()) {
        mainBrowserWindow = candidate
        return candidate
      }
    }

    try {
      await electronMenubar.showWindow()
      await delay(150)
      const refreshedWindow =
        electronMenubar.browserWindow || mainBrowserWindow
      if (refreshedWindow && !refreshedWindow.isDestroyed()) {
        mainBrowserWindow = refreshedWindow
        return refreshedWindow
      }
    } catch (error) {
      console.error('❌ 确保 BrowserWindow 存在时出错', error)
    }

    return null
  }

  /**
   * 在浏览器窗口上执行任务
   * @param {function} task 
   * @param {WithBrowserWindowOptions} options 
   * @returns {Promise<T | null>}
   */
  const withBrowserWindow = async <T>(
    task: (win: BrowserWindow) => T | Promise<T>,
    options?: WithBrowserWindowOptions
  ): Promise<T | null> => {
    let lastError: unknown = null
    for (let attempt = 0; attempt < 3; attempt++) {
      const win = await ensureBrowserWindow()
      if (!win) {
        lastError = new Error('窗口不可用')
        break
      }
      if (win.isDestroyed()) {
        mainBrowserWindow = null
        await delay(50)
        continue
      }
      try {
        return await task(win)
      } catch (error) {
        lastError = error
        if (
          error instanceof Error &&
          /Object has been destroyed/i.test(error.message)
        ) {
          console.warn(
            '⚠️ 窗口已销毁，尝试重新获取窗口 (attempt %s)',
            attempt + 1
          )
          mainBrowserWindow = null
          await delay(50)
          continue
        }
        throw error
      }
    }

    dialog.showMessageBox(
      (mainBrowserWindow && !mainBrowserWindow.isDestroyed()
        ? mainBrowserWindow
        : undefined) || undefined,
      {
        type: 'error',
        title: '错误',
        message: options?.onFailureMessage || '窗口不可用，请稍后重试',
        detail: lastError instanceof Error ? lastError.message : undefined,
        buttons: ['确定']
      }
    )

    return null
  }

  return {
    getMainBrowserWindow: () => mainBrowserWindow,
    setMainBrowserWindow: (window) => {
      mainBrowserWindow = window
    },
    ensureBrowserWindow,
    withBrowserWindow
  }
}

