export {}

declare global {
  interface Window {
    electronAPI: {
      onModelChanged: (
        callback: (modelName: string) => void
      ) => void
    }
  }

  interface HTMLIFrameElement {
    executeJavaScript: (code: string) => Promise<any>
  }
}

// 监听主题变化
function handleThemeChange(
  e: MediaQueryListEvent | MediaQueryList
) {
  const isDark = e.matches
  document.documentElement.style.setProperty(
    '--bg-color',
    isDark ? '#343541' : '#ffffff'
  )
}

// 初始化主题监听
const darkModeMediaQuery = window.matchMedia(
  '(prefers-color-scheme: dark)'
)
darkModeMediaQuery.addEventListener(
  'change',
  handleThemeChange
)
// 初始化时也要执行一次
handleThemeChange(darkModeMediaQuery)

// 获取背景色并更新
function updateBackgroundColor(webview: any) {
  if (webview && webview.executeJavaScript) {
    webview
      .executeJavaScript(
        `
      const bgColor = window.getComputedStyle(document.body).backgroundColor;
      window.electronAPI.updateBackgroundColor(bgColor);
    `
      )
      .catch(console.error)
  }
}

function setWebviewSrc(modelName: string) {
  const webview = document.getElementById(
    'webview-container'
  ) as any
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
  webview.addEventListener(
    'did-fail-load',
    (event: any) => {
      console.error('Webview failed to load:', event)
      webviewLoading.classList.remove('active')
    }
  )

  // 添加 SSL 错误处理
  webview.addEventListener(
    'certificate-error',
    (event: any) => {
      console.warn('SSL Certificate Error:', event)
      event.preventDefault()
      return true
    }
  )

  webview.src = `${webviewUrl}`

  // 监听 webview 加载完成
  webview.addEventListener('did-stop-loading', () => {
    webviewLoading.classList.remove('active')

    // 监听 webview 背景色变化
    webview.addEventListener('dom-ready', () => {
      // 立即获取一次背景色
      updateBackgroundColor(webview)

      // 设置观察器监听后续变化
      webview
        .executeJavaScript(
          `
        const observer = new MutationObserver((mutations) => {
          const bgColor = window.getComputedStyle(document.body).backgroundColor;
          window.electronAPI.updateBackgroundColor(bgColor);
        });
        
        observer.observe(document.body, {
          attributes: true,
          attributeFilter: ['style', 'class']
        });
      `
        )
        .catch(console.error)
    })
  })
}

// 监听弹框显示事件
document.addEventListener('DOMContentLoaded', () => {
  const webview = document.getElementById(
    'webview-container'
  ) as any
  if (webview) {
    webview.addEventListener('dom-ready', () => {
      updateBackgroundColor(webview)
    })
  }
})

window.electronAPI.onModelChanged(setWebviewSrc)
