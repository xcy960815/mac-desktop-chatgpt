import { Model, ModelUrl } from './constants'

export {}

declare global {
  interface Window {
    electronAPI: {
      /**
       * 模型改变回调
       * @param {(modelName: string, url?: string) => void} callback
       * @returns {void}
       */
      onModelChanged: (
        callback: (modelName: string, url?: string) => void
      ) => void
      /**
       * 加载错误回调
       * @param {(errorMessage: string) => void} callback
       * @returns {void}
       */
      onLoadError: (
        callback: (errorMessage: string) => void
      ) => void
      /**
       * 箭头位置更新回调
       * @param {(offset: number) => void} callback
       * @returns {void}
       */
      onArrowPositionUpdate: (
        callback: (offset: number) => void
      ) => void
      /**
       * 平台
       * @returns {string}
       */
      platform: string
      /**
       * Webview Preload 脚本路径
       * @returns {string}
       */
      webviewPreloadPath: string
    }
  }
}

/**
 * 设置 webview 地址
 * @param {string} modelName - 模型名称
 * @param {string} [savedUrl] - 保存的 URL（可选）
 * @returns {void}
 */
function setWebviewSrc(
  modelName: string,
  savedUrl?: string
) {
  const webview = document.getElementById(
    'webview-container'
  ) as HTMLIFrameElement & {
    preload: string
    useragent: string
    openDevTools: () => void
  }
  const webviewLoading = document.getElementById(
    'webview-loading'
  ) as HTMLDivElement
  const originWebviewUrl = webview?.src

  // 设置 preload 脚本
  if (window.electronAPI.webviewPreloadPath) {
    webview.preload = `file://${window.electronAPI.webviewPreloadPath}`
  }

  // 动态设置 User-Agent，移除 Electron 标识，保持 Chrome 版本一致
  const userAgent = navigator.userAgent
    .replace(/Electron\/[0-9.]+\s/, '')
    .replace(/desktop-chatgpt\/[0-9.]+\s/, '')
  console.log('Setting webview useragent:', userAgent)
  webview.useragent = userAgent

  // 如果有保存的 URL，优先使用保存的 URL
  let webviewUrl: string
  if (savedUrl) {
    webviewUrl = savedUrl
  } else {
    // 否则使用默认 URL
    webviewUrl =
      modelName === Model.DeepSeek
        ? ModelUrl.DeepSeek
        : modelName === Model.ChatGPT
        ? ModelUrl.ChatGPT
        : modelName === Model.Gemini
        ? ModelUrl.Gemini
        : ModelUrl.Grok
  }

  // 如果 URL 相同，不重复加载
  if (originWebviewUrl && originWebviewUrl === webviewUrl) {
    return
  }

  // 显示 webviewLoading
  webviewLoading.classList.add('active')
  webview.src = webviewUrl
  // 监听 webview 加载完成
  webview.addEventListener('did-stop-loading', () => {
    webviewLoading.classList.remove('active')
  })

  // 调试：自动打开 Webview 开发者工具以便查看日志
  webview.addEventListener('dom-ready', () => {
    webview.openDevTools()
  })
}

/**
 * 显示错误提示
 * @param {string} errorMessage - 错误消息文本
 * @returns {void}
 */
function showError(errorMessage: string) {
  const webviewLoading = document.getElementById(
    'webview-loading'
  ) as HTMLDivElement
  const webviewError = document.getElementById(
    'webview-error'
  ) as HTMLDivElement
  const errorMessageEl = document.getElementById(
    'error-message'
  ) as HTMLDivElement

  // 隐藏加载动画
  webviewLoading.classList.remove('active')
  // 显示错误提示
  errorMessageEl.textContent = errorMessage
  webviewError.classList.add('active')
}

/**
 * 隐藏错误提示
 * @returns {void}
 */
function hideError() {
  const webviewError = document.getElementById(
    'webview-error'
  ) as HTMLDivElement
  webviewError.classList.remove('active')
}

/**
 * 重试按钮点击事件
 * @returns {void}
 */
type WebviewElementWithReload = HTMLIFrameElement & {
  reload: () => void
}

const retryButton = document.getElementById('retry-button')
retryButton?.addEventListener('click', () => {
  hideError()
  const webview = document.getElementById(
    'webview-container'
  ) as WebviewElementWithReload | null
  if (webview && webview.src) {
    const webviewLoading = document.getElementById(
      'webview-loading'
    ) as HTMLDivElement
    webviewLoading.classList.add('active')
    webview.reload()
  }
})

window.electronAPI.onModelChanged(setWebviewSrc)
window.electronAPI.onLoadError(showError)
window.electronAPI.onArrowPositionUpdate((offset) => {
  const triangle = document.querySelector(
    '.triangle'
  ) as HTMLDivElement | null
  if (!triangle) {
    return
  }
  const clampedOffset = Math.max(0, offset)
  triangle.style.left = `${clampedOffset}px`
})

/**
 * 根据平台为 body 添加 class
 * @returns {void}
 */
const platform = window.electronAPI.platform
document.body.classList.add(`platform-${platform}`)
