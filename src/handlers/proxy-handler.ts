import {
  app,
  dialog,
  session,
  BrowserWindow,
  Tray
} from 'electron'
import {
  readUserSetting,
  writeUserSetting
} from '@/utils/user-setting'
import { AppTrayOptions } from '@/tray-context-menu'
import { showProxyInputDialog } from '@/proxy-input-dialog'
import { getTrayMenuText } from '@/i18n/tray-menu'
import { MenuLanguage } from '@/utils/constants'
import { getAppIcon } from '@/utils/common'

/**
 * 延迟指定的时间
 * @param {number} ms - 延迟的毫秒数
 * @returns {Promise<unknown>} 延迟 Promise
 */
const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms))

/**
 * 创建代理设置处理函数
 * @param {TrayContextMenuOptions} options - 托盘上下文菜单配置选项
 * @param {MenuLanguage} menuLanguage - 当前菜单语言
 * @returns {() => Promise<void>} 代理设置处理函数
 */
export const createProxyHandler = (
  options: AppTrayOptions & { tray: Tray },
  menuLanguage: MenuLanguage
) => {
  return async () => {
    try {
      const userSetting = readUserSetting()
      const savedProxy = userSetting.proxy || ''

      let input: string | null = null
      try {
        input = await showProxyInputDialog(
          null,
          savedProxy,
          menuLanguage
        )
      } catch (error) {
        dialog.showMessageBox({
          icon: getAppIcon(),
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
        // 校验代理格式
        if (proxy) {
          // 支持的格式:
          // 1. 协议://IP:端口 (http://127.0.0.1:7890)
          // 2. IP:端口 (127.0.0.1:7890)
          // 3. 域名:端口 (example.com:8080)
          const proxyRegex =
            /^(?:(http|https|socks|socks4|socks5):\/\/)?(?:[\w-]+\.)+[\w-]+(?::\d+)?$/
          // 简单的 IP:Port 校验
          const simpleProxyRegex = /^([\w-]+\.)+[\w-]+:\d+$/

          if (
            !proxyRegex.test(proxy) &&
            !simpleProxyRegex.test(proxy)
          ) {
            dialog.showMessageBox({
              icon: getAppIcon(),
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
                getTrayMenuText('confirm', menuLanguage)
              ],
              defaultId: 0
            })
            return
          }
        }

        const history = currentSetting.proxyHistory || []
        let newHistory = history
        if (proxy) {
          newHistory = [
            proxy,
            ...history.filter((p) => p !== proxy)
          ].slice(0, 10)
        }

        writeUserSetting({
          ...currentSetting,
          proxy: proxy || undefined,
          proxyHistory: newHistory
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
        dialog.showMessageBox({
          icon: getAppIcon(),
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
      dialog.showMessageBox({
        icon: getAppIcon(),
        type: 'error',
        title: getTrayMenuText('errorTitle', menuLanguage),
        message:
          getTrayMenuText(
            'proxySetErrorMessagePrefix',
            menuLanguage
          ) + String(error),
        buttons: [getTrayMenuText('confirm', menuLanguage)]
      })
    }
  }
}
