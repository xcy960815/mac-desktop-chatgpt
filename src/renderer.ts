export {}

declare global {
  interface Window {
    electronAPI: {
      onModelChanged: (
        callback: (modelName: string, url?: string) => void
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
        : 'https://chat.openai.com/chat'
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

window.electronAPI.onModelChanged(setWebviewSrc)
