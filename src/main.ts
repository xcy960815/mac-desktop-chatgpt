import * as path from 'path'

import { ElectronMenubar } from './electron-menubar'
import { setupTrayContextMenu } from './tray-context-menu'
import { ModelUrl, TOOLTIP, Model } from './constants'

import contextMenu from 'electron-context-menu'

import {
  app,
  globalShortcut,
  nativeImage,
  Tray,
  shell,
  Menu,
  ipcMain,
  dialog,
  BrowserWindow
} from 'electron'

import {
  readUserSetting,
  writeUserSetting,
  resetUserUrls
} from './utils/user-setting'
import { delay } from './utils/delay'

app.commandLine.appendSwitch('ignore-certificate-errors')

// 保存 browserWindow 引用，以便在菜单点击时使用
let mainBrowserWindow: BrowserWindow | null = null
// 标记 ready 事件是否已触发
let isMenubarReady = false

app.on('ready', () => {
  const appPath = app.getAppPath()
  /**
   * @desc 创建菜单栏图标
   * @type {Tray}
   * @param {nativeImage} image - 图标
   */
  const image = nativeImage.createFromPath(
    path.join(appPath, 'images', `gptIconTemplate.png`)
  )

  const tray = new Tray(image)

  // 判断开发环境还是生产环境
  const isDev = !!MAIN_WINDOW_VITE_DEV_SERVER_URL
  const indexUrl = isDev
    ? MAIN_WINDOW_VITE_DEV_SERVER_URL
    : // 在打包后的应用中，__dirname 指向 /.vite/build（在 asar 包内），所以正确的相对路径应该是
      // ./renderer/main_window/index.html，而不是 ../renderer/main_window/index.html。
      `file://${path.join(
        __dirname,
        './renderer/main_window/index.html'
      )}`

  const electronMenubar = new ElectronMenubar(app, {
    browserWindow: {
      icon: image,
      transparent: true,
      width: 1024,
      height: 768,
      useContentSize: true,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        // 启用webview标签
        webviewTag: true,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false
      }
    },
    index: indexUrl,
    tray,
    dir: appPath,
    showOnAllWorkspaces: true,
    preloadWindow: true,
    showDockIcon: false,
    icon: image,
    tooltip: TOOLTIP
  })

  // 创建输入对话框的函数

  electronMenubar.on('ready', async (menubar) => {
    // 从 menubar 实例获取 browserWindow
    const browserWindow = menubar.browserWindow
    if (!browserWindow) {
      console.error(
        '❌ ready 事件触发时 browserWindow 不存在'
      )
      return
    }
    // 保存 browserWindow 引用
    mainBrowserWindow = browserWindow
    isMenubarReady = true
    console.log(
      '✅ Menubar ready 事件已触发，browserWindow 已保存'
    )

    async function ensureBrowserWindow(): Promise<BrowserWindow | null> {
      const candidates = [
        mainBrowserWindow,
        electronMenubar.browserWindow,
        browserWindow
      ]
      for (const candidate of candidates) {
        if (candidate && !candidate.isDestroyed()) {
          mainBrowserWindow = candidate
          return candidate
        }
      }

      try {
        await electronMenubar.showWindow()
        await delay(150)
        const refreshedWindow =
          electronMenubar.browserWindow || mainBrowserWindow
        if (
          refreshedWindow &&
          !refreshedWindow.isDestroyed()
        ) {
          mainBrowserWindow = refreshedWindow
          return refreshedWindow
        }
      } catch (error) {
        console.error(
          '❌ 确保 BrowserWindow 存在时出错',
          error
        )
      }

      return null
    }

    async function withBrowserWindow<T>(
      task: (win: BrowserWindow) => T | Promise<T>,
      options?: {
        onFailureMessage?: string
      }
    ): Promise<T | null> {
      let lastError: unknown = null
      for (let attempt = 0; attempt < 3; attempt++) {
        const win = await ensureBrowserWindow()
        if (!win) {
          lastError = new Error('窗口不可用')
          break
        }
        if (win.isDestroyed()) {
          mainBrowserWindow = null
          await delay(50)
          continue
        }
        try {
          return await task(win)
        } catch (error) {
          lastError = error
          if (
            error instanceof Error &&
            /Object has been destroyed/i.test(error.message)
          ) {
            console.warn(
              '⚠️ 窗口已销毁，尝试重新获取窗口 (attempt %s)',
              attempt + 1
            )
            mainBrowserWindow = null
            await delay(50)
            continue
          }
          throw error
        }
      }

      dialog.showMessageBox(
        (mainBrowserWindow &&
        !mainBrowserWindow.isDestroyed()
          ? mainBrowserWindow
          : undefined) || undefined,
        {
          type: 'error',
          title: '错误',
          message:
            options?.onFailureMessage ||
            '窗口不可用，请稍后重试',
          detail:
            lastError instanceof Error
              ? lastError.message
              : undefined,
          buttons: ['确定']
        }
      )
      return null
    }

    if (process.platform === 'darwin') {
      app.dock.hide()
    } else if (process.platform === 'linux') {
      browserWindow.setSkipTaskbar(true)
    }

    // 读取上次访问的 URL
    const userSetting = readUserSetting()
    if (userSetting.lastVisitedUrl) {
      browserWindow.loadURL(userSetting.lastVisitedUrl)
    }

    // 监听 URL 变化
    browserWindow.webContents.on(
      'did-navigate',
      (_event, url) => {
        const currentSetting = readUserSetting()
        writeUserSetting({
          ...currentSetting,
          lastVisitedUrl: url
        })
      }
    )

    const menu = new Menu()
    let currentShortcut: string | null = null

    setupTrayContextMenu({
      tray,
      electronMenubar,
      menu,
      urls: {
        chatgpt: ModelUrl.ChatGPT,
        deepseek: ModelUrl.DeepSeek,
        grok: ModelUrl.Grok,
        gemini: ModelUrl.Gemini
      },
      isMenubarReady: () => isMenubarReady,
      getMainBrowserWindow: () => mainBrowserWindow,
      setMainBrowserWindow: (window) => {
        mainBrowserWindow = window
      },
      getCurrentShortcut: () => currentShortcut,
      setCurrentShortcut: (shortcut) => {
        currentShortcut = shortcut
      },
      withBrowserWindow
    })

    // 注册快捷键的函数
    const registerToggleShortcut = () => {
      // 先注销旧的快捷键
      if (currentShortcut) {
        globalShortcut.unregister(currentShortcut)
      }

      // 从用户设置读取快捷键
      const userSetting = readUserSetting()
      const shortcut =
        userSetting.toggleShortcut || 'CommandOrControl+g'

      // 注册新的快捷键
      const registered = globalShortcut.register(
        shortcut,
        () => {
          const menubarVisible = browserWindow.isVisible()
          if (menubarVisible) {
            electronMenubar.hideWindow()
          } else {
            electronMenubar.showWindow()
            if (process.platform == 'darwin') {
              electronMenubar.app.show()
            }
            electronMenubar.app.focus()
          }
        }
      )

      if (registered) {
        currentShortcut = shortcut
        console.log(`✅ 快捷键注册成功: ${shortcut}`)
      } else {
        console.error(`❌ 快捷键注册失败: ${shortcut}`)
        // 如果注册失败，尝试使用默认快捷键
        if (shortcut !== 'CommandOrControl+g') {
          const defaultRegistered = globalShortcut.register(
            'CommandOrControl+g',
            () => {
              const menubarVisible =
                browserWindow.isVisible()
              if (menubarVisible) {
                electronMenubar.hideWindow()
              } else {
                electronMenubar.showWindow()
                if (process.platform == 'darwin') {
                  electronMenubar.app.show()
                }
                electronMenubar.app.focus()
              }
            }
          )
          if (defaultRegistered) {
            currentShortcut = 'CommandOrControl+g'
            console.log(
              `✅ 使用默认快捷键: CommandOrControl+g`
            )
          }
        }
      }
    }

    // 初始注册快捷键
    registerToggleShortcut()

    // IPC 处理程序：设置快捷键
    ipcMain.handle(
      'set-toggle-shortcut',
      async (_event, shortcut: string) => {
        // 验证快捷键格式
        if (!shortcut || shortcut.trim() === '') {
          return {
            success: false,
            message: '快捷键不能为空'
          }
        }

        // 先注销当前快捷键
        if (currentShortcut) {
          globalShortcut.unregister(currentShortcut)
        }

        // 尝试注册新快捷键
        const registered = globalShortcut.register(
          shortcut,
          () => {
            const menubarVisible = browserWindow.isVisible()
            if (menubarVisible) {
              electronMenubar.hideWindow()
            } else {
              electronMenubar.showWindow()
              if (process.platform == 'darwin') {
                electronMenubar.app.show()
              }
              electronMenubar.app.focus()
            }
          }
        )

        if (registered) {
          // 保存到用户设置
          const userSetting = readUserSetting()
          writeUserSetting({
            ...userSetting,
            toggleShortcut: shortcut
          })
          currentShortcut = shortcut
          return {
            success: true,
            message: '快捷键设置成功'
          }
        } else {
          // 如果注册失败，恢复旧快捷键
          if (currentShortcut) {
            globalShortcut.register(currentShortcut, () => {
              const menubarVisible =
                browserWindow.isVisible()
              if (menubarVisible) {
                electronMenubar.hideWindow()
              } else {
                electronMenubar.showWindow()
                if (process.platform == 'darwin') {
                  electronMenubar.app.show()
                }
                electronMenubar.app.focus()
              }
            })
          }
          return {
            success: false,
            message:
              '快捷键已被占用或格式不正确，请尝试其他快捷键'
          }
        }
      }
    )

    // IPC 处理程序：获取当前快捷键
    ipcMain.handle('get-toggle-shortcut', () => {
      const userSetting = readUserSetting()
      return (
        userSetting.toggleShortcut || 'CommandOrControl+g'
      )
    })

    Menu.setApplicationMenu(menu)

    // 打开开发工具
    // browserWindow.webContents.openDevTools();
  })

  electronMenubar.on(
    'after-show',
    async ({ browserWindow }) => {
      const userSetting = readUserSetting()
      const savedUrl =
        userSetting.urls?.[userSetting.model] ||
        (userSetting.model === Model.DeepSeek
          ? ModelUrl.DeepSeek
          : userSetting.model === Model.ChatGPT
          ? ModelUrl.ChatGPT
          : userSetting.model === Model.Gemini
          ? ModelUrl.Gemini
          : ModelUrl.Grok)

      browserWindow.webContents.send(
        'model-changed',
        userSetting.model,
        savedUrl
      )
    }
  )

  app.on('web-contents-created', (_event, webContents) => {
    const webContentType = webContents.getType()

    if (webContentType == 'webview') {
      // 保存 URL 的函数
      const saveWebViewUrl = (
        url: string,
        eventType: string
      ) => {
        const currentSetting = readUserSetting()
        const currentModel = currentSetting.model

        // 确保 urls 对象存在
        if (!currentSetting.urls) {
          currentSetting.urls = {
            ChatGPT: ModelUrl.ChatGPT,
            DeepSeek: ModelUrl.DeepSeek,
            Grok: ModelUrl.Grok,
            Gemini: ModelUrl.Gemini
          }
        }

        // 保存当前模型的 URL
        currentSetting.urls[currentModel] = url

        writeUserSetting(currentSetting)
      }

      // 监听加载失败事件
      webContents.on(
        'did-fail-load',
        (
          event,
          errorCode,
          errorDescription,
          validatedURL
        ) => {
          console.error(
            `❌ [加载失败] URL: ${validatedURL}`
          )
          console.error(
            `❌ [错误码] ${errorCode}: ${errorDescription}`
          )

          // 忽略某些非关键错误
          // -3 = ERR_ABORTED (用户主动取消)
          // -102 = ERR_CONNECTION_REFUSED
          // -7 = ERR_TIMED_OUT
          if (errorCode !== -3 && Math.abs(errorCode) > 0) {
            // 发送错误消息到渲染进程
            const errorMessages: { [key: string]: string } =
              {
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

            // 如果是超时错误，5秒后自动重试
            if (errorCode === -7) {
              setTimeout(() => {
                webContents.reload()
              }, 5000)
            }
          }
        }
      )

      // 监听各种导航事件
      webContents.on('did-navigate', (_event, url) => {
        saveWebViewUrl(url, 'did-navigate')
      })

      // 监听页面内导航（单页应用的路由变化）
      webContents.on(
        'did-navigate-in-page',
        (_event, url) => {
          saveWebViewUrl(url, 'did-navigate-in-page')
        }
      )

      // 监听导航完成
      webContents.on('did-finish-load', () => {
        const url = webContents.getURL()
      })

      // 在 webview 中使用外部浏览器打开链接
      webContents.setWindowOpenHandler(({ url }) => {
        // 调用默认浏览器打开
        shell.openExternal(url)
        // 阻止当前浏览器打开页面
        return { action: 'deny' }
      })

      // 在 webview 中设置上下文菜单
      contextMenu({
        window: webContents
      })

      // 手动注册快捷键
      webContents.on(
        'before-input-event',
        (_event, input) => {
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
        }
      )

      if (process.platform == 'darwin') {
        electronMenubar.on('after-hide', ({ app }) => {
          app.hide()
        })
      }
      // 防止背景闪烁
      app.commandLine.appendSwitch(
        'disable-backgrounding-occluded-windows',
        'true'
      )
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 应用退出时注销所有快捷键
app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})
