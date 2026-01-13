import * as path from 'path'
import { existsSync } from 'fs'

import {
  app,
  BrowserWindow,
  ipcMain,
  screen
} from 'electron'

import { ElectronMenubar } from '@/electron-menubar'

/**
 * 显示代理输入对话框
 * @param {ElectronMenubar} electronMenubar - Electron 菜单栏实例
 * @param {BrowserWindow} parentWindow - 父窗口实例
 * @param {string} currentProxy - 当前代理字符串
 * @returns {Promise<string | null>} 返回用户输入的代理字符串，如果取消则返回 null
 */
export function showProxyInputDialog(
  electronMenubar: ElectronMenubar,
  parentWindow: BrowserWindow,
  currentProxy: string
): Promise<string | null> {
  return new Promise((resolve, reject) => {
    if (!parentWindow || parentWindow.isDestroyed()) {
      reject(new Error('父窗口无效'))
      return
    }

    electronMenubar.disableAutoHide()

    let parentBounds: Electron.Rectangle
    try {
      parentBounds = parentWindow.getBounds()
    } catch {
      const primaryDisplay = screen.getPrimaryDisplay()
      const { width: screenWidth, height: screenHeight } =
        primaryDisplay.workAreaSize
      parentBounds = {
        x: 0,
        y: 0,
        width: screenWidth,
        height: screenHeight
      }
    }

    const dialogWidth = 400
    const dialogHeight = 200
    const x = Math.round(
      parentBounds.x +
        (parentBounds.width - dialogWidth) / 2
    )
    const y = Math.round(
      parentBounds.y +
        (parentBounds.height - dialogHeight) / 2
    )

    const resolvePreloadPath = () => {
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

    const inputWindow = new BrowserWindow({
      width: dialogWidth,
      height: dialogHeight,
      x,
      y,
      resizable: false,
      frame: true,
      alwaysOnTop: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false,
        preload: resolvePreloadPath()
      },
      title: '设置代理',
      show: false
    })

    const initialProxy = (currentProxy ?? '').trim()

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>设置代理</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    html, body {
      height: 100%;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #ffffff;
    }
    .container {
      height: 100%;
      padding: 16px 20px 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      background: #ffffff;
    }
    .input-group {
      margin-bottom: 8px;
    }
    .proxy-input {
      width: 100%;
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
      background: #fafafa;
      color: #333;
    }
    .proxy-input:focus {
      outline: none;
      border-color: #007AFF;
      background: #fff;
    }
    .hint {
      font-size: 12px;
      color: #666;
      margin-top: 4px;
    }
    .buttons {
      display: flex;
      gap: 10px;
      justify-content: flex-end;
      margin-top: auto;
    }
    button {
      padding: 6px 18px;
      border: none;
      border-radius: 4px;
      font-size: 14px;
      cursor: pointer;
      transition: background 0.2s;
    }
    .btn-cancel {
      background: #f0f0f0;
      color: #333;
    }
    .btn-cancel:hover {
      background: #e0e0e0;
    }
    .btn-ok {
      background: #007AFF;
      color: white;
    }
    .btn-ok:hover {
      background: #0056b3;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="input-group">
      <input type="text" id="proxy-input" class="proxy-input" placeholder="例如: socks5://127.0.0.1:7897" value="${initialProxy}">
      <div class="hint">格式: 协议://IP:端口 (留空则禁用代理)</div>
    </div>
    <div class="buttons">
      <button class="btn-cancel" id="cancel-btn">取消</button>
      <button class="btn-ok" id="ok-btn">确定</button>
    </div>
  </div>
  <script>
    const input = document.getElementById('proxy-input');
    const okBtn = document.getElementById('ok-btn');
    const cancelBtn = document.getElementById('cancel-btn');

    input.focus();
    input.select();

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        okBtn.click();
      } else if (e.key === 'Escape') {
        cancelBtn.click();
      }
    });

    okBtn.addEventListener('click', () => {
      const value = input.value.trim();
      window.electronAPI?.sendProxyInput(value);
    });

    cancelBtn.addEventListener('click', () => {
      window.electronAPI?.sendProxyInput(null);
    });
  </script>
</body>
</html>
    `

    inputWindow.loadURL(
      `data:text/html;charset=utf-8,${encodeURIComponent(
        html
      )}`
    )

    const CHANNEL = 'proxy-input-response'
    let isResolved = false

    const cleanupIpcListener = () => {
      ipcMain.removeListener(CHANNEL, handleProxyResponse)
    }

    const finalize = (value: string | null) => {
      if (isResolved) {
        return
      }
      isResolved = true
      cleanupIpcListener()
      electronMenubar.enableAutoHide()
      resolve(value)
    }

    const closeWindowSafely = () => {
      setTimeout(() => {
        if (!inputWindow.isDestroyed()) {
          inputWindow.close()
        }
      }, 50)
    }

    const handleProxyResponse = (
      _event: Electron.IpcMainEvent,
      value: string | null
    ) => {
      if (isResolved) {
        return
      }
      finalize(value)
      closeWindowSafely()
    }

    ipcMain.on(CHANNEL, handleProxyResponse)

    inputWindow.once('closed', () => {
      if (!isResolved) {
        finalize(null)
      } else {
        cleanupIpcListener()
      }
    })

    inputWindow.once('ready-to-show', () => {
      if (parentWindow && !parentWindow.isDestroyed()) {
        if (!parentWindow.isVisible()) {
          parentWindow.show()
        }
      }
      inputWindow.show()
      inputWindow.focus()
    })

    inputWindow.on('close', () => {
      if (!isResolved) {
        finalize(null)
      }
    })
  })
}
