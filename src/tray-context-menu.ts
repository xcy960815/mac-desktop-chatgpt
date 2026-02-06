import {
  app,
  BrowserWindow,
  dialog,
  globalShortcut,
  Menu,
  shell,
  Tray,
  session
} from 'electron'

/**
 * 带有上下文菜单的 Tray 接口
 */
interface TrayWithContextMenu extends Tray {
  _contextMenu?: Menu
}

import { WindowManager } from '@/window-manager'
import { showShortcutInputDialog } from '@/shortcut-input-dialog'
import { showProxyInputDialog } from '@/proxy-input-dialog'
import {
  readUserSetting,
  resetUserUrls,
  writeUserSetting
} from '@/utils/user-setting'
import { delay } from '@/utils/common'
import {
  MenuLanguage,
  Model,
  ModelUrl,
  WindowBehavior
} from '@/constants'
import {
  getTrayMenuText,
  TrayMenuMessageKey
} from '@/i18n/tray-menu'
import { UpdateManager } from '@/utils/update-manager'

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
  /** 窗口管理器实例 */
  windowManager: WindowManager
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
    /** Qwen 模型 URL */
    qwen: string
    /** Doubao 模型 URL */
    doubao: string
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
  /** 更新管理器 */
  updateManager: UpdateManager
}

/**
 * 获取可用的浏览器窗口
 * @param {WindowManager} windowManager - 窗口管理器实例
 * @param {TrayContextMenuOptions['getMainBrowserWindow']} getMainBrowserWindow - 获取主浏览器窗口的函数
 * @returns {BrowserWindow | null} 可用的浏览器窗口，如果不存在则返回 null
 */
const getAvailableBrowserWindow = (
  windowManager: WindowManager,
  getMainBrowserWindow: TrayContextMenuOptions['getMainBrowserWindow']
): BrowserWindow | null => {
  const mainBrowserWindow = getMainBrowserWindow()
  if (
    mainBrowserWindow &&
    !mainBrowserWindow.isDestroyed()
  ) {
    return mainBrowserWindow
  }

  const menubarWindow = windowManager.getMainBrowserWindow()
  if (menubarWindow && !menubarWindow.isDestroyed()) {
    return menubarWindow
  }

  return null
}

/**
 * 模型名称到 URL 配置键的映射
 */
const MODEL_TO_URL_KEY: Record<
  Model,
  keyof TrayContextMenuOptions['urls']
> = {
  [Model.ChatGPT]: 'chatgpt',
  [Model.DeepSeek]: 'deepseek',
  [Model.Grok]: 'grok',
  [Model.Gemini]: 'gemini',
  [Model.Qwen]: 'qwen',
  [Model.Doubao]: 'doubao'
}

/**
 * 设置托盘上下文菜单
 * @param {TrayContextMenuOptions} options - 托盘上下文菜单配置选项
 * @returns {() => void} 返回构建上下文菜单的函数
 */
