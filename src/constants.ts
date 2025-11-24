/**
 * @description 工具提示文本，用于托盘等位置
 */
export const TOOLTIP = 'desktop-chatgpt'

/**
 * @description 支持的模型枚举
 */
export enum Model {
  ChatGPT = 'ChatGPT',
  DeepSeek = 'DeepSeek',
  Grok = 'Grok',
  Gemini = 'Gemini'
}

/**
 * @description 各模型默认访问 URL
 */
export enum ModelUrl {
  ChatGPT = 'https://chatgpt.com',
  DeepSeek = 'https://chat.deepseek.com/',
  Grok = 'https://grok.com/',
  Gemini = 'https://gemini.google.com/app'
}

/**
 * @description 窗口行为模式
 */
export enum WindowBehavior {
  AutoHide = 'auto-hide',
  LockOnDesktop = 'lock-on-desktop',
  AlwaysOnTop = 'always-on-top'
}

/**
 * @description 托盘菜单支持的语言
 */
export enum MenuLanguage {
  English = 'en',
  Chinese = 'zh'
}

/**
 * @description 主窗口默认宽度
 */
export const MAIN_WINDOW_WIDTH = 1024

/**
 * @description 主窗口默认高度
 */
export const MAIN_WINDOW_HEIGHT = 768
