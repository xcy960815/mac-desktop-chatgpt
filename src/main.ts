import * as path from 'path'

import { ElectronMenubar } from './electron-menubar'

import contextMenu from 'electron-context-menu'

import {
  app,
  globalShortcut,
  nativeImage,
  Tray,
  shell,
  Menu
} from 'electron'

import {
  readUserSetting,
  writeUserSetting,
  resetUserUrls
} from './utils/user-setting'

// import electronSquirrelStartup from 'electron-squirrel-startup'

app.commandLine.appendSwitch('ignore-certificate-errors')

// if (electronSquirrelStartup) {
//   app.quit();
// }

const TOOLTIP = 'desktop-chatgpt'

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
    index: MAIN_WINDOW_VITE_DEV_SERVER_URL || false,
    tray,
    dir: appPath,
    showOnAllWorkspaces: true,
    preloadWindow: true,
    showDockIcon: false,
    icon: image,
    tooltip: TOOLTIP
  })

  electronMenubar.on('ready', async ({ browserWindow }) => {
    if (process.platform !== 'darwin') {
      browserWindow.setSkipTaskbar(true)
    } else {
      app.dock.hide()
    }

    // 读取上次访问的 URL
    const userSetting = readUserSetting()
    if (userSetting.lastVisitedUrl) {
      browserWindow.loadURL(userSetting.lastVisitedUrl)
    }

    // 监听 URL 变化
    browserWindow.webContents.on(
      'did-navigate',
      (event, url) => {
        const currentSetting = readUserSetting()
        writeUserSetting({
          ...currentSetting,
          lastVisitedUrl: url
        })
      }
    )

    /**
     * 构建右键菜单
     */
    function buildContextMenu() {
      const userSetting = readUserSetting()
      const isChatGPT = userSetting.model === 'ChatGPT'
      const isDeepSeek = userSetting.model === 'DeepSeek'
      electronMenubar.tray.popUpContextMenu(
        Menu.buildFromTemplate([
          {
            label: 'Quit',
            accelerator: 'Command+Q',
            click: () => {
              resetUserUrls()
              app.quit()
            }
          },
          {
            label: 'Reload',
            accelerator: 'Command+R',
            click: () => {
              resetUserUrls()
              browserWindow.reload()
            }
          },
          {
            label: 'Open in browser',
            accelerator: 'Command+O',
            click: async () => {
              if (isChatGPT) {
                shell.openExternal('https://chatgpt.com')
              }
              if (isDeepSeek) {
                shell.openExternal(
                  'https://chat.deepseek.com/'
                )
              }
            }
          },
          {
            label: 'model',
            submenu: [
              {
                label: 'ChatGPT',
                type: 'radio',
                checked: isChatGPT,
                click: () => {
                  const userSetting = readUserSetting()
                  const newUserSetting = writeUserSetting({
                    ...userSetting,
                    model: 'ChatGPT'
                  })
                  electronMenubar.tray.popUpContextMenu(
                    menu
                  )
                  const savedUrl =
                    newUserSetting.urls?.ChatGPT ||
                    'https://chatgpt.com'
                  browserWindow?.webContents.send(
                    'model-changed',
                    newUserSetting.model,
                    savedUrl
                  )
                }
              },
              { type: 'separator' }, // 分隔线
              {
                label: 'DeepSeek',
                type: 'radio',
                checked: isDeepSeek,
                click: () => {
                  const userSetting = readUserSetting()
                  const newUserSetting = writeUserSetting({
                    ...userSetting,
                    model: 'DeepSeek'
                  })
                  electronMenubar.tray.popUpContextMenu(
                    menu
                  )
                  const savedUrl =
                    newUserSetting.urls?.DeepSeek ||
                    'https://chat.deepseek.com/'
                  browserWindow?.webContents.send(
                    'model-changed',
                    newUserSetting.model,
                    savedUrl
                  )
                }
              }
            ]
          }
        ])
      )
    }

    // 右键菜单 弹出菜单
    tray.on('right-click', () => {
      buildContextMenu()
    })

    // 左键事件 组合点击 ctrl + 左键 或者 command + 左键 弹出菜单
    tray.on('click', (e) => {
      const isCtrlOrMetaKey = e.ctrlKey || e.metaKey
      isCtrlOrMetaKey && buildContextMenu()
    })

    const menu = new Menu()

    // 添加快捷键
    globalShortcut.register('CommandOrControl+g', () => {
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
        (userSetting.model === 'DeepSeek'
          ? 'https://chat.deepseek.com/'
          : 'https://chatgpt.com')
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
            ChatGPT: 'https://chatgpt.com',
            DeepSeek: 'https://chat.deepseek.com/'
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