export const setupTrayContextMenu = (
  options: TrayContextMenuOptions
) => {
  const { tray, windowManager, urls } = options

  const waitForWindowLoad = async (
    targetWindow: BrowserWindow
  ) => {
    await new Promise<void>((resolve) => {
      if (targetWindow.webContents.isLoading()) {
        const timeout = setTimeout(() => {
          resolve()
        }, 5000)
        targetWindow.webContents.once(
          'did-finish-load',
          () => {
            clearTimeout(timeout)
            resolve()
          }
        )
      } else {
        resolve()
      }
    })
  }

  /**
   * 构建并设置上下文菜单
   */
  const updateContextMenu = () => {
    const userSetting = readUserSetting()
    const isChatGPT = userSetting.model === Model.ChatGPT
    const isDeepSeek = userSetting.model === Model.DeepSeek
    const isGrok = userSetting.model === Model.Grok
    const isGemini = userSetting.model === Model.Gemini
    const isQwen = userSetting.model === Model.Qwen
    const isDoubao = userSetting.model === Model.Doubao
    const windowBehavior =
      userSetting.windowBehavior ||
      (userSetting.lockWindowOnBlur
        ? WindowBehavior.LockOnDesktop
        : WindowBehavior.AutoHide)
    const loginItemSettings = app.getLoginItemSettings()
    const isAutoLaunchEnabled =
      loginItemSettings?.openAtLogin ??
      !!userSetting.autoLaunchOnStartup

    const menuLanguage =
      userSetting.menuLanguage ?? MenuLanguage.Chinese
    const t = (key: TrayMenuMessageKey) =>
      getTrayMenuText(key, menuLanguage)

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
        updateContextMenu()
      } catch (error) {
        dialog.showErrorBox(
          getTrayMenuText(
            'autoLaunchErrorTitle',
            menuLanguage
          ),
          getTrayMenuText(
            'autoLaunchErrorMessage',
            menuLanguage
          )
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
      windowManager.setWindowBehavior(behavior)
      updateContextMenu()
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
      updateContextMenu()
    }

    const createModelSwitchHandler = (model: Model) => {
      return () => {
        const userSetting = readUserSetting()
        const newUserSetting = writeUserSetting({
          ...userSetting,
          model
        })
        updateContextMenu()

        // 根据模型获取对应的 URL
        const urlKey = MODEL_TO_URL_KEY[model]
        const savedUrl =
          newUserSetting.urls?.[model] || urls[urlKey]

        getAvailableBrowserWindow(
          windowManager,
          options.getMainBrowserWindow
        )?.webContents.send(
          'model-changed',
          newUserSetting.model,
          savedUrl
        )
      }
    }

    const contextMenu = Menu.buildFromTemplate([
      {
        label: t('model'),
        submenu: [
          {
            label: Model.ChatGPT,
            type: 'radio',
            checked: isChatGPT,
            click: createModelSwitchHandler(Model.ChatGPT)
          },
          {
            label: Model.DeepSeek,
            type: 'radio',
            checked: isDeepSeek,
            click: createModelSwitchHandler(Model.DeepSeek)
          },
          {
            label: Model.Grok,
            type: 'radio',
            checked: isGrok,
            click: createModelSwitchHandler(Model.Grok)
          },
          {
            label: Model.Gemini,
            type: 'radio',
            checked: isGemini,
            click: createModelSwitchHandler(Model.Gemini)
          },
          {
            label: Model.Qwen,
            type: 'radio',
            checked: isQwen,
            click: createModelSwitchHandler(Model.Qwen)
          },
          {
            label: Model.Doubao,
            type: 'radio',
            checked: isDoubao,
            click: createModelSwitchHandler(Model.Doubao)
          }
        ]
      },
      {
        label: t('openInBrowser'),
        // accelerator: 'CommandOrControl+O',
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
          if (isQwen) {
            shell.openExternal(urls.qwen)
          }
          if (isDoubao) {
            shell.openExternal(urls.doubao)
          }
        }
      },
      { type: 'separator' },
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
              windowBehavior === WindowBehavior.AlwaysOnTop,
            click: () =>
              handleWindowBehaviorChange(
                WindowBehavior.AlwaysOnTop
              )
          }
        ]
      },
      {
        label: t('setShortcut'),
        click: async () => {
          try {
            const userSetting = readUserSetting()
            const savedShortcut =
              userSetting.toggleShortcut ||
              'CommandOrControl+g'

            if (!options.isMenubarReady()) {
              for (
                let i = 0;
                i < 20 && !options.isMenubarReady();
                i++
              ) {
                await delay(100)
              }
            }

            let browserWindow =
              getAvailableBrowserWindow(
                windowManager,
                options.getMainBrowserWindow
              ) || null
            if (
              !browserWindow ||
              browserWindow.isDestroyed()
            ) {
              try {
                if (!tray) {
                  dialog.showMessageBox({
                    type: 'error',
                    title: getTrayMenuText(
                      'errorTitle',
                      menuLanguage
                    ),
                    message: getTrayMenuText(
                      'appNotReadyMessage',
                      menuLanguage
                    ),
                    buttons: [
                      getTrayMenuText(
                        'confirm',
                        menuLanguage
                      )
                    ]
                  })
                  return
                }

                await windowManager.showWindow()
                await delay(200)

                for (let i = 0; i < 5; i++) {
                  browserWindow =
                    windowManager.getMainBrowserWindow() ||
                    options.getMainBrowserWindow()
                  if (
                    browserWindow &&
                    !browserWindow.isDestroyed()
                  ) {
                    break
                  }
                  await delay(100)
                }

                if (
                  browserWindow &&
                  !browserWindow.isDestroyed()
                ) {
                  options.setMainBrowserWindow(
                    browserWindow
                  )
                }
              } catch {
                browserWindow =
                  windowManager.getMainBrowserWindow() ||
                  options.getMainBrowserWindow()
              }

              if (
                !browserWindow ||
                browserWindow.isDestroyed()
              ) {
                dialog.showMessageBox({
                  type: 'error',
                  title: getTrayMenuText(
                    'errorTitle',
                    menuLanguage
                  ),
                  message: getTrayMenuText(
                    'windowNotReadyMessage',
                    menuLanguage
                  ),
                  buttons: [
                    getTrayMenuText('confirm', menuLanguage)
                  ]
                })
                return
              }

              await waitForWindowLoad(browserWindow)
            }

            if (!browserWindow.isVisible()) {
              try {
                await windowManager.showWindow()
                browserWindow =
                  windowManager.getMainBrowserWindow() ||
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
              } catch {
                // 忽略在显示窗口时的瞬时错误，后续校验会提示用户
              }
            }

            if (
              !browserWindow ||
              browserWindow.isDestroyed()
            ) {
              dialog.showMessageBox({
                type: 'error',
                title: getTrayMenuText(
                  'errorTitle',
                  menuLanguage
                ),
                message: getTrayMenuText(
                  'windowNotReadyMessage',
                  menuLanguage
                ),
                buttons: [
                  getTrayMenuText('confirm', menuLanguage)
                ]
              })
              return
            }

            await waitForWindowLoad(browserWindow)

            browserWindow =
              windowManager.getMainBrowserWindow() ||
              options.getMainBrowserWindow()
            if (
              !browserWindow ||
              browserWindow.isDestroyed()
            ) {
              dialog.showMessageBox({
                type: 'error',
                title: getTrayMenuText(
                  'errorTitle',
                  menuLanguage
                ),
                message: getTrayMenuText(
                  'windowNotReadyMessage',
                  menuLanguage
                ),
                buttons: [
                  getTrayMenuText('confirm', menuLanguage)
                ]
              })
              return
            }

            if (!browserWindow.isVisible()) {
              browserWindow.show()
              await delay(100)
            }

            let input: string | null = null
            try {
              input = await showShortcutInputDialog(
                windowManager,
                options.getMainBrowserWindow(),
                savedShortcut,
                menuLanguage
              )
            } catch (error) {
              dialog.showMessageBox({
                type: 'error',
                title: getTrayMenuText(
                  'errorTitle',
                  menuLanguage
                ),
                message: getTrayMenuText(
                  'dialogShowErrorMessage',
                  menuLanguage
                ),
                buttons: [
                  getTrayMenuText('confirm', menuLanguage)
                ]
              })
              return
            }

            if (input && input.trim()) {
              const shortcut = input.trim()
              if (!shortcut || shortcut.trim() === '') {
                dialog.showMessageBox(browserWindow, {
                  type: 'error',
                  title: getTrayMenuText(
                    'settingFailedTitle',
                    menuLanguage
                  ),
                  message: getTrayMenuText(
                    'shortcutEmptyMessage',
                    menuLanguage
                  ),
                  buttons: [
                    getTrayMenuText('confirm', menuLanguage)
                  ]
                })
                return
              }

              const existingShortcut =
                options.getCurrentShortcut()
              if (existingShortcut) {
                globalShortcut.unregister(existingShortcut)
              }

              const registered = globalShortcut.register(
                shortcut,
                () => {
                  const menubarWindow =
                    getAvailableBrowserWindow(
                      windowManager,
                      options.getMainBrowserWindow
                    )
                  if (!menubarWindow) {
                    return
                  }
                  windowManager.toggleWindow()
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
                  title: getTrayMenuText(
                    'settingSuccessTitle',
                    menuLanguage
                  ),
                  message: `${getTrayMenuText('shortcutSetSuccessMessagePrefix', menuLanguage)}${shortcut}`,
                  buttons: [
                    getTrayMenuText('confirm', menuLanguage)
                  ]
                })
                updateContextMenu()
              } else {
                if (existingShortcut) {
                  globalShortcut.register(
                    existingShortcut,
                    () => {
                      const menubarWindow =
                        getAvailableBrowserWindow(
                          windowManager,
                          options.getMainBrowserWindow
                        )
                      if (!menubarWindow) {
                        return
                      }
                      windowManager.toggleWindow()
                    }
                  )
                }
                dialog.showMessageBox(browserWindow, {
                  type: 'error',
                  title: getTrayMenuText(
                    'settingFailedTitle',
                    menuLanguage
                  ),
                  message: getTrayMenuText(
                    'shortcutConflictMessage',
                    menuLanguage
                  ),
                  buttons: [
                    getTrayMenuText('confirm', menuLanguage)
                  ]
                })
              }
            } else {
              const resetResult =
                await dialog.showMessageBox(browserWindow, {
                  type: 'question',
                  title: getTrayMenuText(
                    'shortcutResetConfirmTitle',
                    menuLanguage
                  ),
                  message: getTrayMenuText(
                    'shortcutResetConfirmMessage',
                    menuLanguage
                  ),
                  buttons: [
                    getTrayMenuText(
                      'confirm',
                      menuLanguage
                    ),
                    getTrayMenuText('cancel', menuLanguage)
                  ],
                  cancelId: 1
                })
              if (resetResult.response === 0) {
                const currentShortcut =
                  options.getCurrentShortcut()
                if (currentShortcut) {
                  globalShortcut.unregister(currentShortcut)
                }

                const defaultRegistered =
                  globalShortcut.register(
                    'CommandOrControl+g',
                    () => {
                      const menubarWindow =
                        getAvailableBrowserWindow(
                          windowManager,
                          options.getMainBrowserWindow
                        )
                      if (!menubarWindow) {
                        return
                      }
                      windowManager.toggleWindow()
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
                    title: getTrayMenuText(
                      'settingSuccessTitle',
                      menuLanguage
                    ),
                    message: getTrayMenuText(
                      'shortcutResetSuccessMessage',
                      menuLanguage
                    ),
                    buttons: [
                      getTrayMenuText(
                        'confirm',
                        menuLanguage
                      )
                    ]
                  })
                } else {
                  dialog.showMessageBox(browserWindow, {
                    type: 'error',
                    title: getTrayMenuText(
                      'settingFailedTitle',
                      menuLanguage
                    ),
                    message: getTrayMenuText(
                      'shortcutResetErrorMessage',
                      menuLanguage
                    ),
                    buttons: [
                      getTrayMenuText(
                        'confirm',
                        menuLanguage
                      )
                    ]
                  })
                }
              }
            }
          } catch (error) {
            const browserWindow = getAvailableBrowserWindow(
              options.windowManager,
              options.getMainBrowserWindow
            )
            dialog.showMessageBox(
              browserWindow || undefined,
              {
                type: 'error',
                title: getTrayMenuText(
                  'errorTitle',
                  menuLanguage
                ),
                message:
                  getTrayMenuText(
                    'shortcutSetErrorMessagePrefix',
                    menuLanguage
                  ) +
                  (error instanceof Error
                    ? error.message
                    : String(error)),
                buttons: [
                  getTrayMenuText('confirm', menuLanguage)
                ]
              }
            )
          }
        }
      },
      {
        label: t('setProxy'),
        click: async () => {
          try {
            const userSetting = readUserSetting()
            const savedProxy = userSetting.proxy || ''

            if (!options.isMenubarReady()) {
              for (
                let i = 0;
                i < 20 && !options.isMenubarReady();
                i++
              ) {
                await delay(100)
              }
            }

            let browserWindow =
              getAvailableBrowserWindow(
                windowManager,
                options.getMainBrowserWindow
              ) || null

            // 确保窗口准备好
            if (
              !browserWindow ||
              browserWindow.isDestroyed()
            ) {
              await windowManager.showWindow()
              await delay(200)
              browserWindow =
                windowManager.getMainBrowserWindow() ||
                options.getMainBrowserWindow()
            }

            if (
              !browserWindow ||
              browserWindow.isDestroyed()
            ) {
              dialog.showMessageBox({
                type: 'error',
                title: getTrayMenuText(
                  'errorTitle',
                  menuLanguage
                ),
                message: getTrayMenuText(
                  'windowNotReadyMessage',
                  menuLanguage
                ),
                buttons: [
                  getTrayMenuText('confirm', menuLanguage)
                ]
              })
              return
            }

            await waitForWindowLoad(browserWindow)

            if (!browserWindow.isVisible()) {
              browserWindow.show()
              await delay(100)
            }

            let input: string | null = null
            try {
              input = await showProxyInputDialog(
                windowManager,
                options.getMainBrowserWindow(),
                savedProxy,
                menuLanguage
              )
            } catch (error) {
              dialog.showMessageBox({
                type: 'error',
                title: '错误',
                message: '显示对话框失败，请稍后再试',
                buttons: ['确定']
              })
              return
            }

            if (input !== null) {
              const proxy = input.trim()
              const currentSetting = readUserSetting()

              // 检查是否有变更
              const oldProxy = currentSetting.proxy || ''
              if (proxy === oldProxy) {
                return
              }

              // 校验代理格式
              if (proxy) {
                // 支持的格式:
                // 1. 协议://IP:端口 (http://127.0.0.1:7890)
                // 2. IP:端口 (127.0.0.1:7890)
                // 3. 域名:端口 (example.com:8080)
                const proxyRegex =
                  /^(?:(http|https|socks|socks4|socks5):\/\/)?(?:[\w-]+\.)+[\w-]+(?::\d+)?$/
                // 简单的 IP:Port 校验
                const simpleProxyRegex =
                  /^([\w-]+\.)+[\w-]+:\d+$/

                if (
                  !proxyRegex.test(proxy) &&
                  !simpleProxyRegex.test(proxy)
                ) {
                  dialog.showMessageBox(browserWindow, {
                    type: 'error',
                    title: getTrayMenuText(
                      'formatErrorTitle',
                      menuLanguage
                    ),
                    message: getTrayMenuText(
                      'proxyFormatErrorMessage',
                      menuLanguage
                    ),
                    buttons: [
                      getTrayMenuText(
                        'confirm',
                        menuLanguage
                      )
                    ],
                    defaultId: 0
                  })
                  return
                }
              }

              writeUserSetting({
                ...currentSetting,
                proxy: proxy || undefined
              })

              // 应用代理设置
              if (proxy) {
                app.commandLine.appendSwitch(
                  'proxy-server',
                  proxy
                )
                // 立即应用到当前会话
                await session.defaultSession.setProxy({
                  proxyRules: proxy
                })
              } else {
                app.commandLine.removeSwitch('proxy-server')
                // 立即清除当前会话代理
                await session.defaultSession.setProxy({
                  proxyRules: ''
                })
              }

              // 提示重启生效
              dialog.showMessageBox(browserWindow, {
                type: 'info',
                title: getTrayMenuText(
                  'settingSuccessTitle',
                  menuLanguage
                ),
                message: getTrayMenuText(
                  'proxySavedMessage',
                  menuLanguage
                ),
                buttons: [
                  getTrayMenuText('confirm', menuLanguage)
                ]
              })
            }
          } catch (error) {
            if (options.isMenubarReady()) {
              dialog.showErrorBox(
                getTrayMenuText('errorTitle', menuLanguage),
                getTrayMenuText(
                  'proxySetErrorMessagePrefix',
                  menuLanguage
                ) + String(error)
              )
            }
          }
        }
      },
      {
        label: t('autoLaunchOnStartup'),
        type: 'checkbox',
        checked: isAutoLaunchEnabled,
        click: (menuItem) =>
          handleAutoLaunchToggle(Boolean(menuItem.checked))
      },
      {
        label: t('language'),
        submenu: [
          {
            label: t('languageEnglish'),
            type: 'radio',
            checked: menuLanguage === MenuLanguage.English,
            click: () =>
              handleMenuLanguageChange(MenuLanguage.English)
          },
          {
            label: t('languageChinese'),
            type: 'radio',
            checked: menuLanguage === MenuLanguage.Chinese,
            click: () =>
              handleMenuLanguageChange(MenuLanguage.Chinese)
          }
        ]
      },
      { type: 'separator' },
      {
        label: t('reload'),
        // accelerator: 'CommandOrControl+R',
        click: async () => {
          const newUserSetting = resetUserUrls()
          await options.withBrowserWindow(
            (win) => {
              if (win.isDestroyed()) {
                throw new Error(
                  getTrayMenuText(
                    'windowDestroyedError',
                    menuLanguage
                  )
                )
              }

              const currentModel = newUserSetting.model

              const modelUrlMap: Record<Model, string> = {
                [Model.ChatGPT]: ModelUrl.ChatGPT,
                [Model.DeepSeek]: ModelUrl.DeepSeek,
                [Model.Grok]: ModelUrl.Grok,
                [Model.Gemini]: ModelUrl.Gemini,
                [Model.Qwen]: ModelUrl.Qwen,
                [Model.Doubao]: ModelUrl.Doubao
              }

              const defaultUrl =
                newUserSetting.urls?.[currentModel] ||
                modelUrlMap[currentModel]

              win.webContents.send(
                'model-changed',
                currentModel,
                defaultUrl
              )
            },
            {
              onFailureMessage: getTrayMenuText(
                'reloadWindowError',
                menuLanguage
              )
            }
          )
        }
      },
      {
        label: t('checkForUpdates'),
        click: async () => {
          const browserWindow = getAvailableBrowserWindow(
            windowManager,
            options.getMainBrowserWindow
          )
          await options.updateManager.checkForUpdates(
            browserWindow
          )
        }
      },
      {
        label: t('quit'),
        // accelerator: 'CommandOrControl+Q',
        click: () => {
          resetUserUrls()
          app.quit()
        }
      }
    ])

    // 不自动设置上下文菜单，而是通过 ElectronMenubar 中的右键事件处理程序显示
    // 这样可以确保左键点击只控制窗口显示，右键点击显示菜单
    // tray.setContextMenu(contextMenu)

    // 存储上下文菜单，供右键事件处理程序使用
    ;(tray as unknown as TrayWithContextMenu)._contextMenu =
      contextMenu
  }

  updateContextMenu()

  return updateContextMenu
}
