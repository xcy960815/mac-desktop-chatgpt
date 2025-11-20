import * as path from 'path'

import { ElectronMenubar } from './electron-menubar'

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
  BrowserWindow,
  screen
} from 'electron'

import {
  readUserSetting,
  writeUserSetting,
  resetUserUrls
} from './utils/user-setting'

const DEEPSEEK = 'https://chat.deepseek.com/'
const CHATGPT = 'https://chatgpt.com'
const GROK = 'https://grok.com/'

app.commandLine.appendSwitch('ignore-certificate-errors')

const TOOLTIP = 'desktop-chatgpt'

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
  function showShortcutInputDialog(
    parentWindow: BrowserWindow,
    currentShortcut: string
  ): Promise<string | null> {
    return new Promise((resolve, reject) => {
      // 验证父窗口是否有效
      if (!parentWindow || parentWindow.isDestroyed()) {
        console.error(
          '❌ showShortcutInputDialog: 父窗口无效'
        )
        reject(new Error('父窗口无效'))
        return
      }

      // 在显示对话框前，禁用主窗口的自动隐藏
      electronMenubar.disableAutoHide()

      // 获取父窗口的位置，以便将对话框居中显示
      let parentBounds
      try {
        parentBounds = parentWindow.getBounds()
      } catch (error) {
        console.error(
          '❌ showShortcutInputDialog: 获取窗口位置失败',
          error
        )
        // 如果获取位置失败，使用屏幕中心
        const primaryDisplay = screen.getPrimaryDisplay()
        const { width: screenWidth, height: screenHeight } =
          primaryDisplay.workAreaSize
        parentBounds = {
          x: 0,
          y: 0,
          width: screenWidth,
          height: screenHeight
        }
      }

      const dialogWidth = 360
      const dialogHeight = 160
      const x = Math.round(
        parentBounds.x +
          (parentBounds.width - dialogWidth) / 2
      )
      const y = Math.round(
        parentBounds.y +
          (parentBounds.height - dialogHeight) / 2
      )

      const inputWindow = new BrowserWindow({
        width: dialogWidth,
        height: dialogHeight,
        x: x,
        y: y,
        // 不设置 parent，避免主窗口隐藏时对话框也被隐藏
        // parent: parentWindow,
        // modal: true, // modal 需要 parent，所以也不设置
        resizable: false,
        frame: true,
        alwaysOnTop: true, // 确保对话框始终在最上层
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: false,
          preload: path.join(__dirname, 'preload.js')
        },
        title: '设置快捷键',
        show: false
      })

      // 创建 HTML 内容
      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>设置快捷键</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    html, body {
      height: 100%;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #ffffff;
    }
    .container {
      height: 100%;
      padding: 16px 20px 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      background: #ffffff;
    }
    .input-group {
      margin-bottom: 16px;
    }
    .shortcut-display {
      width: 100%;
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
      font-family: monospace;
      background: #fafafa;
      color: #333;
      min-height: 32px;
      display: flex;
      align-items: center;
    }
    .buttons {
      display: flex;
      gap: 10px;
      justify-content: flex-end;
    }
    button {
      padding: 6px 18px;
      border: none;
      border-radius: 4px;
      font-size: 14px;
      cursor: pointer;
      transition: background 0.2s;
    }
    .btn-cancel {
      background: #f0f0f0;
      color: #333;
    }
    .btn-cancel:hover {
      background: #e0e0e0;
    }
    .btn-ok {
      background: #007AFF;
      color: white;
    }
    .btn-ok:hover {
      background: #0056b3;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="input-group">
      <div id="shortcut-display" class="shortcut-display"></div>
    </div>
    <div class="buttons">
      <button class="btn-cancel" id="cancel-btn">取消</button>
      <button class="btn-ok" id="ok-btn">确定</button>
    </div>
  </div>
  <script>
    const display = document.getElementById('shortcut-display');
    const okBtn = document.getElementById('ok-btn');
    const cancelBtn = document.getElementById('cancel-btn');

    let currentValue = '${currentShortcut}'.trim();

    function renderDisplay() {
      display.textContent = currentValue || '请在键盘上按下新的快捷键组合';
    }

    function normalizeKey(key) {
      if (key.length === 1) {
        return key.toUpperCase();
      }
      const map = {
        'ArrowUp': 'Up',
        'ArrowDown': 'Down',
        'ArrowLeft': 'Left',
        'ArrowRight': 'Right',
        ' ': 'Space',
        'Escape': 'Esc',
      };
      return map[key] || key;
    }

    function buildShortcutFromEvent(e) {
      // 只按修饰键时不生成快捷键
      if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') {
        return null;
      }

      const parts = [];
      if (e.metaKey) {
        parts.push('CommandOrControl');
      } else if (e.ctrlKey) {
        parts.push('Ctrl');
      }
      if (e.altKey) {
        parts.push('Alt');
      }
      if (e.shiftKey) {
        parts.push('Shift');
      }

      let key = e.key;
      key = normalizeKey(key);
      parts.push(key);
      return parts.join('+');
    }

    document.addEventListener('keydown', (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.key === 'Escape') {
        cancelBtn.click();
        return;
      }

      if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
        if (currentValue) {
          okBtn.click();
        }
        return;
      }

      const value = buildShortcutFromEvent(e);
      if (!value) return;
      currentValue = value;
      renderDisplay();
    });

    renderDisplay();

    okBtn.addEventListener('click', () => {
      const value = (currentValue || '').trim();
      // 即使为空字符串也传递，让主进程判断是否有效
      window.electronAPI?.sendShortcutInput(value);
    });

    cancelBtn.addEventListener('click', () => {
      window.electronAPI?.sendShortcutInput(null);
    });
  </script>
