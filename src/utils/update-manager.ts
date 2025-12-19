import { autoUpdater } from 'electron-updater'
import { dialog, BrowserWindow, app } from 'electron'

/**
 * 更新管理器
 * 负责检查和应用更新
 */
export class UpdateManager {
  private checkingUpdate = false

  constructor() {
    // 配置自动更新器
    autoUpdater.autoDownload = false // 不自动下载，让用户选择
    autoUpdater.autoInstallOnAppQuit = true // 应用退出时自动安装更新

    // 配置更新服务器（GitHub Releases）
    // 显式设置 provider 为 github，避免依赖 app-update.yml
    autoUpdater.setFeedURL({
      provider: 'github',
      owner: 'xcy960815',
      repo: 'mac-desktop-chatgpt'
    })

    // 监听更新检查事件
    autoUpdater.on('checking-for-update', () => {
      console.log('正在检查更新...')
    })

    autoUpdater.on('update-available', (info) => {
      console.log('发现新版本:', info.version)
    })

    autoUpdater.on('update-not-available', () => {
      console.log('当前已是最新版本')
    })

    autoUpdater.on('error', (error) => {
      console.error('更新检查出错:', error)
    })

    autoUpdater.on('download-progress', (progress) => {
      console.log('下载进度:', progress.percent)
    })

    autoUpdater.on('update-downloaded', () => {
      console.log('更新下载完成')
    })
  }

  /**
   * 检查是否在开发环境
   * @returns {boolean}
   */
  private isDevelopment(): boolean {
    return (
      process.env.NODE_ENV === 'development' ||
      !app.isPackaged
    )
  }

  /**
   * 检查更新
   * @param {BrowserWindow | null} window - 用于显示对话框的窗口
   * @returns {Promise<void>}
   */
  async checkForUpdates(
    window: BrowserWindow | null = null
  ): Promise<void> {
    // 在开发环境中提示
    if (this.isDevelopment()) {
      if (window && !window.isDestroyed()) {
        dialog.showMessageBox(window, {
          type: 'info',
          title: '检查更新',
          message:
            '开发环境中无法检查更新，请在打包后的应用中使用此功能。',
          buttons: ['确定']
        })
      } else {
        dialog.showMessageBox({
          type: 'info',
          title: '检查更新',
          message:
            '开发环境中无法检查更新，请在打包后的应用中使用此功能。',
          buttons: ['确定']
        })
      }
      return
    }

    if (this.checkingUpdate) {
      if (window && !window.isDestroyed()) {
        dialog.showMessageBox(window, {
          type: 'info',
          title: '检查更新',
          message: '正在检查更新，请稍候...',
          buttons: ['确定']
        })
      }
      return
    }

    this.checkingUpdate = true

    try {
      // 使用事件监听方式处理更新检查
      let updateAvailable = false
      let updateInfo: any = null

      const updateAvailableHandler = (info: any) => {
        updateAvailable = true
        updateInfo = info
      }

      const updateNotAvailableHandler = () => {
        updateAvailable = false
      }

      autoUpdater.once(
        'update-available',
        updateAvailableHandler
      )
      autoUpdater.once(
        'update-not-available',
        updateNotAvailableHandler
      )

      // 检查更新
      await autoUpdater.checkForUpdates()

      // 等待一段时间让事件触发
      await new Promise((resolve) =>
        setTimeout(resolve, 1000)
      )

      // 移除事件监听器
      autoUpdater.removeListener(
        'update-available',
        updateAvailableHandler
      )
      autoUpdater.removeListener(
        'update-not-available',
        updateNotAvailableHandler
      )

      if (updateAvailable && updateInfo) {
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
            currentVersion,
            updateInfo.releaseNotes as string | undefined
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
    currentVersion: string,
    releaseNotes?: string
  ): void {
    // 移除 HTML 标签，只保留纯文本
    const cleanReleaseNotes = releaseNotes
      ? releaseNotes.replace(/<[^>]*>/g, '').trim()
      : undefined

    const message = `发现新版本 ${newVersion}（当前版本：${currentVersion}）\n\n是否现在下载并安装？`
    const detail = cleanReleaseNotes
      ? `更新内容：\n${cleanReleaseNotes}`
      : undefined

    if (!window || window.isDestroyed()) {
      // 如果没有窗口，使用无窗口对话框
      dialog
        .showMessageBox({
          type: 'info',
          title: '发现新版本',
          message,
          detail,
          buttons: ['立即更新', '稍后提醒'],
          defaultId: 0,
          cancelId: 1
        })
        .then((result) => {
          if (result.response === 0) {
            this.downloadAndInstallUpdate(window)
          }
        })
      return
    }

    dialog
      .showMessageBox(window, {
        type: 'info',
        title: '发现新版本',
        message,
        detail,
        buttons: ['立即更新', '稍后提醒'],
        defaultId: 0,
        cancelId: 1
      })
      .then((result) => {
        if (result.response === 0) {
          this.downloadAndInstallUpdate(window)
        }
      })
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
   * 下载并安装更新
   */
  private async downloadAndInstallUpdate(
    window: BrowserWindow | null
  ): Promise<void> {
    try {
      // 显示下载进度对话框
      if (window && !window.isDestroyed()) {
        dialog.showMessageBox(window, {
          type: 'info',
          title: '下载更新',
          message: '正在下载更新，请稍候...',
          buttons: ['确定'],
          noLink: true
        })
      }

      // 监听下载进度
      autoUpdater.once('update-downloaded', () => {
        if (window && !window.isDestroyed()) {
          dialog
            .showMessageBox(window, {
              type: 'info',
              title: '更新下载完成',
              message:
                '更新已下载完成，将在应用退出时自动安装。是否立即重启应用以安装更新？',
              buttons: ['立即重启', '稍后重启'],
              defaultId: 0,
              cancelId: 1
            })
            .then((result) => {
              if (result.response === 0) {
                autoUpdater.quitAndInstall(false, true)
              }
            })
        } else {
          dialog
            .showMessageBox({
              type: 'info',
              title: '更新下载完成',
              message:
                '更新已下载完成，将在应用退出时自动安装。是否立即重启应用以安装更新？',
              buttons: ['立即重启', '稍后重启'],
              defaultId: 0,
              cancelId: 1
            })
            .then((result) => {
              if (result.response === 0) {
                autoUpdater.quitAndInstall(false, true)
              }
            })
        }
      })

      // 开始下载更新
      await autoUpdater.downloadUpdate()
    } catch (error) {
      console.error('下载更新失败:', error)
      const errorMessage =
        error instanceof Error
          ? error.message
          : '下载更新时发生未知错误'
      this.showErrorDialog(window, errorMessage)
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
