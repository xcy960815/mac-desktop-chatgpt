/**
 * 工具提示文本，用于托盘等位置
 * @constant {string}
 */
export const TOOLTIP = 'desktop-chatgpt'

/**
 * 支持的模型枚举
 * @enum {string}
 */
export enum Model {
  ChatGPT = 'ChatGPT',
  DeepSeek = 'DeepSeek',
  Grok = 'Grok',
  Gemini = 'Gemini'
}

/**
 * 各模型默认访问 URL
 * @enum {string}
 */
export enum ModelUrl {
  ChatGPT = 'https://chatgpt.com',
  DeepSeek = 'https://chat.deepseek.com/',
  Grok = 'https://grok.com/',
  Gemini = 'https://gemini.google.com/app'
}

/**
 * 窗口行为模式
 * @enum {string}
 */
export enum WindowBehavior {
  AutoHide = 'auto-hide',
  LockOnDesktop = 'lock-on-desktop',
  AlwaysOnTop = 'always-on-top'
}

/**
 * 托盘菜单支持的语言
 * @enum {string}
 */
export enum MenuLanguage {
  English = 'en',
  Chinese = 'zh'
}

/**
 * 主窗口默认宽度
 * @constant {number}
 */
export const MAIN_WINDOW_WIDTH = 1024

/**
 * 主窗口默认高度
 * @constant {number}
 */
export const MAIN_WINDOW_HEIGHT = 768
