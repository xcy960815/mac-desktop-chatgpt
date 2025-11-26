import {
  app,
  BrowserWindow,
  dialog,
  globalShortcut,
  Menu,
  shell,
  Tray
} from 'electron'

import { ElectronMenubar } from './electron-menubar'
import { showShortcutInputDialog } from './shortcut-input-dialog'
import {
  readUserSetting,
  resetUserUrls,
  writeUserSetting
} from './utils/user-setting'
import { delay } from './utils/common'
import {
  MenuLanguage,
  Model,
  ModelUrl,
  WindowBehavior
} from './constants'
import {
  getTrayMenuText,
  TrayMenuMessageKey
} from './i18n/tray-menu'

/**
 * 浏览器窗口操作选项
 * @typedef {Object} WithBrowserWindowOptions
 */
type WithBrowserWindowOptions = {
  /** 失败时的错误消息（可选） */
  onFailureMessage?: string
}

/**
 * 托盘上下文菜单配置选项
 * @interface TrayContextMenuOptions
 */
export interface TrayContextMenuOptions {
  /** 系统托盘实例 */
  tray: Tray
  /** Electron 菜单栏实例 */
  electronMenubar: ElectronMenubar
  /** 菜单实例 */
  menu: Menu
  /** 各模型的 URL 配置 */
  urls: {
    /** ChatGPT 模型 URL */
    chatgpt: string
    /** DeepSeek 模型 URL */
    deepseek: string
    /** Grok 模型 URL */
    grok: string
    /** Gemini 模型 URL */
    gemini: string
  }
  /** 检查菜单栏是否已就绪 */
  isMenubarReady(): boolean
  /** 获取主浏览器窗口 */
  getMainBrowserWindow(): BrowserWindow | null
  /** 设置主浏览器窗口 */
  setMainBrowserWindow(window: BrowserWindow | null): void
  /** 获取当前快捷键 */
  getCurrentShortcut(): string | null
  /** 设置当前快捷键 */
  setCurrentShortcut(shortcut: string | null): void
  /** 在浏览器窗口上执行任务 */
  withBrowserWindow<T>(
    task: (win: BrowserWindow) => T | Promise<T>,
    options?: WithBrowserWindowOptions
  ): Promise<T | null>
}

/**
 * 获取可用的浏览器窗口
 * @param {ElectronMenubar} electronMenubar - Electron 菜单栏实例
 * @param {TrayContextMenuOptions['getMainBrowserWindow']} getMainBrowserWindow - 获取主浏览器窗口的函数
 * @returns {BrowserWindow | null} 可用的浏览器窗口，如果不存在则返回 null
 */
const getAvailableBrowserWindow = (
  electronMenubar: ElectronMenubar,
  getMainBrowserWindow: TrayContextMenuOptions['getMainBrowserWindow']
): BrowserWindow | null => {
  const mainBrowserWindow = getMainBrowserWindow()
  if (
    mainBrowserWindow &&
    !mainBrowserWindow.isDestroyed()
  ) {
    return mainBrowserWindow
  }

  const menubarWindow = electronMenubar.browserWindow
  if (menubarWindow && !menubarWindow.isDestroyed()) {
    return menubarWindow
  }

  return null
}

/**
 * 设置托盘上下文菜单
 * @param {TrayContextMenuOptions} options - 托盘上下文菜单配置选项
 * @returns {() => void} 返回构建上下文菜单的函数
 */
