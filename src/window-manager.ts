import { BrowserWindow, dialog } from 'electron'

import { ElectronMenubar } from './electron-menubar'
import { delay } from './utils/common'

/**
 * 浏览器窗口操作选项
 * @typedef {Object} WithBrowserWindowOptions
 */
export type WithBrowserWindowOptions = {
  /** 失败时的错误消息（可选） */
  onFailureMessage?: string
}

/**
 * 窗口管理器接口
 * @interface WindowManager
 */
export interface WindowManager {
  /**
   * 获取主浏览器窗口
   * @returns {BrowserWindow | null} 主浏览器窗口实例，如果不存在则返回 null
   */
  getMainBrowserWindow(): BrowserWindow | null
  /**
   * 设置主浏览器窗口
   * @param {BrowserWindow | null} window - 浏览器窗口实例，如果为 null 则清除当前窗口引用
   * @returns {void}
   */
  setMainBrowserWindow(window: BrowserWindow | null): void
  /**
   * 确保浏览器窗口存在
   * @returns {Promise<BrowserWindow | null>} 浏览器窗口实例，如果无法获取则返回 null
   */
  ensureBrowserWindow(): Promise<BrowserWindow | null>
  /**
   * 在浏览器窗口上执行任务
   * @param {function} task - 要在窗口上执行的任务函数
   * @param {WithBrowserWindowOptions} [options] - 操作选项（可选）
   * @returns {Promise<T | null>} 任务执行结果，如果失败则返回 null
   * @template T
   */
  withBrowserWindow<T>(
    task: (win: BrowserWindow) => T | Promise<T>,
    options?: WithBrowserWindowOptions
  ): Promise<T | null>
}

/**
 * 创建窗口管理器
 * @param {ElectronMenubar} electronMenubar - Electron 菜单栏实例
 * @returns {WindowManager} 窗口管理器实例
 */
export const createWindowManager = (
  electronMenubar: ElectronMenubar
): WindowManager => {
  let mainBrowserWindow: BrowserWindow | null = null
  /**
   * 确保浏览器窗口存在
   * @returns {Promise<BrowserWindow | null>}
   */
  const ensureBrowserWindow =
    async (): Promise<BrowserWindow | null> => {
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
        if (
          refreshedWindow &&
          !refreshedWindow.isDestroyed()
        ) {
          mainBrowserWindow = refreshedWindow
          return refreshedWindow
        }
      } catch {
        // 忽略拉起窗口时的异常，继续重试
      }

      return null
    }

  /**
   * 在浏览器窗口上执行任务
   * @param {function} task - 要在窗口上执行的任务函数
   * @param {WithBrowserWindowOptions} [options] - 操作选项（可选）
   * @returns {Promise<T | null>} 任务执行结果，如果失败则返回 null
   * @template T
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
          mainBrowserWindow = null
          await delay(50)
          continue
        }
        throw error
      }
    }

    const parentWindow =
      mainBrowserWindow && !mainBrowserWindow.isDestroyed()
        ? mainBrowserWindow
        : undefined

    dialog.showMessageBox(parentWindow, {
      type: 'error',
      title: '错误',
      message:
        options?.onFailureMessage ||
        '窗口不可用，请稍后重试',
      detail:
        lastError instanceof Error
          ? lastError.message
          : undefined,
      buttons: ['确定']
    })

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
