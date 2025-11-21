import { app, shell, WebContents } from 'electron'
import contextMenu from 'electron-context-menu'

import { ElectronMenubar } from './electron-menubar'
import { ModelUrl } from './constants'
import { readUserSetting, writeUserSetting } from './utils/user-setting'
const ensureUrlsInitialized = () => {
  const currentSetting = readUserSetting()
  if (!currentSetting.urls) {
    currentSetting.urls = {
      ChatGPT: ModelUrl.ChatGPT,
      DeepSeek: ModelUrl.DeepSeek,
      Grok: ModelUrl.Grok,
      Gemini: ModelUrl.Gemini
    }
  }
  return currentSetting
}

const saveWebViewUrl = (url: string) => {
  const currentSetting = ensureUrlsInitialized()
  const currentModel = currentSetting.model
  if (!currentSetting.urls) {
    currentSetting.urls = {
      ChatGPT: ModelUrl.ChatGPT,
      DeepSeek: ModelUrl.DeepSeek,
      Grok: ModelUrl.Grok,
      Gemini: ModelUrl.Gemini
    }
  }
  currentSetting.urls[currentModel] = url
  writeUserSetting(currentSetting)
}

const registerNavigationListeners = (webContents: WebContents) => {
  webContents.on('did-navigate', (_event, url) => {
    saveWebViewUrl(url)
  })

  webContents.on('did-navigate-in-page', (_event, url) => {
    saveWebViewUrl(url)
  })

  webContents.on('did-finish-load', () => {
    const url = webContents.getURL()
    if (url) {
      saveWebViewUrl(url)
    }
  })
}

const registerLoadFailureHandler = (
  webContents: WebContents,
  electronMenubar: ElectronMenubar
) => {
  webContents.on(
    'did-fail-load',
    (_event, errorCode, errorDescription, validatedURL) => {
      console.error(`❌ [加载失败] URL: ${validatedURL}`)
      console.error(`❌ [错误码] ${errorCode}: ${errorDescription}`)

      if (errorCode === -3 || Math.abs(errorCode) === 0) {
        return
      }

      const errorMessages: { [key: string]: string } = {
        '-7': '网络连接超时，请检查您的网络连接',
        '-102': '无法连接到服务器，请稍后重试',
        '-105': 'DNS 解析失败，请检查网络设置',
        '-106': '无法访问互联网，请检查网络连接',
        '-109': '无法访问该地址',
        '-138': '网络访问被拒绝'
      }

      const errorMessage =
        errorMessages[errorCode.toString()] ||
        `加载失败: ${errorDescription} (错误码: ${errorCode})`

      electronMenubar.browserWindow?.webContents.send(
        'load-error',
        errorMessage
      )

      if (errorCode === -7) {
        setTimeout(() => {
          webContents.reload()
        }, 5000)
      }
    }
  )
}

const registerInputShortcuts = (webContents: WebContents) => {
  webContents.on('before-input-event', (_event, input) => {
    const { control, meta, key } = input
    if (!control && !meta) return

    switch (key) {
      case 'x':
        webContents.cut()
        break
      case 'c':
        webContents.copy()
        break
      case 'v':
        webContents.paste()
        break
      case 'a':
        webContents.selectAll()
        break
      case 'z':
        webContents.undo()
        break
      case 'y':
        webContents.redo()
        break
      case 'q':
        app.quit()
        break
      case 'r':
        webContents.reload()
        break
    }
  })
}

let macHideHandlerRegistered = false

const registerMacHideHandler = (electronMenubar: ElectronMenubar) => {
  if (process.platform !== 'darwin' || macHideHandlerRegistered) {
    return
  }

  electronMenubar.on('after-hide', ({ app: menubarApp }) => {
    menubarApp.hide()
  })

  macHideHandlerRegistered = true
}

export const registerWebContentsHandlers = (
  electronMenubar: ElectronMenubar
) => {
  registerMacHideHandler(electronMenubar)

  app.on('web-contents-created', (_event, webContents) => {
    if (webContents.getType() !== 'webview') {
      return
    }

    registerLoadFailureHandler(webContents, electronMenubar)
    registerNavigationListeners(webContents)

    webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url)
      return { action: 'deny' }
    })

    contextMenu({
      window: webContents
    })

    registerInputShortcuts(webContents)

    app.commandLine.appendSwitch(
      'disable-backgrounding-occluded-windows',
      'true'
    )
  })
}

