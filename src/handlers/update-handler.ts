import {
  dialog,
  app,
  shell,
  MessageBoxOptions,
  net,
  Tray
} from 'electron'
import { getAppIcon } from '@/utils/common'
import { AppTrayOptions } from '@/tray-context-menu'
import { getTrayMenuText } from '@/i18n/tray-menu'
import { MenuLanguage } from '@/utils/constants'
import { getAvailableBrowserWindow } from './utils'

/**
 * GitHub Release 接口定义
 */
interface GitHubRelease {
  url: string
  assets_url: string
  upload_url: string
  html_url: string
  id: number
  author: any
  node_id: string
  tag_name: string
  target_commitish: string
  name: string
  draft: boolean
  prerelease: boolean
  created_at: string
  published_at: string
  assets: Array<any>
  tarball_url: string
  zipball_url: string
  body: string
}

let isCheckingUpdate = false
const RELEASES_URL =
  'https://github.com/xcy960815/mac-desktop-chatgpt/releases'
const API_URL =
  'https://api.github.com/repos/xcy960815/mac-desktop-chatgpt/releases/latest'

/**
 * 比较版本号
 * @param {string} version1 - 版本号1
 * @param {string} version2 - 版本号2
 * @returns {boolean} 如果 version1 大于 version2 返回 true
 */
const isNewerVersion = (
  version1: string,
  version2: string
): boolean => {
  const v1Parts = version1.split('.').map(Number)
  const v2Parts = version2.split('.').map(Number)

  for (
    let i = 0;
    i < Math.max(v1Parts.length, v2Parts.length);
    i++
  ) {
    const v1Part = v1Parts[i] || 0
    const v2Part = v2Parts[i] || 0

    if (v1Part > v2Part) {
      return true
    }
    if (v1Part < v2Part) {
      return false
    }
  }

  return false
}

/**
 * 获取最新发布信息
 */
const getLatestRelease = (): Promise<GitHubRelease> => {
  return new Promise((resolve, reject) => {
    const request = net.request(API_URL)

    request.on('response', (response) => {
      if (response.statusCode !== 200) {
        reject(
          new Error(
            `GitHub API 返回错误: ${response.statusCode}`
          )
        )
        return
      }

      let data = ''
      response.on('data', (chunk) => {
        data += chunk.toString()
      })

      response.on('end', () => {
        try {
          const json = JSON.parse(data) as GitHubRelease
          resolve(json)
        } catch (e) {
          reject(new Error('fail_parse'))
        }
      })
    })

    request.on('error', (error) => {
      reject(error)
    })

    request.end()
  })
}

/**
 * 创建系统检查更新处理程序
 * @param {AppTrayOptions & { tray: Tray }} options - 菜单上下文配置
 * @param {MenuLanguage} menuLanguage - 当前菜单语言
 * @returns {() => Promise<void>}
 */
export const createUpdateHandler = (
  options: AppTrayOptions & { tray: Tray },
  menuLanguage: MenuLanguage
) => {
  return async () => {
    if (isCheckingUpdate) {
      return
    }

    isCheckingUpdate = true
    const window = getAvailableBrowserWindow(
      options.windowManager
    )

    const t = (
      key: Parameters<typeof getTrayMenuText>[0]
    ) => getTrayMenuText(key, menuLanguage)

    try {
      const latestRelease = await getLatestRelease()

      if (!latestRelease) {
        throw new Error(t('updateCheckFetchFailed'))
      }

      // 移除版本号中的 'v' 前缀
      const latestVersion = latestRelease.tag_name.replace(
        /^v/,
        ''
      )
      const currentVersion = app.getVersion()

      console.log('当前版本:', currentVersion)
      console.log('最新版本:', latestVersion)

      if (isNewerVersion(latestVersion, currentVersion)) {
        // 发现新版本
        const message = t('updateAvailableMessage')
          .replace('{newVersion}', latestVersion)
          .replace('{currentVersion}', currentVersion)

        const dialogOptions: MessageBoxOptions = {
          icon: getAppIcon(),
          type: 'info',
          title: t('updateAvailableTitle'),
          message,
          buttons: [
            t('updateAvailableDownload'),
            t('cancel')
          ],
          defaultId: 0,
          cancelId: 1
        }

        const handleResponse = (response: number) => {
          if (response === 0) {
            shell.openExternal(RELEASES_URL)
          }
        }

        if (window && !window.isDestroyed()) {
          dialog
            .showMessageBox(window, dialogOptions)
            .then((result) => {
              handleResponse(result.response)
            })
        } else {
          dialog
            .showMessageBox(dialogOptions)
            .then((result) => {
              handleResponse(result.response)
            })
        }
      } else {
        // 无更新
        const noUpdateMessage = t(
          'updateNoUpdateMessage'
        ).replace('{currentVersion}', currentVersion)

        const noUpdateOptions: MessageBoxOptions = {
          icon: getAppIcon(),
          type: 'info',
          title: t('updateNoUpdateTitle'),
          message: noUpdateMessage,
          buttons: [t('confirm')]
        }

        if (window && !window.isDestroyed()) {
          dialog.showMessageBox(window, noUpdateOptions)
        } else {
          dialog.showMessageBox(noUpdateOptions)
        }
      }
    } catch (error) {
      console.error('检查更新失败:', error)
      let errorMsg =
        error instanceof Error
          ? error.message
          : String(error)

      if (errorMsg === 'fail_parse') {
        errorMsg = t('updateCheckParseFailed')
      }

      const errorOptions: MessageBoxOptions = {
        icon: getAppIcon(),
        type: 'error',
        title: t('updateCheckFailedTitle'),
        message: `${t('updateCheckFailedMessagePrefix')}${errorMsg}`,
        buttons: [t('confirm')]
      }

      if (window && !window.isDestroyed()) {
        dialog.showMessageBox(window, errorOptions)
      } else {
        dialog.showMessageBox(errorOptions)
      }
    } finally {
      isCheckingUpdate = false
    }
  }
}
