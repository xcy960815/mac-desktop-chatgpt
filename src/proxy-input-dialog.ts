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
 * 显示代理输入对话框
 * @param {BrowserWindow} parentWindow - 父窗口实例
 * @param {string} currentProxy - 当前代理字符串
 * @returns {Promise<string | null>} 返回用户输入的代理字符串，如果取消则返回 null
 */
let activeProxyDialogWindow: BrowserWindow | null = null

export function showProxyInputDialog(
  parentWindow: BrowserWindow | null,
  currentProxy: string | null,
  language: MenuLanguage
): Promise<string | null> {
  // 如果窗口已存在，直接激活并返回（返回一个永远挂起的 Promise，因为原有的 Promise 仍在处理）
  if (
    activeProxyDialogWindow &&
    !activeProxyDialogWindow.isDestroyed()
  ) {
    if (activeProxyDialogWindow.isMinimized())
      activeProxyDialogWindow.restore()
    activeProxyDialogWindow.focus()
    return new Promise((_resolve, _reject) => {
      // 故意保持 pending 状态，因为旧的对话框 Promise 仍在等待用户输入
    })
  }

  return new Promise((resolve, reject) => {
    let parentBounds: Electron.Rectangle
    try {
      if (
        !parentWindow ||
        parentWindow.isDestroyed() ||
        !parentWindow.isVisible()
      ) {
        throw new Error('No valid parent window')
      }
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
      title: getTrayMenuText('proxyDialogTitle', language),
      show: false
    })

    activeProxyDialogWindow = inputWindow

    const initialProxy = (currentProxy ?? '').trim()

    const t = (key: TrayMenuMessageKey) =>
      getTrayMenuText(key, language)

    const proxyHistory =
      readUserSetting().proxyHistory || []
    const historyHtml = proxyHistory.length
      ? proxyHistory
          .map(
            (url: string) => `
      <div class="history-item" data-url="${url}">
        <span class="history-item-text">${url}</span>
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
  <title>${t('proxyDialogTitle')}</title>
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
      <input type="text" id="proxy-input" class="proxy-input" placeholder="${t('proxyPlaceholder')}" value="${initialProxy}">
      <div class="hint">${t('proxyHint')}</div>
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
    const input = document.getElementById('proxy-input');
    const okBtn = document.getElementById('ok-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const clearBtn = document.getElementById('clear-btn');

    input.focus();
    input.select();

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        okBtn.click();
      } else if (e.key === 'Escape') {
        cancelBtn.click();
      }
    });

    clearBtn.addEventListener('click', () => {
      input.value = '';
      input.focus();
    });

    document.querySelectorAll('.use-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const item = e.currentTarget.closest('.history-item');
        const url = item.getAttribute('data-url');
        input.value = url;
        okBtn.click();
      });
    });

    document.querySelectorAll('.del-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const item = e.currentTarget.closest('.history-item');
        const url = item.getAttribute('data-url');
        window.electronAPI?.deleteProxyHistory(url);
        item.remove();
        if (document.querySelectorAll('.history-item').length === 0) {
          document.querySelector('.history-list').innerHTML = '<div class="empty-history">暂无历史记录</div>';
        }
      });
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
    const DELETE_CHANNEL = 'delete-proxy-history'
    let isResolved = false

    const handleProxyResponse = (
      _event: Electron.IpcMainEvent,
      value: string | null
    ) => {
      if (isResolved) return
      finalize(value)
      closeWindowSafely()
    }

    const handleDeleteProxyHistory = (
      _event: Electron.IpcMainEvent,
      proxyUrl: string
    ) => {
      const currentSetting = readUserSetting()
      const newHistory = (
        currentSetting.proxyHistory || []
      ).filter((p) => p !== proxyUrl)
      writeUserSetting({
        ...currentSetting,
        proxyHistory: newHistory
      })
    }

    const cleanupIpcListener = () => {
      ipcMain.removeListener(CHANNEL, handleProxyResponse)
      ipcMain.removeListener(
        DELETE_CHANNEL,
        handleDeleteProxyHistory
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

    ipcMain.on(CHANNEL, handleProxyResponse)
    ipcMain.on(DELETE_CHANNEL, handleDeleteProxyHistory)

    inputWindow.once('closed', () => {
      activeProxyDialogWindow = null
      if (!isResolved) {
        finalize(null)
      } else {
        cleanupIpcListener()
      }
    })

    inputWindow.once('ready-to-show', () => {
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
