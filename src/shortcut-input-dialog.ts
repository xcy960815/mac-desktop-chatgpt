import * as path from 'path'
import { existsSync } from 'fs'

import {
  app,
  BrowserWindow,
  ipcMain,
  screen
} from 'electron'

import { MenuLanguage } from '@/constants'
import {
  readUserSetting,
  writeUserSetting
} from '@/utils/user-setting'
import {
  TrayMenuMessageKey,
  getTrayMenuText
} from '@/i18n/tray-menu'

/**
 * 显示快捷键输入对话框
 * @param {BrowserWindow} parentWindow - 父窗口实例
 * @param {string} currentShortcut - 当前快捷键字符串
 * @returns {Promise<string | null>} 返回用户输入的快捷键字符串，如果取消则返回 null
 */
export function showShortcutInputDialog(
  parentWindow: BrowserWindow,
  currentShortcut: string,
  language: MenuLanguage
): Promise<string | null> {
  return new Promise((resolve, reject) => {
    if (!parentWindow || parentWindow.isDestroyed()) {
      reject(new Error('父窗口无效'))
      return
    }

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
    const dialogHeight = 350
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

    const shortcutHistory =
      readUserSetting().shortcutHistory || []
    const historyHtml = shortcutHistory.length
      ? shortcutHistory
          .map(
            (shortcut: string) => `
      <div class="history-item" data-shortcut="${shortcut}">
        <span class="history-item-text">${shortcut}</span>
        <div class="history-actions">
          <span class="icon-btn use-btn" title="一键使用">
            <svg fill="currentColor" width="16" height="16" viewBox="0 0 24 24"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg>
          </span>
          <span class="icon-btn del-btn" title="删除">
            <svg fill="currentColor" width="16" height="16" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
          </span>
        </div>
      </div>
    `
          )
          .join('')
      : '<div class="empty-history">暂无历史记录</div>'

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
      margin-bottom: 8px;
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
    .history-list {
      flex: 1;
      overflow-y: auto;
      border: 1px solid #ddd;
      border-radius: 4px;
      margin-top: 4px;
      display: flex;
      flex-direction: column;
      background: #fafafa;
    }
    .history-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      border-bottom: 1px solid #ddd;
    }
    .history-item:last-child {
      border-bottom: none;
    }
    .history-item-text {
      font-size: 13px;
      color: #333;
      word-break: break-all;
    }
    .history-actions {
      display: flex;
      gap: 8px;
    }
    .icon-btn {
      cursor: pointer;
      opacity: 0.6;
      transition: opacity 0.2s;
      display: flex;
      align-items: center;
      color: #666;
    }
    .icon-btn:hover {
      opacity: 1;
      color: #007AFF;
    }
    .icon-btn.del-btn:hover {
      color: #ff3b30;
    }
    .empty-history {
      padding: 12px;
      font-size: 12px;
      color: #999;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="input-group">
      <div id="shortcut-display" class="shortcut-display"></div>
      <div class="hint">${t('shortcutPlaceholder')}</div>
    </div>
    <div class="history-list">
      ${historyHtml}
    </div>
    <div class="buttons">
      <button class="btn-cancel" id="clear-btn" style="margin-right: auto;">${t('clear')}</button>
      <button class="btn-cancel" id="cancel-btn">${t('cancel')}</button>
      <button class="btn-ok" id="ok-btn">${t('confirm')}</button>
    </div>
  </div>
  <script>
    const display = document.getElementById('shortcut-display');
    const okBtn = document.getElementById('ok-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const clearBtn = document.getElementById('clear-btn');

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

    clearBtn.addEventListener('click', () => {
      currentValue = '';
      renderDisplay();
    });

    // 一键使用
    document.querySelectorAll('.use-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const item = e.currentTarget.closest('.history-item');
        const shortcut = item.getAttribute('data-shortcut');
        currentValue = shortcut;
        window.electronAPI?.sendShortcutInput(currentValue);
      });
    });

    // 删除历史
    document.querySelectorAll('.del-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const item = e.currentTarget.closest('.history-item');
        const shortcut = item.getAttribute('data-shortcut');
        window.electronAPI?.deleteShortcutHistory(shortcut);
        item.remove();
        if (document.querySelectorAll('.history-item').length === 0) {
          document.querySelector('.history-list').innerHTML = '<div class="empty-history">暂无历史记录</div>';
        }
      });
    });

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
    const DELETE_CHANNEL = 'delete-shortcut-history'
    let isResolved = false

    const handleShortcutResponse = (
      _event: Electron.IpcMainEvent,
      value: string | null
    ) => {
      if (isResolved) return
      finalize(value)
      closeWindowSafely()
    }

    const handleDeleteShortcutHistory = (
      _event: Electron.IpcMainEvent,
      shortcut: string
    ) => {
      const currentSetting = readUserSetting()
      const newHistory = (
        currentSetting.shortcutHistory || []
      ).filter((s) => s !== shortcut)
      writeUserSetting({
        ...currentSetting,
        shortcutHistory: newHistory
      })
    }

    const cleanupIpcListener = () => {
      ipcMain.removeListener(
        CHANNEL,
        handleShortcutResponse
      )
      ipcMain.removeListener(
        DELETE_CHANNEL,
        handleDeleteShortcutHistory
      )
    }

    const finalize = (value: string | null) => {
      if (isResolved) {
        return
      }
      isResolved = true
      cleanupIpcListener()

      resolve(value)
    }

    const closeWindowSafely = () => {
      setTimeout(() => {
        if (!inputWindow.isDestroyed()) {
          inputWindow.close()
        }
      }, 50)
    }

    ipcMain.on(CHANNEL, handleShortcutResponse)
    ipcMain.on(DELETE_CHANNEL, handleDeleteShortcutHistory)

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
