export {}

declare global {
  interface Window {
    electronAPI: {
      onModelChanged: (
        callback: (modelName: string, url?: string) => void
      ) => void
      onLoadError: (
        callback: (errorMessage: string) => void
      ) => void
    }
  }
}

function setWebviewSrc(
  modelName: string,
  savedUrl?: string
) {
  console.log('🎨 [渲染进程] 收到模型变化事件')
  console.log(
    '📝 [参数] 模型名:',
    modelName,
    ', 保存的URL:',
    savedUrl
  )

  const webview = document.getElementById(
    'webview-container'
  ) as HTMLIFrameElement
  const webviewLoading = document.getElementById(
    'webview-loading'
  ) as HTMLDivElement
  const originWebviewUrl = webview?.src
  console.log(
    '🔍 [当前] WebView 当前 URL:',
    originWebviewUrl
  )

  // 如果有保存的 URL，优先使用保存的 URL
  let webviewUrl: string
  if (savedUrl) {
    webviewUrl = savedUrl
    console.log('✅ [使用] 使用保存的 URL:', savedUrl)
  } else {
    // 否则使用默认 URL
    webviewUrl =
      modelName === 'DeepSeek'
        ? 'https://chat.deepseek.com/'
        : 'https://chatgpt.com'
    console.log('⚠️  [默认] 使用默认 URL:', webviewUrl)
  }

  // 如果 URL 相同，不重复加载
  if (originWebviewUrl && originWebviewUrl === webviewUrl) {
    console.log('⏭️  [跳过] URL 相同，跳过加载')
    return
  }

  // 显示 webviewLoading
  console.log('🔄 [加载] 开始加载 WebView:', webviewUrl)
  webviewLoading.classList.add('active')
  webview.src = webviewUrl
  // 监听 webview 加载完成
  webview.addEventListener('did-stop-loading', () => {
    console.log('✅ [完成] WebView 加载完成')
    webviewLoading.classList.remove('active')
  })
}

// 显示错误提示
function showError(errorMessage: string) {
  console.log('❌ [显示错误] 错误信息:', errorMessage)
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

// 隐藏错误提示
function hideError() {
  const webviewError = document.getElementById(
    'webview-error'
  ) as HTMLDivElement
  webviewError.classList.remove('active')
}

// 重试按钮点击事件
const retryButton = document.getElementById('retry-button')
retryButton?.addEventListener('click', () => {
  console.log('🔄 [重试] 用户点击重试按钮')
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
