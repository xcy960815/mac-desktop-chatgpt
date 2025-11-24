import * as path from 'path'
import { existsSync } from 'fs'

import {
  app,
  BrowserWindow,
  ipcMain,
  screen
} from 'electron'

import { ElectronMenubar } from './electron-menubar'

export function showShortcutInputDialog(
  electronMenubar: ElectronMenubar,
  parentWindow: BrowserWindow,
  currentShortcut: string
): Promise<string | null> {
  return new Promise((resolve, reject) => {
    if (!parentWindow || parentWindow.isDestroyed()) {
      console.error(
        '❌ showShortcutInputDialog: 父窗口无效'
      )
      reject(new Error('父窗口无效'))
      return
    }

    electronMenubar.disableAutoHide()

    let parentBounds: Electron.Rectangle
    try {
      parentBounds = parentWindow.getBounds()
    } catch (error) {
      console.error(
        '❌ showShortcutInputDialog: 获取窗口位置失败',
        error
      )
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

    const dialogWidth = 360
    const dialogHeight = 160
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

      console.warn(
        '⚠️ 未找到 preload.js，使用默认路径:',
        candidates[0]
      )
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
      title: '设置快捷键',
      show: false
    })

    const initialShortcut = (currentShortcut ?? '').trim()

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>设置快捷键</title>
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
      margin-bottom: 16px;
    }
    .shortcut-display {
      width: 100%;
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
      font-family: monospace;
      background: #fafafa;
      color: #333;
      min-height: 32px;
      display: flex;
      align-items: center;
    }
    .buttons {
      display: flex;
      gap: 10px;
      justify-content: flex-end;
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
      <div id="shortcut-display" class="shortcut-display"></div>
    </div>
    <div class="buttons">
      <button class="btn-cancel" id="cancel-btn">取消</button>
      <button class="btn-ok" id="ok-btn">确定</button>
    </div>
  </div>
  <script>
    const display = document.getElementById('shortcut-display');
    const okBtn = document.getElementById('ok-btn');
    const cancelBtn = document.getElementById('cancel-btn');

    let currentValue = ${JSON.stringify(initialShortcut)};

    function renderDisplay() {
      display.textContent = currentValue || '请在键盘上按下新的快捷键组合';
    }

    function normalizeKey(key) {
      if (key.length === 1) {
        return key.toUpperCase();
      }
      const map = {
        'ArrowUp': 'Up',
        'ArrowDown': 'Down',
        'ArrowLeft': 'Left',
        'ArrowRight': 'Right',
        ' ': 'Space',
        'Escape': 'Esc',
      };
      return map[key] || key;
    }

    function buildShortcutFromEvent(e) {
      if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') {
        return null;
      }

      const parts = [];
      if (e.metaKey) {
        parts.push('CommandOrControl');
      } else if (e.ctrlKey) {
        parts.push('Ctrl');
      }
      if (e.altKey) {
        parts.push('Alt');
      }
      if (e.shiftKey) {
        parts.push('Shift');
      }

      let key = e.key;
      key = normalizeKey(key);
      parts.push(key);
      return parts.join('+');
    }

    document.addEventListener('keydown', (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.key === 'Escape') {
        cancelBtn.click();
        return;
      }

      if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
        if (currentValue) {
          okBtn.click();
        }
        return;
      }

      const value = buildShortcutFromEvent(e);
      if (!value) return;
      currentValue = value;
      renderDisplay();
    });

    renderDisplay();

    okBtn.addEventListener('click', () => {
      const value = (currentValue || '').trim();
      window.electronAPI?.sendShortcutInput(value);
    });

    cancelBtn.addEventListener('click', () => {
      window.electronAPI?.sendShortcutInput(null);
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

    const CHANNEL = 'shortcut-input-response'
    let isResolved = false

    const cleanupIpcListener = () => {
      ipcMain.removeListener(
        CHANNEL,
        handleShortcutResponse
      )
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

    const handleShortcutResponse = (
      _event: Electron.IpcMainEvent,
      value: string | null
    ) => {
      if (isResolved) {
        console.log(
          '⚠️ shortcut-input-response 已处理过，忽略重复消息'
        )
        return
      }
      console.log('✅ 收到用户输入:', value)
      finalize(value)
      closeWindowSafely()
    }

    ipcMain.on(CHANNEL, handleShortcutResponse)

    inputWindow.once('closed', () => {
      if (!isResolved) {
        console.log(
          '⚠️ 窗口关闭但未收到用户输入，返回 null'
        )
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
        console.log('⚠️ 用户点击关闭按钮')
        finalize(null)
      }
    })
  })
}
