import { existsSync } from 'fs'
import * as path from 'path'
import {
  app,
  BrowserWindow,
  ipcMain,
  screen
} from 'electron'
import {
  getTrayMenuText,
  type TrayMenuMessageKey
} from '@/i18n/tray-menu'
import type { MenuLanguage } from '@/utils/constants'

const WIDTH = 400
const HEIGHT = 350

function resolvePreloadPath() {
  const candidates = [
    path.join(__dirname, 'preload.js'),
    path.join(__dirname, '..', 'preload.js'),
    path.join(
      app.getAppPath(),
      '.vite',
      'build',
      'preload.js'
    )
  ]
  return (
    candidates.find((candidate) => existsSync(candidate)) ??
    candidates[0]
  )
}

interface InputDialogOptions<T> {
  title: TrayMenuMessageKey
  responseChannel: string
  deleteChannel: string
  removeHistory(value: string): void
  render(data: T, language: MenuLanguage): string
}

export function createInputDialog<T>(
  options: InputDialogOptions<T>
) {
  let active: BrowserWindow | null = null

  function focusIfOpen() {
    if (!active || active.isDestroyed()) return false
    if (active.isMinimized()) active.restore()
    active.focus()
    return true
  }

  async function show(
    language: MenuLanguage,
    data: T,
    parent?: BrowserWindow
  ): Promise<string | null> {
    if (focusIfOpen()) return null
    const url = `data:text/html;charset=utf-8,${encodeURIComponent(options.render(data, language))}`
    const bounds =
      parent && !parent.isDestroyed() && parent.isVisible()
        ? parent.getBounds()
        : screen.getPrimaryDisplay().workArea
    const win = new BrowserWindow({
      width: WIDTH,
      height: HEIGHT,
      x: Math.round(bounds.x + (bounds.width - WIDTH) / 2),
      y: Math.round(
        bounds.y + (bounds.height - HEIGHT) / 2
      ),
      resizable: false,
      alwaysOnTop: true,
      show: false,
      title: getTrayMenuText(options.title, language),
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false,
        preload: resolvePreloadPath()
      }
    })
    active = win

    return new Promise((resolve, reject) => {
      function cleanup() {
        ipcMain.off(options.responseChannel, onResponse)
        ipcMain.off(options.deleteChannel, onDelete)
      }
      function onResponse(
        event: Electron.IpcMainEvent,
        value: string | null
      ) {
        if (
          event.sender !== win.webContents ||
          (typeof value !== 'string' && value !== null)
        )
          return
        cleanup()
        resolve(value)
        setTimeout(() => {
          if (!win.isDestroyed()) win.close()
        }, 50)
      }
      function onDelete(
        event: Electron.IpcMainEvent,
        value: unknown
      ) {
        if (
          event.sender !== win.webContents ||
          typeof value !== 'string'
        )
          return
        try {
          options.removeHistory(value)
        } catch (error) {
          fail(error)
        }
      }
      function fail(error: unknown) {
        cleanup()
        reject(error)
        if (!win.isDestroyed()) win.close()
      }

      ipcMain.on(options.responseChannel, onResponse)
      ipcMain.on(options.deleteChannel, onDelete)
      win.once('closed', () => {
        cleanup()
        if (active === win) active = null
        resolve(null)
      })
      win.once('close', () => {
        if (
          process.platform === 'darwin' &&
          parent &&
          !parent.isDestroyed() &&
          parent.isVisible() &&
          !parent.isFocused()
        ) {
          parent.hide()
          setTimeout(() => {
            if (!parent.isDestroyed()) parent.showInactive()
          }, 100)
        }
      })
      win.once('ready-to-show', () => {
        win.show()
        win.focus()
      })
      try {
        win.loadURL(url).catch(fail)
      } catch (error) {
        fail(error)
      }
    })
  }
  return { show, focusIfOpen }
}
