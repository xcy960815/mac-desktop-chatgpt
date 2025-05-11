export {}

declare global {
  interface Window {
    electronAPI: {
      onModelChanged: (
        callback: (modelName: string) => void
      ) => void
    }
  }
}

function setWebviewSrc(modelName: string) {
  const webview = document.getElementById(
    'webview-container'
  ) as HTMLIFrameElement
  const webviewLoading = document.getElementById(
    'webview-loading'
  ) as HTMLDivElement
  const originWebviewUrl = webview?.src

  if (
    originWebviewUrl &&
    originWebviewUrl.includes(modelName.toLocaleLowerCase())
  )
    return
  const webviewUrl =
    modelName === 'DeepSeek'
      ? 'https://chat.deepseek.com/'
      : 'https://chat.openai.com/chat'

  // 显示 webviewLoading
  webviewLoading.classList.add('active')

  // 添加错误处理
  webview.addEventListener('did-fail-load', (event) => {
    console.error('Webview failed to load:', event)
    webviewLoading.classList.remove('active')
  })

  // 添加 SSL 错误处理
  webview.addEventListener('certificate-error', (event) => {
    console.warn('SSL Certificate Error:', event)
    event.preventDefault()
    return true
  })

  webview.src = `${webviewUrl}`

  // 监听 webview 加载完成
  webview.addEventListener('did-stop-loading', () => {
    webviewLoading.classList.remove('active')
  })
}

window.electronAPI.onModelChanged(setWebviewSrc)
