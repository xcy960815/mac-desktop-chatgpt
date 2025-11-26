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
       * 平台
       * @returns {string}
       */
      platform: string
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
  ) as HTMLIFrameElement
  const webviewLoading = document.getElementById(
    'webview-loading'
  ) as HTMLDivElement
  const originWebviewUrl = webview?.src

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
const retryButton = document.getElementById('retry-button')
retryButton?.addEventListener('click', () => {
  hideError()
  const webview = document.getElementById(
    'webview-container'
  ) as any // webview 是 Electron 的特殊标签
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

/**
 * 根据平台为 body 添加 class
 * @returns {void}
 */
const platform = window.electronAPI.platform
document.body.classList.add(`platform-${platform}`)
