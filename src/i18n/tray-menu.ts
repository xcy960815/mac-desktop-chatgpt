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
  | 'windowAlwaysOnTop'
  | 'model'
  | 'setShortcut'
  | 'checkForUpdates'
  | 'language'
  | 'languageEnglish'
  | 'languageChinese'
  | 'setProxy'
  | 'proxyDialogTitle'
  | 'proxyPlaceholder'
  | 'proxyHint'
  | 'cancel'
  | 'confirm'
  | 'shortcutDialogTitle'
  | 'shortcutDialogTitle'
  | 'shortcutPlaceholder'
  | 'shortcutResetConfirmTitle'
  | 'shortcutResetConfirmMessage'
  | 'autoLaunchErrorTitle'
  | 'autoLaunchErrorMessage'
  | 'errorTitle'
  | 'appNotReadyMessage'
  | 'windowNotReadyMessage'
  | 'dialogShowErrorMessage'
  | 'settingFailedTitle'
  | 'shortcutEmptyMessage'
  | 'settingSuccessTitle'
  | 'shortcutSetSuccessMessagePrefix'
  | 'shortcutConflictMessage'
  | 'shortcutResetSuccessMessage'
  | 'shortcutResetErrorMessage'
  | 'shortcutSetErrorMessagePrefix'
  | 'formatErrorTitle'
  | 'proxyFormatErrorMessage'
  | 'proxySavedMessage'
  | 'proxySetErrorMessagePrefix'
  | 'windowDestroyedError'
  | 'reloadWindowError'
  | 'showInDock'

const MENU_MESSAGES: Record<
  MenuLanguage,
  Record<TrayMenuMessageKey, string>
> = {
  [MenuLanguage.English]: {
    quit: 'Quit',
    reload: 'Reload',
    openInBrowser: 'Open in browser',
    autoLaunchOnStartup: 'Auto-launch on startup',
    showInDock: 'Show in Dock',

    windowAlwaysOnTop: 'Always on top',
    model: 'Model',
    setShortcut: 'Set shortcut',
    checkForUpdates: 'Check for updates',
    language: 'Language',
    languageEnglish: 'English',
    languageChinese: 'Chinese',
    setProxy: 'Set Proxy',
    proxyDialogTitle: 'Set Proxy',
    proxyPlaceholder: 'e.g. socks5://127.0.0.1:7897',
    proxyHint:
      'Format: protocol://IP:port (Empty to disable)',
    cancel: 'Cancel',
    confirm: 'Confirm',
    shortcutDialogTitle: 'Set Shortcut',
    shortcutPlaceholder:
      'Please press a new shortcut key combination',
    shortcutResetConfirmTitle: 'Reset to Default',
    shortcutResetConfirmMessage:
      'No shortcut entered. Reset to default (CommandOrControl+g)?',
    autoLaunchErrorTitle: 'Failed to set auto-launch',
    autoLaunchErrorMessage:
      'Please try again later or verify system settings.',
    errorTitle: 'Error',
    appNotReadyMessage:
      'Application not fully initialized, please try again later.',
    windowNotReadyMessage:
      'Window not ready, please try again later.',
    dialogShowErrorMessage:
      'Failed to show dialog, please try again later.',
    settingFailedTitle: 'Setting Failed',
    shortcutEmptyMessage: 'Shortcut cannot be empty.',
    settingSuccessTitle: 'Setting Successful',
    shortcutSetSuccessMessagePrefix: 'Shortcut set to: ',
    shortcutConflictMessage:
      'Shortcut occupied or invalid, please try another.',
    shortcutResetSuccessMessage:
      'Shortcut reset to default: CommandOrControl+g',
    shortcutResetErrorMessage:
      'Cannot register default shortcut, please try another.',
    shortcutSetErrorMessagePrefix:
      'Error setting shortcut: ',
    formatErrorTitle: 'Format Error',
    proxyFormatErrorMessage:
      'Invalid proxy address format.\n\nExample:\nhttp://127.0.0.1:7890\n127.0.0.1:7890',
    proxySavedMessage:
      'Proxy settings saved, please restart application to apply.',
    proxySetErrorMessagePrefix: 'Error setting proxy: ',
    windowDestroyedError: 'Window destroyed',
    reloadWindowError:
      'Cannot reload window, please try again later.'
  },
  [MenuLanguage.Chinese]: {
    quit: '退出',
    reload: '重新加载',
    openInBrowser: '在浏览器中打开',
    autoLaunchOnStartup: '开机自启',
    showInDock: '在程序坞显示',
    windowAlwaysOnTop: '置顶于所有应用',
    model: '模型',
    setShortcut: '设置快捷键',
    checkForUpdates: '检测更新',
    language: '语言',
    languageEnglish: '英语',
    languageChinese: '中文',
    setProxy: '设置代理',
    proxyDialogTitle: '设置代理',
    proxyPlaceholder: '例如: socks5://127.0.0.1:7897',
    proxyHint: '格式: 协议://IP:端口 (留空则禁用代理)',
    cancel: '取消',
    confirm: '确定',
    shortcutDialogTitle: '设置快捷键',
    shortcutPlaceholder: '请在键盘上按下新的快捷键组合',
    shortcutResetConfirmTitle: '重置为默认值',
    shortcutResetConfirmMessage:
      '未输入快捷键，是否将快捷键重置为默认值 CommandOrControl+g？',
    autoLaunchErrorTitle: '开机启动设置失败',
    autoLaunchErrorMessage:
      '请稍后再试或手动到系统设置中修改。',
    errorTitle: '错误',
    appNotReadyMessage: '应用程序未完全初始化，请稍后再试',
    windowNotReadyMessage: '窗口未准备好，请稍后再试',
    dialogShowErrorMessage: '显示对话框失败，请稍后再试',
    settingFailedTitle: '设置失败',
    shortcutEmptyMessage: '快捷键不能为空',
    settingSuccessTitle: '设置成功',
    shortcutSetSuccessMessagePrefix: '快捷键已设置为: ',
    shortcutConflictMessage:
      '快捷键已被占用或格式不正确，请尝试其他快捷键',
    shortcutResetSuccessMessage:
      '快捷键已重置为默认值: CommandOrControl+g',
    shortcutResetErrorMessage:
      '无法注册默认快捷键，请尝试其他快捷键',
    shortcutSetErrorMessagePrefix: '设置快捷键时发生错误: ',
    formatErrorTitle: '格式错误',
    proxyFormatErrorMessage:
      '代理地址格式不正确。\n\n示例:\nhttp://127.0.0.1:7890\n127.0.0.1:7890',
    proxySavedMessage: '代理设置已保存，请重启应用以生效。',
    proxySetErrorMessagePrefix: '设置代理时发生错误: ',
    windowDestroyedError: '窗口已销毁',
    reloadWindowError: '无法重新加载窗口，请稍后重试'
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