</body>
</html>
      `

      inputWindow.loadURL(
        `data:text/html;charset=utf-8,${encodeURIComponent(
          html
        )}`
      )

      let isResolved = false

      // 监听来自渲染进程的消息
      ipcMain.once(
        'shortcut-input-response',
        (_event, value: string | null) => {
          if (isResolved) {
            console.log(
              '⚠️ shortcut-input-response 已处理过，忽略重复消息'
            )
            return
          }
          isResolved = true
          console.log('✅ 收到用户输入:', value)
          // 恢复主窗口的自动隐藏
          electronMenubar.enableAutoHide()
          // 延迟关闭窗口，确保消息已处理
          setTimeout(() => {
            if (!inputWindow.isDestroyed()) {
              inputWindow.close()
            }
          }, 50)
          resolve(value)
        }
      )

      inputWindow.once('closed', () => {
        if (!isResolved) {
          console.log(
            '⚠️ 窗口关闭但未收到用户输入，返回 null'
          )
          // 恢复主窗口的自动隐藏
          electronMenubar.enableAutoHide()
          isResolved = true
          resolve(null)
        }
      })

      inputWindow.once('ready-to-show', () => {
        // 确保主窗口可见（防止被自动隐藏）
        if (parentWindow && !parentWindow.isDestroyed()) {
          if (!parentWindow.isVisible()) {
            parentWindow.show()
          }
        }
        inputWindow.show()
        inputWindow.focus()
      })

      // 如果对话框被关闭（用户点击关闭按钮），也 resolve null
      inputWindow.on('close', (event) => {
        if (!isResolved) {
          console.log('⚠️ 用户点击关闭按钮')
          // 恢复主窗口的自动隐藏
          electronMenubar.enableAutoHide()
          isResolved = true
          event.preventDefault()
          inputWindow.destroy()
          resolve(null)
        }
      })
    })
  }

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

    const delay = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms))

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

    /**
     * 构建右键菜单
     */
    function buildContextMenu() {
      const userSetting = readUserSetting()
      const isChatGPT = userSetting.model === 'ChatGPT'
      const isDeepSeek = userSetting.model === 'DeepSeek'
      const isGrok = userSetting.model === 'Grok'
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
            click: async () => {
              resetUserUrls()
              await withBrowserWindow(
                (win) => {
                  if (win.isDestroyed()) {
                    throw new Error('窗口已销毁')
                  }
                  win.reload()
                },
                {
                  onFailureMessage:
                    '无法重新加载窗口，请稍后重试'
                }
              )
            }
          },
          {
            label: 'Open in browser',
            accelerator: 'Command+O',
            click: async () => {
              if (isChatGPT) {
                shell.openExternal(CHATGPT)
              }
              if (isDeepSeek) {
                shell.openExternal(DEEPSEEK)
              }
              if (isGrok) {
                shell.openExternal(GROK)
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
                    newUserSetting.urls?.ChatGPT || CHATGPT
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
                    DEEPSEEK
                  browserWindow?.webContents.send(
                    'model-changed',
                    newUserSetting.model,
                    savedUrl
                  )
                }
              },
              { type: 'separator' }, // 分隔线
              {
                label: 'Grok',
                type: 'radio',
                checked: isGrok,
                click: () => {
                  const userSetting = readUserSetting()
                  const newUserSetting = writeUserSetting({
                    ...userSetting,
                    model: 'Grok'
                  })
                  electronMenubar.tray.popUpContextMenu(
                    menu
                  )
                  const savedUrl =
                    newUserSetting.urls?.Grok || GROK
                  browserWindow?.webContents.send(
                    'model-changed',
                    newUserSetting.model,
                    savedUrl
                  )
                }
              }
            ]
          },
          { type: 'separator' }, // 分隔线
          {
            label: '设置快捷键',
            click: async () => {
              console.log('🔧 开始设置快捷键...')
              try {
                const userSetting = readUserSetting()
                const savedShortcut =
                  userSetting.toggleShortcut ||
                  'CommandOrControl+g'
                console.log('📋 当前快捷键:', savedShortcut)

                // 如果 menubar 还没有 ready，等待一下
                if (!isMenubarReady) {
                  console.log('⏳ 等待 menubar ready...')
                  // 等待最多 2 秒
                  for (
                    let i = 0;
                    i < 20 && !isMenubarReady;
                    i++
                  ) {
                    await new Promise((resolve) =>
                      setTimeout(resolve, 100)
                    )
                  }
                  if (!isMenubarReady) {
                    console.log(
                      '⚠️ Menubar 尚未 ready，但继续尝试...'
                    )
                  }
                }

                // 获取窗口实例：优先使用保存的引用，其次从 electronMenubar 获取
                let browserWindow =
                  mainBrowserWindow ||
                  electronMenubar.browserWindow
                console.log('🔍 初始窗口状态:', {
                  isMenubarReady,
                  mainBrowserWindow: !!mainBrowserWindow,
                  electronMenubarBrowserWindow:
                    !!electronMenubar.browserWindow,
                  browserWindow: !!browserWindow,
                  isDestroyed: browserWindow
                    ? browserWindow.isDestroyed()
                    : 'N/A'
                })

                // 如果窗口不存在或已销毁，先创建/显示窗口
                if (
                  !browserWindow ||
                  browserWindow.isDestroyed()
                ) {
                  console.log(
                    '📦 窗口不存在或已销毁，创建窗口...'
                  )
                  try {
                    // 确保 electronMenubar 已经准备好
                    if (!electronMenubar.tray) {
                      console.error(
                        '❌ Tray 未初始化，无法创建窗口'
                      )
                      dialog.showMessageBox({
                        type: 'error',
                        title: '错误',
                        message:
                          '应用程序未完全初始化，请稍后再试',
                        buttons: ['确定']
                      })
                      return
                    }

                    await electronMenubar.showWindow()
                    console.log('✅ showWindow() 调用完成')

                    // 等待一小段时间确保窗口创建完成
                    await new Promise((resolve) =>
                      setTimeout(resolve, 200)
                    )

                    // 重新获取窗口引用，多次尝试
                    for (let i = 0; i < 5; i++) {
                      browserWindow =
                        electronMenubar.browserWindow ||
                        mainBrowserWindow
                      if (
                        browserWindow &&
                        !browserWindow.isDestroyed()
                      ) {
                        console.log(
                          `✅ 窗口获取成功 (尝试 ${
                            i + 1
                          }/5)`
                        )
                        break
                      }
                      console.log(
                        `⏳ 等待窗口创建... (尝试 ${
                          i + 1
                        }/5)`
                      )
                      await new Promise((resolve) =>
                        setTimeout(resolve, 100)
                      )
                    }

                    // 更新保存的引用
                    if (
                      browserWindow &&
                      !browserWindow.isDestroyed()
                    ) {
                      mainBrowserWindow = browserWindow
                      console.log('✅ 窗口引用已更新')
                    }
                  } catch (error) {
                    console.error(
                      '❌ 创建窗口时出错:',
                      error
                    )
                    // 即使出错，也尝试获取窗口
                    browserWindow =
                      electronMenubar.browserWindow ||
                      mainBrowserWindow
                  }

                  // 再次检查窗口是否准备好
                  if (
                    !browserWindow ||
                    browserWindow.isDestroyed()
                  ) {
                    console.error(
                      '❌ 窗口创建失败或未准备好',
                      {
                        browserWindow: !!browserWindow,
                        isDestroyed: browserWindow
                          ? browserWindow.isDestroyed()
                          : 'N/A',
                        electronMenubarBrowserWindow:
                          !!electronMenubar.browserWindow
                      }
                    )
                    dialog.showMessageBox({
                      type: 'error',
                      title: '错误',
                      message: '窗口未准备好，请稍后再试',
                      buttons: ['确定']
                    })
                    return
                  }

                  // 等待窗口加载完成
                  await new Promise<void>((resolve) => {
                    if (
                      browserWindow!.webContents.isLoading()
                    ) {
                      browserWindow!.webContents.once(
                        'did-finish-load',
                        () => {
                          console.log('✅ 窗口加载完成')
                          resolve()
                        }
                      )
                      // 设置超时，避免无限等待
                      setTimeout(() => {
                        console.log(
                          '⏰ 窗口加载超时，继续执行'
                        )
                        resolve()
                      }, 5000)
                    } else {
                      console.log('✅ 窗口已加载')
                      resolve()
                    }
                  })
                }

                console.log('✅ 窗口已准备好')

                // 确保窗口可见，以便显示输入框
                if (!browserWindow.isVisible()) {
                  console.log('👁️ 窗口不可见，显示窗口...')
                  try {
                    await electronMenubar.showWindow()
                    browserWindow =
                      electronMenubar.browserWindow ||
                      mainBrowserWindow
                    if (
                      browserWindow &&
                      !browserWindow.isDestroyed()
                    ) {
                      mainBrowserWindow = browserWindow
                    }
                    // 等待窗口显示和加载完成
                    await new Promise((resolve) =>
                      setTimeout(resolve, 300)
                    )
                  } catch (error) {
                    console.error(
                      '❌ 显示窗口时出错:',
                      error
                    )
                  }
                }

                // 最终检查窗口是否可用
                if (
                  !browserWindow ||
                  browserWindow.isDestroyed()
                ) {
                  console.error('❌ 窗口最终检查失败')
                  dialog.showMessageBox({
                    type: 'error',
                    title: '错误',
                    message: '窗口未准备好，请稍后再试',
                    buttons: ['确定']
                  })
                  return
                }

                console.log('✅ 窗口已可见')

                // 等待页面加载完成
                console.log('⏳ 等待页面加载完成...')
                await new Promise<void>((resolve) => {
                  if (
                    browserWindow!.webContents.isLoading()
                  ) {
                    browserWindow!.webContents.once(
                      'did-finish-load',
                      () => {
                        console.log('✅ 页面加载完成')
                        resolve()
                      }
                    )
                    // 设置超时，避免无限等待
                    setTimeout(() => {
                      console.log(
                        '⏰ 页面加载超时，继续执行'
                      )
                      resolve()
                    }, 5000)
                  } else {
                    console.log('✅ 页面已加载')
                    resolve()
                  }
                })

                // 最后一次验证窗口是否可用（在调用对话框之前）
                browserWindow =
                  electronMenubar.browserWindow ||
                  mainBrowserWindow
                if (
                  !browserWindow ||
                  browserWindow.isDestroyed()
                ) {
                  console.error(
                    '❌ 调用对话框前窗口检查失败'
                  )
                  dialog.showMessageBox({
                    type: 'error',
                    title: '错误',
                    message: '窗口未准备好，请稍后再试',
                    buttons: ['确定']
                  })
                  return
                }

                // 确保窗口可见
                if (!browserWindow.isVisible()) {
                  browserWindow.show()
                  await new Promise((resolve) =>
                    setTimeout(resolve, 100)
                  )
                }

                // 使用自定义输入对话框获取输入
                // 注意：showShortcutInputDialog 内部会处理禁用/启用自动隐藏
                console.log('💬 准备显示输入框...')
                let input: string | null = null
                try {
                  input = await showShortcutInputDialog(
                    browserWindow,
                    savedShortcut
                  )
                  console.log('📝 用户输入:', input)
                } catch (error) {
                  console.error(
                    '❌ 显示对话框时出错:',
                    error
                  )
                  dialog.showMessageBox({
                    type: 'error',
                    title: '错误',
                    message: '显示对话框失败，请稍后再试',
                    buttons: ['确定']
                  })
                  return
                }

                if (input && input.trim()) {
                  const shortcut = input.trim()

                  // 验证快捷键格式
                  if (!shortcut || shortcut.trim() === '') {
                    dialog.showMessageBox(browserWindow, {
                      type: 'error',
                      title: '设置失败',
                      message: '快捷键不能为空',
                      buttons: ['确定']
                    })
                    return
                  }

                  // 先注销当前快捷键
                  if (currentShortcut) {
                    globalShortcut.unregister(
                      currentShortcut
                    )
                  }

                  // 尝试注册新快捷键
                  const registered =
                    globalShortcut.register(
                      shortcut,
                      () => {
                        const menubarVisible =
                          browserWindow.isVisible()
                        if (menubarVisible) {
                          electronMenubar.hideWindow()
                        } else {
                          electronMenubar.showWindow()
                          if (
                            process.platform == 'darwin'
                          ) {
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
                    dialog.showMessageBox(browserWindow, {
                      type: 'info',
                      title: '设置成功',
                      message: '快捷键设置成功',
                      buttons: ['确定']
                    })
                  } else {
                    // 如果注册失败，恢复旧快捷键
                    if (currentShortcut) {
                      globalShortcut.register(
                        currentShortcut,
                        () => {
                          const menubarVisible =
                            browserWindow.isVisible()
                          if (menubarVisible) {
                            electronMenubar.hideWindow()
                          } else {
                            electronMenubar.showWindow()
                            if (
                              process.platform == 'darwin'
                            ) {
                              electronMenubar.app.show()
                            }
                            electronMenubar.app.focus()
                          }
                        }
                      )
                    }
                    dialog.showMessageBox(browserWindow, {
                      type: 'error',
                      title: '设置失败',
                      message:
                        '快捷键已被占用或格式不正确，请尝试其他快捷键',
                      buttons: ['确定']
                    })
                  }
                } else if (input === null) {
                  // 用户取消，不做任何操作
                } else {
                  // 用户输入为空，询问是否重置为默认
                  const resetResult =
                    await dialog.showMessageBox(
                      browserWindow,
                      {
                        type: 'question',
                        title: '重置快捷键',
                        message: '是否重置为默认快捷键？',
                        detail:
                          '默认快捷键: CommandOrControl+g',
                        buttons: ['确定', '取消'],
                        defaultId: 0,
                        cancelId: 1
                      }
                    )

                  if (resetResult.response === 0) {
                    // 重置为默认
                    if (currentShortcut) {
                      globalShortcut.unregister(
                        currentShortcut
                      )
                    }
                    const defaultRegistered =
                      globalShortcut.register(
                        'CommandOrControl+g',
                        () => {
                          const menubarVisible =
                            browserWindow.isVisible()
                          if (menubarVisible) {
                            electronMenubar.hideWindow()
                          } else {
                            electronMenubar.showWindow()
                            if (
                              process.platform == 'darwin'
                            ) {
                              electronMenubar.app.show()
                            }
                            electronMenubar.app.focus()
                          }
                        }
                      )

                    if (defaultRegistered) {
                      const userSetting = readUserSetting()
                      writeUserSetting({
                        ...userSetting,
                        toggleShortcut: 'CommandOrControl+g'
                      })
                      currentShortcut = 'CommandOrControl+g'
                      dialog.showMessageBox(browserWindow, {
                        type: 'info',
                        title: '设置成功',
                        message:
                          '快捷键已重置为默认值: CommandOrControl+g',
                        buttons: ['确定']
                      })
                    }
                  }
                }
              } catch (error) {
                console.error(
                  '设置快捷键时发生错误:',
                  error
                )
                dialog.showMessageBox(
                  browserWindow || undefined,
                  {
                    type: 'error',
                    title: '错误',
                    message:
                      '设置快捷键时发生错误: ' +
                      (error instanceof Error
                        ? error.message
                        : String(error)),
                    buttons: ['确定']
                  }
                )
              }
            }
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

    // 注册快捷键的函数
    let currentShortcut: string | null = null
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
        (userSetting.model === 'DeepSeek'
          ? DEEPSEEK
          : userSetting.model === 'ChatGPT'
          ? CHATGPT
          : GROK)

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
            ChatGPT: CHATGPT,
            DeepSeek: DEEPSEEK,
            Grok: GROK
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
