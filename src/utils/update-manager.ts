import { autoUpdater } from 'electron-updater'
import {
  dialog,
  BrowserWindow,
  app,
  shell,
  MessageBoxOptions
} from 'electron'

/**
 * 更新管理器
 * 负责检查和应用更新
 */
export class UpdateManager {
  private checkingUpdate = false
  private readonly RELEASES_URL =
    'https://github.com/xcy960815/mac-desktop-chatgpt/releases'

  constructor() {
    // 配置自动更新器
    autoUpdater.autoDownload = false
    autoUpdater.autoInstallOnAppQuit = false

    // 配置更新服务器（GitHub Releases）
    autoUpdater.setFeedURL({
      provider: 'github',
      owner: 'xcy960815',
      repo: 'mac-desktop-chatgpt'
    })
  }

  /**
   * 检查更新
   * @param {BrowserWindow | null} window - 用于显示对话框的窗口
   * @returns {Promise<void>}
   */
  async checkForUpdates(
    window: BrowserWindow | null = null
  ): Promise<void> {
    // 立即给用户反馈
    // 采用静默检查策略：
    // 1. 点击后不弹窗，直接后台检查
    // 2. 检查完成后，无论是有更新还是无更新，都会弹窗提示结果
    // 3. 避免了"正在检查" -> "确定" -> "结果" 的割裂体验

    if (this.checkingUpdate) {
      return
    }

    this.checkingUpdate = true

    try {
      // 直接获取检查结果
      const result = await autoUpdater.checkForUpdates()

      if (result && result.updateInfo) {
        const updateInfo = result.updateInfo
        console.log('最新版本:', updateInfo.version)
        const currentVersion = app.getVersion()

        if (
          this.isNewerVersion(
            updateInfo.version,
            currentVersion
          )
        ) {
          this.showUpdateAvailableDialog(
            window,
            updateInfo.version,
            currentVersion
          )
        } else {
          this.showNoUpdateDialog(window)
        }
      } else {
        this.showNoUpdateDialog(window)
      }
    } catch (error) {
      console.error('检查更新失败:', error)
      this.showErrorDialog(
        window,
        error instanceof Error
          ? error.message
          : '检查更新时发生未知错误'
      )
    } finally {
      this.checkingUpdate = false
    }
  }

  /**
   * 显示有更新可用的对话框
   */
  private showUpdateAvailableDialog(
    window: BrowserWindow | null,
    newVersion: string,
    currentVersion: string
  ): void {
    const message = `发现新版本 ${newVersion}（当前版本：${currentVersion}）\n\n请前往 GitHub 下载最新版本安装。`

    const options: MessageBoxOptions = {
      type: 'info',
      title: '发现新版本',
      message,
      buttons: ['前往下载', '取消'],
      defaultId: 0,
      cancelId: 1
    }

    const handleResponse = (response: number) => {
      if (response === 0) {
        shell.openExternal(this.RELEASES_URL)
      }
    }

    if (window && !window.isDestroyed()) {
      dialog
        .showMessageBox(window, options)
        .then((result) => {
          handleResponse(result.response)
        })
    } else {
      dialog.showMessageBox(options).then((result) => {
        handleResponse(result.response)
      })
    }
  }

  /**
   * 显示无更新对话框
   */
  private showNoUpdateDialog(
    window: BrowserWindow | null
  ): void {
    const message = '当前已是最新版本'
    if (window && !window.isDestroyed()) {
      dialog.showMessageBox(window, {
        type: 'info',
        title: '检查更新',
        message,
        buttons: ['确定']
      })
    } else {
      dialog.showMessageBox({
        type: 'info',
        title: '检查更新',
        message,
        buttons: ['确定']
      })
    }
  }

  /**
   * 显示错误对话框
   */
  private showErrorDialog(
    window: BrowserWindow | null,
    errorMessage: string
  ): void {
    const message = `检查更新失败：${errorMessage}`
    if (window && !window.isDestroyed()) {
      dialog.showMessageBox(window, {
        type: 'error',
        title: '检查更新失败',
        message,
        buttons: ['确定']
      })
    } else {
      dialog.showMessageBox({
        type: 'error',
        title: '检查更新失败',
        message,
        buttons: ['确定']
      })
    }
  }

  /**
   * 比较版本号
   * @param {string} version1 - 版本号1
   * @param {string} version2 - 版本号2
   * @returns {boolean} 如果 version1 大于 version2 返回 true
   */
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

/**
 * 创建更新管理器实例
 * @returns {UpdateManager}
 */
export function createUpdateManager(): UpdateManager {
  return new UpdateManager()
}
