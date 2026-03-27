import { existsSync } from 'fs'
import * as path from 'path'

import {
  app,
  BrowserWindow,
  ipcMain,
  screen
} from 'electron'

export const DIALOG_WIDTH = 400
export const DIALOG_HEIGHT = 350

export const createPendingDialogPromise = <
  T = string | null
>(): Promise<T> =>
  new Promise((resolve) => {
    void resolve
  })

export const resolveDialogParentBounds = (
  parentWindow: BrowserWindow | null
): Electron.Rectangle => {
  try {
    if (
      !parentWindow ||
      parentWindow.isDestroyed() ||
      !parentWindow.isVisible()
    ) {
      throw new Error('No valid parent window')
    }
    return parentWindow.getBounds()
  } catch {
    const primaryDisplay = screen.getPrimaryDisplay()
    const { width, height } = primaryDisplay.workAreaSize
    return {
      x: 0,
      y: 0,
      width,
      height
    }
  }
}

export const resolveDialogPosition = (
  parentBounds: Electron.Rectangle
) => ({
  x: Math.round(
    parentBounds.x + (parentBounds.width - DIALOG_WIDTH) / 2
  ),
  y: Math.round(
    parentBounds.y +
      (parentBounds.height - DIALOG_HEIGHT) / 2
  )
})

export const resolveDialogPreloadPath = (): string => {
  const appPath = app.getAppPath()
  const candidates = [
    path.join(__dirname, 'preload.js'),
    path.join(__dirname, '..', 'preload.js'),
    path.join(appPath, '.vite', 'build', 'preload.js')
  ]

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate
    }
  }

  return candidates[0]
}

export interface CreateInputDialogWindowOptions {
  parentWindow: BrowserWindow | null
  title: string
}

export const createInputDialogWindow = ({
  parentWindow,
  title
}: CreateInputDialogWindowOptions): BrowserWindow => {
  const parentBounds =
    resolveDialogParentBounds(parentWindow)
  const { x, y } = resolveDialogPosition(parentBounds)

  return new BrowserWindow({
    width: DIALOG_WIDTH,
    height: DIALOG_HEIGHT,
    x,
    y,
    resizable: false,
    frame: true,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      preload: resolveDialogPreloadPath()
    },
    title,
    show: false
  })
}

export const loadDialogHtml = (
  dialogWindow: BrowserWindow,
  html: string
): void => {
  dialogWindow.loadURL(
    `data:text/html;charset=utf-8,${encodeURIComponent(
      html
    )}`
  )
}

export const showDialogWindow = (
  dialogWindow: BrowserWindow
): void => {
  dialogWindow.once('ready-to-show', () => {
    dialogWindow.show()
    dialogWindow.focus()
  })
}

export const closeDialogWindowSafely = (
  dialogWindow: BrowserWindow
): void => {
  setTimeout(() => {
    if (!dialogWindow.isDestroyed()) {
      dialogWindow.close()
    }
  }, 50)
}

export const attachDialogFocusRestoreOnClose = (
  dialogWindow: BrowserWindow,
  parentWindow: BrowserWindow | null
): void => {
  dialogWindow.on('close', () => {
    if (
      process.platform === 'darwin' &&
      parentWindow &&
      !parentWindow.isDestroyed() &&
      parentWindow.isVisible() &&
      !parentWindow.isFocused()
    ) {
      parentWindow.hide()
      setTimeout(() => {
        if (parentWindow && !parentWindow.isDestroyed()) {
          parentWindow.showInactive()
        }
      }, 100)
    }
  })
}

export interface BindDialogIpcOptions {
  channel: string
  deleteChannel: string
  onDelete: (value: string) => void
  onResolve: (value: string | null) => void
}

export const bindDialogIpc = ({
  channel,
  deleteChannel,
  onDelete,
  onResolve
}: BindDialogIpcOptions): (() => void) => {
  const handleResponse = (
    _event: Electron.IpcMainEvent,
    value: string | null
  ) => {
    onResolve(value)
  }

  const handleDelete = (
    _event: Electron.IpcMainEvent,
    value: string
  ) => {
    onDelete(value)
  }

  ipcMain.on(channel, handleResponse)
  ipcMain.on(deleteChannel, handleDelete)

  return () => {
    ipcMain.removeListener(channel, handleResponse)
    ipcMain.removeListener(deleteChannel, handleDelete)
  }
}