export const setupTrayContextMenu = (
  options: TrayContextMenuOptions
) => {
  /**
   * 构建上下文菜单
   * @returns {void}
   */
  const buildContextMenu = () => {
    const userSetting = readUserSetting()
    const isChatGPT = userSetting.model === Model.ChatGPT
    const isDeepSeek = userSetting.model === Model.DeepSeek
    const isGrok = userSetting.model === Model.Grok
    const isGemini = userSetting.model === Model.Gemini
    const windowBehavior =
      userSetting.windowBehavior ||
      (userSetting.lockWindowOnBlur
        ? WindowBehavior.LockOnDesktop
        : WindowBehavior.AutoHide)
    const isWindowLocked =
      windowBehavior !== WindowBehavior.AutoHide
    const loginItemSettings = app.getLoginItemSettings()
    const isAutoLaunchEnabled =
      loginItemSettings?.openAtLogin ??
      !!userSetting.autoLaunchOnStartup

    const menuLanguage =
      userSetting.menuLanguage ?? MenuLanguage.Chinese
    const t = (key: TrayMenuMessageKey) =>
      getTrayMenuText(key, menuLanguage)

    const { tray, electronMenubar, urls } = options

    electronMenubar.setWindowBehavior(windowBehavior)

    const handleAutoLaunchToggle = (enabled: boolean) => {
      try {
        app.setLoginItemSettings({
          openAtLogin: enabled,
          openAsHidden: true
        })
        writeUserSetting({
          ...userSetting,
          autoLaunchOnStartup: enabled
        })
      } catch (error) {
        console.error('更新开机启动设置失败:', error)
        dialog.showErrorBox(
          '开机启动设置失败',
          '请稍后再试或手动到系统设置中修改。'
        )
      }
    }

    const handleWindowBehaviorChange = (
      behavior: WindowBehavior
    ) => {
      const latestSetting = readUserSetting()
      writeUserSetting({
        ...latestSetting,
        lockWindowOnBlur:
          behavior !== WindowBehavior.AutoHide,
        windowBehavior: behavior
      })
      electronMenubar.setWindowBehavior(behavior)
      tray.popUpContextMenu(options.menu)
    }

    const handleMenuLanguageChange = (
      language: MenuLanguage
    ) => {
      const latestSetting = readUserSetting()
      if (latestSetting.menuLanguage === language) {
        return
      }
      writeUserSetting({
        ...latestSetting,
        menuLanguage: language
      })
      tray.popUpContextMenu(options.menu)
    }

    tray.popUpContextMenu(
      Menu.buildFromTemplate([
        {
          label: t('quit'),
          accelerator: 'CommandOrControl+Q',
          click: () => {
            resetUserUrls()
            app.quit()
          }
        },
        {
          label: t('reload'),
          accelerator: 'CommandOrControl+R',
          click: async () => {
            const newUserSetting = resetUserUrls()
            await options.withBrowserWindow(
              (win) => {
                if (win.isDestroyed()) {
                  throw new Error('窗口已销毁')
                }

                const currentModel = newUserSetting.model
                const defaultUrl =
                  newUserSetting.urls?.[currentModel] ||
                  (currentModel === Model.DeepSeek
                    ? ModelUrl.DeepSeek
                    : currentModel === Model.ChatGPT
                    ? ModelUrl.ChatGPT
                    : currentModel === Model.Gemini
                    ? ModelUrl.Gemini
                    : ModelUrl.Grok)

                win.webContents.send(
                  'model-changed',
                  currentModel,
                  defaultUrl
                )
              },
              {
                onFailureMessage:
                  '无法重新加载窗口，请稍后重试'
              }
            )
          }
        },
        {
          label: t('openInBrowser'),
          accelerator: 'CommandOrControl+O',
          click: async () => {
            if (isChatGPT) {
              shell.openExternal(urls.chatgpt)
            }
            if (isDeepSeek) {
              shell.openExternal(urls.deepseek)
            }
            if (isGrok) {
              shell.openExternal(urls.grok)
            }
            if (isGemini) {
              shell.openExternal(urls.gemini)
            }
          }
        },
        {
          label: t('autoLaunchOnStartup'),
          type: 'checkbox',
          checked: isAutoLaunchEnabled,
          click: (menuItem) =>
            handleAutoLaunchToggle(
              Boolean(menuItem.checked)
            )
        },
        {
          label: t('windowBehavior'),
          submenu: [
            {
              label: t('windowAutoHide'),
              type: 'radio',
              checked:
                windowBehavior === WindowBehavior.AutoHide,
              click: () =>
                handleWindowBehaviorChange(
                  WindowBehavior.AutoHide
                )
            },
            {
              label: t('windowLockOnDesktop'),
              type: 'radio',
              checked:
                windowBehavior ===
                WindowBehavior.LockOnDesktop,
              click: () =>
                handleWindowBehaviorChange(
                  WindowBehavior.LockOnDesktop
                )
            },
            {
              label: t('windowAlwaysOnTop'),
              type: 'radio',
              checked:
                windowBehavior ===
                WindowBehavior.AlwaysOnTop,
              click: () =>
                handleWindowBehaviorChange(
                  WindowBehavior.AlwaysOnTop
                )
            }
          ]
        },
        {
          label: t('language'),
          submenu: [
            {
              label: t('languageEnglish'),
              type: 'radio',
              checked:
                menuLanguage === MenuLanguage.English,
              click: () =>
                handleMenuLanguageChange(
                  MenuLanguage.English
                )
            },
            {
              label: t('languageChinese'),
              type: 'radio',
              checked:
                menuLanguage === MenuLanguage.Chinese,
              click: () =>
                handleMenuLanguageChange(
                  MenuLanguage.Chinese
                )
            }
          ]
        },
        {
          label: t('model'),
          submenu: [
            {
              label: Model.ChatGPT,
              type: 'radio',
              checked: isChatGPT,
              click: () => {
                const userSetting = readUserSetting()
                const newUserSetting = writeUserSetting({
                  ...userSetting,
                  model: Model.ChatGPT
                })
                tray.popUpContextMenu(options.menu)
                const savedUrl =
                  newUserSetting.urls?.ChatGPT ||
                  urls.chatgpt
                getAvailableBrowserWindow(
                  electronMenubar,
                  options.getMainBrowserWindow
                )?.webContents.send(
                  'model-changed',
                  newUserSetting.model,
                  savedUrl
                )
              }
            },
            // { type: 'separator' },
            {
              label: Model.DeepSeek,
              type: 'radio',
              checked: isDeepSeek,
              click: () => {
                const userSetting = readUserSetting()
                const newUserSetting = writeUserSetting({
                  ...userSetting,
                  model: Model.DeepSeek
                })
                tray.popUpContextMenu(options.menu)
                const savedUrl =
                  newUserSetting.urls?.DeepSeek ||
                  urls.deepseek
                getAvailableBrowserWindow(
                  electronMenubar,
                  options.getMainBrowserWindow
                )?.webContents.send(
                  'model-changed',
                  newUserSetting.model,
                  savedUrl
                )
              }
            },
            // { type: 'separator' },
            {
              label: Model.Grok,
              type: 'radio',
              checked: isGrok,
              click: () => {
                const userSetting = readUserSetting()
                const newUserSetting = writeUserSetting({
                  ...userSetting,
                  model: Model.Grok
                })
                tray.popUpContextMenu(options.menu)
                const savedUrl =
                  newUserSetting.urls?.Grok || urls.grok
                getAvailableBrowserWindow(
                  electronMenubar,
                  options.getMainBrowserWindow
                )?.webContents.send(
                  'model-changed',
                  newUserSetting.model,
                  savedUrl
                )
              }
            },
            // { type: 'separator' },
            {
              label: Model.Gemini,
              type: 'radio',
              checked: isGemini,
              click: () => {
                const userSetting = readUserSetting()
                const newUserSetting = writeUserSetting({
                  ...userSetting,
                  model: Model.Gemini
                })
                tray.popUpContextMenu(options.menu)
                const savedUrl =
                  newUserSetting.urls?.Gemini || urls.gemini
                getAvailableBrowserWindow(
                  electronMenubar,
                  options.getMainBrowserWindow
                )?.webContents.send(
                  'model-changed',
                  newUserSetting.model,
                  savedUrl
                )
              }
            }
          ]
        },
        { type: 'separator' },
        {
          label: t('setShortcut'),
          click: async () => {
            console.log('🔧 开始设置快捷键...')
            try {
              const userSetting = readUserSetting()
              const savedShortcut =
                userSetting.toggleShortcut ||
                'CommandOrControl+g'
              console.log('📋 当前快捷键:', savedShortcut)

              if (!options.isMenubarReady()) {
                console.log('⏳ 等待 menubar ready...')
                for (
                  let i = 0;
                  i < 20 && !options.isMenubarReady();
                  i++
                ) {
                  await delay(100)
                }
                if (!options.isMenubarReady()) {
                  console.log(
                    '⚠️ Menubar 尚未 ready，但继续尝试...'
                  )
                }
              }

              let browserWindow =
                getAvailableBrowserWindow(
                  electronMenubar,
                  options.getMainBrowserWindow
                ) || null
              console.log('🔍 初始窗口状态:', {
                isMenubarReady: options.isMenubarReady(),
                mainBrowserWindow:
                  !!options.getMainBrowserWindow(),
                electronMenubarBrowserWindow:
                  !!electronMenubar.browserWindow,
                browserWindow: !!browserWindow,
                isDestroyed: browserWindow
                  ? browserWindow.isDestroyed()
                  : 'N/A'
              })

              if (
                !browserWindow ||
                browserWindow.isDestroyed()
              ) {
                console.log(
                  '📦 窗口不存在或已销毁，创建窗口...'
                )
                try {
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
                  await delay(200)

                  for (let i = 0; i < 5; i++) {
                    browserWindow =
                      electronMenubar.browserWindow ||
                      options.getMainBrowserWindow()
                    if (
                      browserWindow &&
                      !browserWindow.isDestroyed()
                    ) {
                      console.log(
                        `✅ 窗口获取成功 (尝试 ${i + 1}/5)`
                      )
                      break
                    }
                    console.log(
                      `⏳ 等待窗口创建... (尝试 ${i + 1}/5)`
                    )
                    await delay(100)
                  }

                  if (
                    browserWindow &&
                    !browserWindow.isDestroyed()
                  ) {
                    options.setMainBrowserWindow(
                      browserWindow
                    )
                    console.log('✅ 窗口引用已更新')
                  }
                } catch (error) {
                  console.error('❌ 创建窗口时出错:', error)
                  browserWindow =
                    electronMenubar.browserWindow ||
                    options.getMainBrowserWindow()
                }

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

              if (!browserWindow.isVisible()) {
                console.log('👁️ 窗口不可见，显示窗口...')
                try {
                  await electronMenubar.showWindow()
                  browserWindow =
                    electronMenubar.browserWindow ||
                    options.getMainBrowserWindow()
                  if (
                    browserWindow &&
                    !browserWindow.isDestroyed()
                  ) {
                    options.setMainBrowserWindow(
                      browserWindow
                    )
                  }
                  await delay(300)
                } catch (error) {
                  console.error('❌ 显示窗口时出错:', error)
                }
              }

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
                  setTimeout(() => {
                    console.log('⏰ 页面加载超时，继续执行')
                    resolve()
                  }, 5000)
                } else {
                  console.log('✅ 页面已加载')
                  resolve()
                }
              })

              browserWindow =
                electronMenubar.browserWindow ||
                options.getMainBrowserWindow()
              if (
                !browserWindow ||
                browserWindow.isDestroyed()
              ) {
                console.error('❌ 调用对话框前窗口检查失败')
                dialog.showMessageBox({
                  type: 'error',
                  title: '错误',
                  message: '窗口未准备好，请稍后再试',
                  buttons: ['确定']
                })
                return
              }

              if (!browserWindow.isVisible()) {
                browserWindow.show()
                await delay(100)
              }

              console.log('💬 准备显示输入框...')
              let input: string | null = null
              try {
                input = await showShortcutInputDialog(
                  electronMenubar,
                  browserWindow,
                  savedShortcut
                )
                console.log('📝 用户输入:', input)
              } catch (error) {
                console.error('❌ 显示对话框时出错:', error)
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
                if (!shortcut || shortcut.trim() === '') {
                  dialog.showMessageBox(browserWindow, {
                    type: 'error',
                    title: '设置失败',
                    message: '快捷键不能为空',
                    buttons: ['确定']
                  })
                  return
                }

                const existingShortcut =
                  options.getCurrentShortcut()
                if (existingShortcut) {
                  globalShortcut.unregister(
                    existingShortcut
                  )
                }

                const registered = globalShortcut.register(
                  shortcut,
                  () => {
                    const menubarWindow =
                      getAvailableBrowserWindow(
                        electronMenubar,
                        options.getMainBrowserWindow
                      )
                    if (!menubarWindow) {
                      return
                    }
                    const menubarVisible =
                      menubarWindow.isVisible()
                    if (menubarVisible) {
                      electronMenubar.hideWindow()
                    } else {
                      electronMenubar.showWindow()
                      if (process.platform === 'darwin') {
                        electronMenubar.app.show()
                      }
                      electronMenubar.app.focus()
                    }
                  }
                )

                if (registered) {
                  const currentSetting = readUserSetting()
                  writeUserSetting({
                    ...currentSetting,
                    toggleShortcut: shortcut
                  })
                  options.setCurrentShortcut(shortcut)
                  dialog.showMessageBox(browserWindow, {
                    type: 'info',
                    title: '设置成功',
                    message: `快捷键已设置为: ${shortcut}`,
                    buttons: ['确定']
                  })
                  tray.popUpContextMenu(options.menu)
                } else {
                  if (existingShortcut) {
                    globalShortcut.register(
                      existingShortcut,
                      () => {
                        const menubarWindow =
                          getAvailableBrowserWindow(
                            electronMenubar,
                            options.getMainBrowserWindow
                          )
                        if (!menubarWindow) {
                          return
                        }
                        const menubarVisible =
                          menubarWindow.isVisible()
                        if (menubarVisible) {
                          electronMenubar.hideWindow()
                        } else {
                          electronMenubar.showWindow()
                          if (
                            process.platform === 'darwin'
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
              } else {
                const resetResult =
                  await dialog.showMessageBox(
                    browserWindow,
                    {
                      type: 'question',
                      title: '重置快捷键',
                      message:
                        '未输入快捷键，是否将快捷键重置为默认值 CommandOrControl+g？',
                      buttons: ['是', '否'],
                      cancelId: 1
                    }
                  )
                if (resetResult.response === 0) {
                  const currentShortcut =
                    options.getCurrentShortcut()
                  if (currentShortcut) {
                    globalShortcut.unregister(
                      currentShortcut
                    )
                  }

                  const defaultRegistered =
                    globalShortcut.register(
                      'CommandOrControl+g',
                      () => {
                        const menubarWindow =
                          getAvailableBrowserWindow(
                            electronMenubar,
                            options.getMainBrowserWindow
                          )
                        if (!menubarWindow) {
                          return
                        }
                        const menubarVisible =
                          menubarWindow.isVisible()
                        if (menubarVisible) {
                          electronMenubar.hideWindow()
                        } else {
                          electronMenubar.showWindow()
                          if (
                            process.platform === 'darwin'
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
                    options.setCurrentShortcut(
                      'CommandOrControl+g'
                    )
                    dialog.showMessageBox(browserWindow, {
                      type: 'info',
                      title: '设置成功',
                      message:
                        '快捷键已重置为默认值: CommandOrControl+g',
                      buttons: ['确定']
                    })
                  } else {
                    dialog.showMessageBox(browserWindow, {
                      type: 'error',
                      title: '设置失败',
                      message:
                        '无法注册默认快捷键，请尝试其他快捷键',
                      buttons: ['确定']
                    })
                  }
                }
              }
            } catch (error) {
              console.error('设置快捷键时发生错误:', error)
              const browserWindow =
                getAvailableBrowserWindow(
                  options.electronMenubar,
                  options.getMainBrowserWindow
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

  options.tray.on('right-click', () => {
    buildContextMenu()
  })

  options.tray.on('click', (event) => {
    if (event.ctrlKey || event.metaKey) {
      buildContextMenu()
    }
  })

  return buildContextMenu
}
