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
  writeUserSetting
} from './utils/user-setting'

// import electronSquirrelStartup from 'electron-squirrel-startup'

// 添加开发服务器 URL
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string

app.commandLine.appendSwitch(
  '--ignore-certificate-errors',
  'true'
)

// if (electronSquirrelStartup) {
//   app.quit();
// }

const TOOLTIP = 'mac-desktop-chatgpt'

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
    index: MAIN_WINDOW_VITE_DEV_SERVER_URL,
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

    /**
     * 构建右键菜单
     */
    function buildContextMenu() {
      const userSetting = readUserSetting()
      // const userSetting = {
      //   model:"ChatGPT"
      // }
      const isChatGPT = userSetting.model === 'ChatGPT'
      const isDeepSeek = userSetting.model === 'DeepSeek'
      electronMenubar.tray.popUpContextMenu(
        Menu.buildFromTemplate([
          {
            label: 'Quit',
            accelerator: 'Command+Q',
            click: () => {
              app.quit()
            }
          },
          {
            label: 'Reload',
            accelerator: 'Command+R',
            click: () => {
              browserWindow.reload()
            }
          },
          {
            label: 'Open in browser',
            accelerator: 'Command+O',
            click: async () => {
              if (isChatGPT) {
                shell.openExternal(
                  'https://chat.openai.com/chat'
                )
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
                  browserWindow?.webContents.send(
                    'model-changed',
                    newUserSetting.model
                  )
                  // browserWindow?.webContents.send('model-changed', "ChatGPT");
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
                  browserWindow?.webContents.send(
                    'model-changed',
                    newUserSetting.model
                  )
                  // browserWindow?.webContents.send('model-changed', "DeepSeek");
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
      const userSetting = await readUserSetting()
      // const userSetting = {
      //   model:"ChatGPT"
      // }
      browserWindow.webContents.send(
        'model-changed',
        userSetting.model
      )
    }
  )

  app.on('web-contents-created', (_event, webContents) => {
    const webContentType = webContents.getType()

    if (webContentType == 'webview') {
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
