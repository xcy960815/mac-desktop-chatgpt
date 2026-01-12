import { MenuLanguage } from '@/constants'

/**
 * 托盘菜单消息键类型
 * @typedef {string} TrayMenuMessageKey
 */
export type TrayMenuMessageKey =
  | 'quit'
  | 'reload'
  | 'openInBrowser'
  | 'autoLaunchOnStartup'
  | 'windowBehavior'
  | 'windowAutoHide'
  | 'windowLockOnDesktop'
  | 'windowAlwaysOnTop'
  | 'model'
  | 'setShortcut'
  | 'checkForUpdates'
  | 'language'
  | 'languageEnglish'
  | 'languageChinese'

const MENU_MESSAGES: Record<
  MenuLanguage,
  Record<TrayMenuMessageKey, string>
> = {
  [MenuLanguage.English]: {
    quit: 'Quit',
    reload: 'Reload',
    openInBrowser: 'Open in browser',
    autoLaunchOnStartup: 'Auto-launch on startup',
    windowBehavior: 'Window behavior',
    windowAutoHide: 'Auto hide',
    windowLockOnDesktop: 'Lock on desktop',
    windowAlwaysOnTop: 'Always on top',
    model: 'Model',
    setShortcut: 'Set shortcut',
    checkForUpdates: 'Check for updates',
    language: 'Language',
    languageEnglish: 'English',
    languageChinese: 'Chinese'
  },
  [MenuLanguage.Chinese]: {
    quit: '退出',
    reload: '重新加载',
    openInBrowser: '在浏览器中打开',
    autoLaunchOnStartup: '开机自启',
    windowBehavior: '窗口行为',
    windowAutoHide: '自动隐藏',
    windowLockOnDesktop: '锁定在桌面',
    windowAlwaysOnTop: '置顶于所有应用',
    model: '模型',
    setShortcut: '设置快捷键',
    checkForUpdates: '检测更新',
    language: '语言',
    languageEnglish: '英语',
    languageChinese: '中文'
  }
}

/**
 * 获取托盘菜单文本
 * @param {TrayMenuMessageKey} key - 菜单消息键
 * @param {MenuLanguage} language - 菜单语言
 * @returns {string} 对应语言的菜单文本，如果找不到则返回英文文本
 */
export const getTrayMenuText = (
  key: TrayMenuMessageKey,
  language: MenuLanguage
): string =>
  MENU_MESSAGES[language]?.[key] ??
  MENU_MESSAGES[MenuLanguage.English][key]
