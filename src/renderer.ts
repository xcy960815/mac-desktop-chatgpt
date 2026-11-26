import { Model, ModelUrl } from '@/utils/constants'

declare global {
  interface Window {
    electronAPI: {
      onModelChanged(
        callback: (model: Model, url?: string) => void
      ): void
      onReloadCurrentModel(callback: () => void): void
      platform: string
      webviewPreloadUrl: string
    }
  }
}

const webview = document.getElementById(
  'webview-container'
) as Electron.WebviewTag
const loading = document.getElementById('webview-loading')
const error = document.getElementById('webview-error')
const message = document.getElementById('error-message')
const api = window.electronAPI
webview.preload = api.webviewPreloadUrl

let retryTimer: ReturnType<typeof setTimeout>

function startLoading() {
  clearTimeout(retryTimer)
  error.classList.remove('active')
  loading.classList.add('active')
}

function reloadCurrentModel() {
  if (!webview.src) return
  startLoading()
  webview.reload()
}

webview.addEventListener('did-start-loading', startLoading)
webview.addEventListener('did-stop-loading', () => {
  loading.classList.remove('active')
})
const networkErrors: Record<number, string> = {
  [-7]: '网络连接超时，请检查您的网络连接',
  [-100]: '网络连接意外断开，请检查代理设置',
  [-102]: '无法连接到服务器，请稍后重试',
  [-105]: 'DNS 解析失败，请检查网络设置',
  [-106]: '无法访问互联网，请检查网络连接',
  [-109]: '无法访问该地址',
  [-138]: '网络访问被拒绝'
}

webview.addEventListener('did-fail-load', (event) => {
  const { errorCode, isMainFrame, errorDescription } = event
  if (!isMainFrame || errorCode === -3 || errorCode === 0)
    return
  clearTimeout(retryTimer)
  loading.classList.remove('active')
  message.textContent =
    networkErrors[errorCode] ||
    `加载失败: ${errorDescription} (错误码: ${errorCode})`
  error.classList.add('active')
  if (errorCode === -7)
    retryTimer = setTimeout(reloadCurrentModel, 5000)
})
api.onModelChanged((model, savedUrl) => {
  const url = savedUrl || ModelUrl[model]
  if (webview.src === url) {
    if (error.classList.contains('active'))
      reloadCurrentModel()
    return
  }
  startLoading()
  webview.src = url
})
api.onReloadCurrentModel(reloadCurrentModel)
document
  .getElementById('retry-button')
  .addEventListener('click', reloadCurrentModel)
document.body.classList.add(`platform-${api.platform}`)
