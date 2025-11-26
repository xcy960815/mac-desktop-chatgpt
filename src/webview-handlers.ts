import { app, shell, WebContents } from 'electron'
import contextMenu from 'electron-context-menu'

import { ElectronMenubar } from './electron-menubar'
import { ModelUrl } from './constants'
import {
  readUserSetting,
  writeUserSetting,
  UserSetting
} from './utils/user-setting'

type UserSettingWithUrls = UserSetting & {
  urls: Required<UserSetting['urls']>
}

/**
 * 确保用户设置中的 URLs 已初始化
 * @returns {UserSetting} 初始化后的用户设置对象
 */
const ensureUrlsInitialized = (): UserSettingWithUrls => {
  const currentSetting = readUserSetting()
  if (!currentSetting.urls) {
    currentSetting.urls = {
      ChatGPT: ModelUrl.ChatGPT,
      DeepSeek: ModelUrl.DeepSeek,
      Grok: ModelUrl.Grok,
      Gemini: ModelUrl.Gemini
    }
  }
  return currentSetting as UserSettingWithUrls
}

/**
 * 保存 WebView 的当前 URL 到用户设置
 * @param {string} url - 要保存的 URL 字符串
 * @returns {void}
 */
const saveWebViewUrl = (url: string) => {
  const currentSetting = ensureUrlsInitialized()
  const currentModel = currentSetting.model
  currentSetting.urls[currentModel] = url
  writeUserSetting(currentSetting)
}

/**
 * 注册导航监听器，监听 WebView 的导航事件
 * @param {WebContents} webContents - WebContents 实例
 * @returns {void}
 */
const registerNavigationListeners = (
  webContents: WebContents
) => {
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

/**
 * 注册加载失败处理器，处理 WebView 加载失败的情况
 * @param {WebContents} webContents - WebContents 实例
 * @param {ElectronMenubar} electronMenubar - Electron 菜单栏实例
 * @returns {void}
 */
const registerLoadFailureHandler = (
  webContents: WebContents,
  electronMenubar: ElectronMenubar
) => {
  webContents.on(
    'did-fail-load',
    (
      _event,
      errorCode,
      errorDescription,
      _validatedURL
    ) => {
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

/**
 * 注册输入快捷键处理器，支持复制、粘贴、撤销等快捷键
 * @param {WebContents} webContents - WebContents 实例
 * @returns {void}
 */
const registerInputShortcuts = (
  webContents: WebContents
) => {
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

/** macOS 隐藏处理器是否已注册 */
let macHideHandlerRegistered = false

/** commandLine.appendSwitch 是否已调用 */
let commandLineSwitchAppended = false

/**
 * 注册 macOS 隐藏处理器
 * @param {ElectronMenubar} electronMenubar - Electron 菜单栏实例
 * @returns {void}
 */
const registerMacHideHandler = (
  electronMenubar: ElectronMenubar
) => {
  if (
    process.platform !== 'darwin' ||
    macHideHandlerRegistered
  ) {
    return
  }

  electronMenubar.on(
    'after-hide',
    ({ app: menubarApp }) => {
      menubarApp.hide()
    }
  )

  macHideHandlerRegistered = true
}

/**
 * 注册 WebContents 处理器，包括导航监听、加载失败处理、输入快捷键等
 * @param {ElectronMenubar} electronMenubar - Electron 菜单栏实例
 * @returns {void}
 */
export const registerWebContentsHandlers = (
  electronMenubar: ElectronMenubar
) => {
  registerMacHideHandler(electronMenubar)

  // 只调用一次 commandLine.appendSwitch
  if (!commandLineSwitchAppended) {
    app.commandLine.appendSwitch(
      'disable-backgrounding-occluded-windows',
      'true'
    )
    commandLineSwitchAppended = true
  }

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
  })
}
