import { dialog, globalShortcut } from 'electron'
import {
  readUserSetting,
  writeUserSetting
} from '@/utils/user-setting'
import { TrayContextMenuOptions } from '@/tray-context-menu'
import { showShortcutInputDialog } from '@/shortcut-input-dialog'
import { getTrayMenuText } from '@/i18n/tray-menu'
import { MenuLanguage } from '@/utils/constants'
import { getAvailableBrowserWindow } from './utils'
import { getAppIcon } from '@/utils/common'

/**
 * 延迟指定的时间
 * @param {number} ms - 延迟的毫秒数
 * @returns {Promise<unknown>} 延迟 Promise
 */
const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms))

/**
 * 创建快捷键设置处理函数
 * @param {TrayContextMenuOptions} options - 托盘上下文菜单配置选项
 * @param {() => void} updateContextMenu - 更新上下文菜单的回调函数
 * @param {MenuLanguage} menuLanguage - 当前菜单语言
 * @returns {() => Promise<void>} 快捷键设置处理函数
 */
export const createShortcutHandler = (
  options: TrayContextMenuOptions,
  updateContextMenu: () => void,
  menuLanguage: MenuLanguage
) => {
  return async () => {
    try {
      const userSetting = readUserSetting()
      const savedShortcut =
        userSetting.toggleShortcut || 'CommandOrControl+g'

      if (!options.isMenubarReady()) {
        for (
          let i = 0;
          i < 20 && !options.isMenubarReady();
          i++
        ) {
          await delay(100)
        }
      }

      // 打开对话框前临时取消注册快捷键，避免录入时触发
      const currentShortcutBeforeDialog =
        options.getCurrentShortcut()
      if (currentShortcutBeforeDialog) {
        globalShortcut.unregister(
          currentShortcutBeforeDialog
        )
      }

      let input: string | null = null
      try {
        input = await showShortcutInputDialog(
          null,
          savedShortcut,
          menuLanguage
        )
      } catch (error) {
        // 出错时恢复快捷键
        if (currentShortcutBeforeDialog) {
          globalShortcut.register(
            currentShortcutBeforeDialog,
            () => {
              const menubarWindow =
                getAvailableBrowserWindow(
                  options.windowManager,
                  options.getMainBrowserWindow
                )
              if (!menubarWindow) return
              options.windowManager.toggleWindow()
            }
          )
        }
        dialog.showMessageBox({
          icon: getAppIcon(),
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

      if (input === null) {
        // 用户点击了取消，恢复原快捷键
        if (currentShortcutBeforeDialog) {
          globalShortcut.register(
            currentShortcutBeforeDialog,
            () => {
              const menubarWindow =
                getAvailableBrowserWindow(
                  options.windowManager,
                  options.getMainBrowserWindow
                )
              if (!menubarWindow) return
              options.windowManager.toggleWindow()
            }
          )
        }
        return
      }

      if (input && input.trim()) {
        const shortcut = input.trim()
        if (!shortcut || shortcut.trim() === '') {
          dialog.showMessageBox({
            icon: getAppIcon(),
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
          // 恢复原快捷键
          if (currentShortcutBeforeDialog) {
            globalShortcut.register(
              currentShortcutBeforeDialog,
              () => {
                const menubarWindow =
                  getAvailableBrowserWindow(
                    options.windowManager,
                    options.getMainBrowserWindow
                  )
                if (!menubarWindow) return
                options.windowManager.toggleWindow()
              }
            )
          }
          return
        }

        // 快捷键已在对话框打开前取消注册，无需再次 unregister
        const registered = globalShortcut.register(
          shortcut,
          () => {
            const menubarWindow = getAvailableBrowserWindow(
              options.windowManager,
              options.getMainBrowserWindow
            )
            if (!menubarWindow) {
              return
            }
            options.windowManager.toggleWindow()
          }
        )

        if (registered) {
          const currentSetting = readUserSetting()
          const history =
            currentSetting.shortcutHistory || []
          const newHistory = [
            shortcut,
            ...history.filter((s) => s !== shortcut)
          ].slice(0, 10)
          writeUserSetting({
            ...currentSetting,
            toggleShortcut: shortcut,
            shortcutHistory: newHistory
          })
          options.setCurrentShortcut(shortcut)
          dialog.showMessageBox({
            icon: getAppIcon(),
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
          // 注册新快捷键失败，恢复原快捷键
          if (currentShortcutBeforeDialog) {
            globalShortcut.register(
              currentShortcutBeforeDialog,
              () => {
                const menubarWindow =
                  getAvailableBrowserWindow(
                    options.windowManager,
                    options.getMainBrowserWindow
                  )
                if (!menubarWindow) {
                  return
                }
                options.windowManager.toggleWindow()
              }
            )
          }
          dialog.showMessageBox({
            icon: getAppIcon(),
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
        const resetResult = await dialog.showMessageBox({
          icon: getAppIcon(),
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
            getTrayMenuText('confirm', menuLanguage),
            getTrayMenuText('cancel', menuLanguage)
          ],
          cancelId: 1
        })
        if (resetResult.response === 0) {
          // 快捷键已在对话框打开前取消注册，无需再次 unregister
          const defaultRegistered = globalShortcut.register(
            'CommandOrControl+g',
            () => {
              const menubarWindow =
                getAvailableBrowserWindow(
                  options.windowManager,
                  options.getMainBrowserWindow
                )
              if (!menubarWindow) {
                return
              }
              options.windowManager.toggleWindow()
            }
          )

          if (defaultRegistered) {
            const userSetting = readUserSetting()
            writeUserSetting({
              ...userSetting,
              toggleShortcut: 'CommandOrControl+g'
            })
            options.setCurrentShortcut('CommandOrControl+g')
            dialog.showMessageBox({
              icon: getAppIcon(),
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
                getTrayMenuText('confirm', menuLanguage)
              ]
            })
          } else {
            // 重置失败，恢复原快捷键
            if (currentShortcutBeforeDialog) {
              globalShortcut.register(
                currentShortcutBeforeDialog,
                () => {
                  const menubarWindow =
                    getAvailableBrowserWindow(
                      options.windowManager,
                      options.getMainBrowserWindow
                    )
                  if (!menubarWindow) return
                  options.windowManager.toggleWindow()
                }
              )
            }
            dialog.showMessageBox({
              icon: getAppIcon(),
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
                getTrayMenuText('confirm', menuLanguage)
              ]
            })
          }
        } else {
          // 用户取消重置，恢复原快捷键
          if (currentShortcutBeforeDialog) {
            globalShortcut.register(
              currentShortcutBeforeDialog,
              () => {
                const menubarWindow =
                  getAvailableBrowserWindow(
                    options.windowManager,
                    options.getMainBrowserWindow
                  )
                if (!menubarWindow) return
                options.windowManager.toggleWindow()
              }
            )
          }
        }
      }
    } catch (error) {
      const browserWindow = getAvailableBrowserWindow(
        options.windowManager,
        options.getMainBrowserWindow
      )
      dialog.showMessageBox(browserWindow || undefined, {
        icon: getAppIcon(),
        type: 'error',
        title: getTrayMenuText('errorTitle', menuLanguage),
        message:
          getTrayMenuText(
            'shortcutSetErrorMessagePrefix',
            menuLanguage
          ) +
          (error instanceof Error
            ? error.message
            : String(error)),
        buttons: [getTrayMenuText('confirm', menuLanguage)]
      })
    }
  }
}
