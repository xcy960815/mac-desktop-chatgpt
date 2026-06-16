import {
  app,
  autoUpdater,
  BrowserWindow,
  dialog,
  MessageBoxOptions,
  net,
  shell
} from 'electron'
import {
  updateElectronApp,
  UpdateSourceType
} from 'update-electron-app'

import { getAppIcon } from '@/utils/common'

interface GitHubRelease {
  tag_name: string
}

interface CreateUpdateManagerOptions {
  getWindow?: () => BrowserWindow | null
}

/**
 * 更新管理器
 * Windows 的正式安装版启用应用内自动更新，
 * macOS / Linux 以及其他场景仍使用 GitHub Release 手动下载。
 */
export class UpdateManager {
  private checkingUpdate = false
  private downloadingUpdate = false
  private autoUpdateInitialized = false
  private manualCheckWindow: BrowserWindow | null = null

  private readonly getWindow: () => BrowserWindow | null
  private readonly RELEASES_URL =
    'https://github.com/xcy960815/mac-desktop-chatgpt/releases'
  private readonly API_URL =
    'https://api.github.com/repos/xcy960815/mac-desktop-chatgpt/releases/latest'
  private readonly REPOSITORY =
    'xcy960815/mac-desktop-chatgpt'
  private readonly AUTO_UPDATE_PLATFORMS =
    new Set<NodeJS.Platform>(['win32'])

  constructor({
    getWindow = () => null
  }: CreateUpdateManagerOptions = {}) {
    this.getWindow = getWindow
  }

  initialize(): void {
    if (
      this.autoUpdateInitialized ||
      !this.shouldUseAutoUpdater()
    ) {
      return
    }

    this.registerAutoUpdaterEvents()

    updateElectronApp({
      updateSource: {
        type: UpdateSourceType.ElectronPublicUpdateService,
        repo: this.REPOSITORY
      },
      updateInterval: '10 minutes',
      notifyUser: false,
      logger: console
    })

    this.autoUpdateInitialized = true
  }

  async checkForUpdates(
    window: BrowserWindow | null = null
  ): Promise<void> {
    const targetWindow = this.resolveWindow(window)

    if (this.checkingUpdate) {
      await this.showInfoDialog(
        targetWindow,
        '检查更新',
        '正在检查更新，请稍后再试。'
      )
      return
    }

    if (this.shouldUseAutoUpdater()) {
      if (this.downloadingUpdate) {
        await this.showInfoDialog(
          targetWindow,
          '检查更新',
          '新版本正在后台下载，下载完成后会提示安装。'
        )
        return
      }

      this.initialize()
      this.manualCheckWindow = targetWindow
      this.checkingUpdate = true

      try {
        autoUpdater.checkForUpdates()
      } catch (error) {
        this.checkingUpdate = false
        this.manualCheckWindow = null

        await this.showErrorDialog(
          targetWindow,
          error instanceof Error
            ? error.message
            : '触发自动更新失败'
        )
      }
      return
    }

    this.checkingUpdate = true

    try {
      const latestRelease = await this.getLatestRelease()

      if (!latestRelease) {
        await this.showErrorDialog(
          targetWindow,
          '无法获取版本信息'
        )
        return
      }

      const latestVersion = latestRelease.tag_name.replace(
        /^v/,
        ''
      )
      const currentVersion = app.getVersion()

      console.log('当前版本:', currentVersion)
      console.log('最新版本:', latestVersion)

      if (
        this.isNewerVersion(latestVersion, currentVersion)
      ) {
        await this.showManualUpdateDialog(
          targetWindow,
          latestVersion,
          currentVersion
        )
      } else {
        await this.showNoUpdateDialog(targetWindow)
      }
    } catch (error) {
      console.error('检查更新失败:', error)
      await this.showErrorDialog(
        targetWindow,
        error instanceof Error
          ? error.message
          : '检查更新时发生未知错误'
      )
    } finally {
      this.checkingUpdate = false
    }
  }

  private shouldUseAutoUpdater(): boolean {
    return (
      app.isPackaged &&
      this.AUTO_UPDATE_PLATFORMS.has(process.platform)
    )
  }

