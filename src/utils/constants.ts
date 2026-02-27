/**
 * 工具提示文本，用于托盘等位置
 * @constant {string}
 */
export const TOOLTIP = 'ChatHub Desktop'

/**
 * 支持的模型枚举
 * @enum {string}
 */
export enum Model {
  ChatGPT = 'ChatGPT',
  DeepSeek = 'DeepSeek',
  Grok = 'Grok',
  Gemini = 'Gemini',
  Qwen = 'Qwen',
  Doubao = 'Doubao'
}

/**
 * 各模型默认访问 URL
 * @enum {string}
 */
export enum ModelUrl {
  ChatGPT = 'https://chatgpt.com',
  DeepSeek = 'https://chat.deepseek.com/',
  Grok = 'https://grok.com/',
  Gemini = 'https://gemini.google.com/app',
  Qwen = 'https://www.qianwen.com/chat',
  Doubao = 'https://www.doubao.com/chat/'
}

/**
 * 托盘菜单支持的语言
 * @enum {string}
 */
export enum MenuLanguage {
  /**
   * 英语
   */
  English = 'en',
  /**
   * 中文
   */
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

/**
 * 标准 Chrome User-Agent，用于绕过 Google 登录检测
 * @constant {string}
 */
export const CHROME_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
