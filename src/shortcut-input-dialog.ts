import * as path from 'path'
import { existsSync } from 'fs'

import {
  app,
  BrowserWindow,
  ipcMain,
  screen
} from 'electron'

import { WindowManager } from '@/window-manager'
import { MenuLanguage } from '@/constants'
import {
  TrayMenuMessageKey,
  getTrayMenuText
} from '@/i18n/tray-menu'

/**
 * 显示快捷键输入对话框
 * @param {WindowManager} windowManager - 窗口管理器实例
 * @param {BrowserWindow} parentWindow - 父窗口实例
 * @param {string} currentShortcut - 当前快捷键字符串
 * @returns {Promise<string | null>} 返回用户输入的快捷键字符串，如果取消则返回 null
 */
export function showShortcutInputDialog(
  windowManager: WindowManager,
  parentWindow: BrowserWindow,
  currentShortcut: string,
  language: MenuLanguage
): Promise<string | null> {
  return new Promise((resolve, reject) => {
    if (!parentWindow || parentWindow.isDestroyed()) {
      reject(new Error('父窗口无效'))
      return
    }

    windowManager.disableAutoHide()

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
      title: getTrayMenuText(
        'shortcutDialogTitle',
        language
      ),
      show: false
    })

    const initialShortcut = (currentShortcut ?? '').trim()

    const t = (key: TrayMenuMessageKey) =>
      getTrayMenuText(key, language)

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${t('shortcutDialogTitle')}</title>
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
      <div id="shortcut-display" class="shortcut-display"></div>
    </div>
    <div class="buttons">
      <button class="btn-cancel" id="cancel-btn">${t('cancel')}</button>
      <button class="btn-ok" id="ok-btn">${t('confirm')}</button>
    </div>
  </div>
  <script>
    const display = document.getElementById('shortcut-display');
    const okBtn = document.getElementById('ok-btn');
    const cancelBtn = document.getElementById('cancel-btn');

    let currentValue = ${JSON.stringify(initialShortcut)};

    function renderDisplay() {
      display.textContent = currentValue || '${t('shortcutPlaceholder')}';
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
      windowManager.enableAutoHide()
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
        return
      }
      finalize(value)
      closeWindowSafely()
    }

    ipcMain.on(CHANNEL, handleShortcutResponse)

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