  private registerAutoUpdaterEvents(): void {
    autoUpdater.on('checking-for-update', () => {
      this.checkingUpdate = true
    })

    autoUpdater.on('update-available', async () => {
      this.checkingUpdate = false
      this.downloadingUpdate = true

      if (!this.manualCheckWindow) {
        return
      }

      await this.showInfoDialog(
        this.manualCheckWindow,
        '发现新版本',
        '发现新版本，正在后台下载。下载完成后会提示安装。'
      )
    })

    autoUpdater.on('update-not-available', async () => {
      this.checkingUpdate = false
      this.downloadingUpdate = false

      if (!this.manualCheckWindow) {
        return
      }

      await this.showNoUpdateDialog(this.manualCheckWindow)
      this.manualCheckWindow = null
    })

    autoUpdater.on('update-downloaded', async () => {
      this.checkingUpdate = false
      this.downloadingUpdate = false

      await this.showRestartToInstallDialog(
        this.manualCheckWindow
      )

      this.manualCheckWindow = null
    })

    autoUpdater.on('error', async (error) => {
      console.error('自动更新失败:', error)

      this.checkingUpdate = false
      this.downloadingUpdate = false

      if (!this.manualCheckWindow) {
        return
      }

      await this.showErrorDialog(
        this.manualCheckWindow,
        error instanceof Error
          ? error.message
          : '自动更新失败'
      )

      this.manualCheckWindow = null
    })
  }

  private getLatestRelease(): Promise<GitHubRelease> {
    return new Promise((resolve, reject) => {
      const request = net.request(this.API_URL)

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
          } catch {
            reject(new Error('解析响应数据失败'))
          }
        })
      })

      request.on('error', (error) => {
        reject(error)
      })

      request.end()
    })
  }

  private async showManualUpdateDialog(
    window: BrowserWindow | null,
    newVersion: string,
    currentVersion: string
  ): Promise<void> {
    const result = await this.showMessageBox(window, {
      type: 'info',
      title: '发现新版本',
      message: `发现新版本 ${newVersion}（当前版本：${currentVersion}）\n\n请前往 GitHub 下载最新版本安装。`,
      buttons: ['前往下载', '取消'],
      defaultId: 0,
      cancelId: 1
    })

    if (result.response === 0) {
      await shell.openExternal(this.RELEASES_URL)
    }
  }

  private async showNoUpdateDialog(
    window: BrowserWindow | null
  ): Promise<void> {
    await this.showMessageBox(window, {
      type: 'info',
      title: '检查更新',
      message: '当前已是最新版本',
      buttons: ['确定']
    })
  }

  private async showErrorDialog(
    window: BrowserWindow | null,
    errorMessage: string
  ): Promise<void> {
    await this.showMessageBox(window, {
      type: 'error',
      title: '检查更新失败',
      message: `检查更新失败：${errorMessage}`,
      buttons: ['确定']
    })
  }

  private async showInfoDialog(
    window: BrowserWindow | null,
    title: string,
    message: string
  ): Promise<void> {
    await this.showMessageBox(window, {
      type: 'info',
      title,
      message,
      buttons: ['确定']
    })
  }

  private async showRestartToInstallDialog(
    window: BrowserWindow | null
  ): Promise<void> {
    const result = await this.showMessageBox(window, {
      type: 'info',
      title: '更新已下载',
      message:
        '新版本已经下载完成，重启应用后即可完成安装。',
      buttons: ['立即重启', '稍后'],
      defaultId: 0,
      cancelId: 1
    })

    if (result.response === 0) {
      autoUpdater.quitAndInstall()
    }
  }

  private showMessageBox(
    window: BrowserWindow | null,
    options: MessageBoxOptions
  ) {
    const dialogOptions = {
      icon: getAppIcon(),
      ...options
    }
    const targetWindow = this.resolveWindow(window)

    if (targetWindow) {
      return dialog.showMessageBox(
        targetWindow,
        dialogOptions
      )
    }

    return dialog.showMessageBox(dialogOptions)
  }

  private resolveWindow(
    window: BrowserWindow | null = null
  ): BrowserWindow | null {
    if (window && !window.isDestroyed()) {
      return window
    }

    const currentWindow = this.getWindow()
    if (currentWindow && !currentWindow.isDestroyed()) {
      return currentWindow
    }

    return null
  }

  private isNewerVersion(
    version1: string,
    version2: string
  ): boolean {
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
}

export function createUpdateManager(
  options: CreateUpdateManagerOptions = {}
): UpdateManager {
  return new UpdateManager(options)
}
