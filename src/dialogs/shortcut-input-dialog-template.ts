import {
  TrayMenuMessageKey,
  getTrayMenuText
} from '@/i18n/tray-menu'
import { MenuLanguage } from '@/utils/constants'

export interface ShortcutDialogTemplateOptions {
  currentShortcut: string
  history: string[]
  language: MenuLanguage
}

export const createShortcutDialogHtml = ({
  currentShortcut,
  history,
  language
}: ShortcutDialogTemplateOptions): string => {
  const t = (key: TrayMenuMessageKey) =>
    getTrayMenuText(key, language)

  const historyHtml = history.length
    ? history
        .map(
          (shortcut) => `
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

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${t('shortcutDialogTitle')}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { height: 100%; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #ffffff; }
    .container { height: 100%; padding: 16px 20px 20px; display: flex; flex-direction: column; gap: 16px; background: #ffffff; }
    .input-group { margin-bottom: 8px; }
    .shortcut-display { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; background: #fafafa; color: #333; min-height: 32px; display: flex; align-items: center; }
    .hint { font-size: 12px; color: #666; margin-top: 4px; }
    .buttons { display: flex; gap: 10px; justify-content: flex-end; margin-top: auto; }
    button { padding: 6px 18px; border: none; border-radius: 4px; font-size: 14px; cursor: pointer; transition: background 0.2s; }
    .btn-cancel { background: #f0f0f0; color: #333; }
    .btn-cancel:hover { background: #e0e0e0; }
    .btn-ok { background: #007AFF; color: white; }
    .btn-ok:hover { background: #0056b3; }
    .history-list { flex: 1; overflow-y: auto; border: 1px solid #ddd; border-radius: 4px; margin-top: 4px; display: flex; flex-direction: column; background: #fafafa; }
    .history-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; border-bottom: 1px solid #ddd; }
    .history-item:last-child { border-bottom: none; }
    .history-item-text { font-size: 13px; color: #333; word-break: break-all; }
    .history-actions { display: flex; gap: 8px; }
    .icon-btn { cursor: pointer; opacity: 0.6; transition: opacity 0.2s; display: flex; align-items: center; color: #666; }
    .icon-btn:hover { opacity: 1; color: #007AFF; }
    .icon-btn.del-btn:hover { color: #ff3b30; }
    .empty-history { padding: 12px; font-size: 12px; color: #999; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="input-group">
      <div id="shortcut-display" class="shortcut-display"></div>
      <div class="hint">${t('shortcutPlaceholder')}</div>
    </div>
    <div class="history-list">${historyHtml}</div>
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

    let currentValue = ${JSON.stringify(currentShortcut)};

    function renderDisplay() {
      display.textContent = currentValue || '${t('shortcutPlaceholder')}';
    }

    function normalizeKey(key) {
      if (key.length === 1) return key.toUpperCase();
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
      if (e.altKey) parts.push('Alt');
      if (e.shiftKey) parts.push('Shift');

      parts.push(normalizeKey(e.key));
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
        if (currentValue) okBtn.click();
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

    document.querySelectorAll('.use-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const item = e.currentTarget.closest('.history-item');
        const shortcut = item.getAttribute('data-shortcut');
        currentValue = shortcut;
        window.electronAPI?.sendShortcutInput(currentValue);
      });
    });

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
      window.electronAPI?.sendShortcutInput((currentValue || '').trim());
    });

    cancelBtn.addEventListener('click', () => {
      window.electronAPI?.sendShortcutInput(null);
    });
  </script>
</body>
</html>
  `
}
