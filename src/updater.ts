import { autoUpdater, UpdateInfo } from 'electron-updater'
import { app, dialog, BrowserWindow } from 'electron'

/**
 * 更新检查器配置选项
 */
interface UpdaterOptions {
  /** 是否在应用启动时自动检查更新 */
  autoCheckOnStart?: boolean
  /** 检查更新的间隔（毫秒），默认 4 小时 */
  checkInterval?: number
}

/**
 * 创建更新检查器
 * @param {UpdaterOptions} options - 更新检查器配置选项
 * @returns {void}
 */
export const createUpdater = (
  options: UpdaterOptions = {}
) => {
  const {
    autoCheckOnStart = false,
    checkInterval = 4 * 60 * 60 * 1000 // 4 小时
  } = options

  // 配置自动更新器
  // electron-updater 会自动从 package.json 的 repository 字段读取 GitHub 信息
  // 如果需要手动配置，可以使用以下方式：
  // autoUpdater.setFeedURL({
  //   provider: 'github',
  //   owner: 'xcy960815',
  //   repo: 'mac-desktop-chatgpt'
  // })

  // 禁用自动下载，手动控制下载和安装
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = false

  // 检查更新错误处理
  autoUpdater.on('error', (error) => {
    console.error('更新检查错误:', error)
  })

  // 检查更新可用
  autoUpdater.on('update-available', (info: UpdateInfo) => {
    const currentVersion = app.getVersion()
    const latestVersion = info.version

    const browserWindow = BrowserWindow.getFocusedWindow()

    dialog
      .showMessageBox(browserWindow || undefined, {
        type: 'info',
        title: '发现新版本',
        message: `发现新版本 ${latestVersion}`,
        detail: `当前版本: ${currentVersion}\n最新版本: ${latestVersion}\n\n是否现在下载并安装？`,
        buttons: ['立即更新', '稍后提醒'],
        defaultId: 0,
        cancelId: 1
      })
      .then((result) => {
        if (result.response === 0) {
          // 用户选择立即更新
          downloadUpdate()
        }
      })
      .catch((error) => {
        console.error('显示更新对话框错误:', error)
      })
  })

  // 检查更新不可用
  autoUpdater.on('update-not-available', () => {
    const browserWindow = BrowserWindow.getFocusedWindow()

    dialog
      .showMessageBox(browserWindow || undefined, {
        type: 'info',
        title: '检查更新',
        message: '当前已是最新版本',
        detail: `当前版本: ${app.getVersion()}`,
        buttons: ['确定']
      })
      .catch((error) => {
        console.error('显示更新对话框错误:', error)
      })
  })

  // 下载进度
  autoUpdater.on('download-progress', (progress) => {
    console.log(
      `下载进度: ${Math.round(progress.percent)}% (${
        progress.transferred
      }/${progress.total})`
    )
  })

  // 下载完成
  autoUpdater.on('update-downloaded', () => {
    const browserWindow = BrowserWindow.getFocusedWindow()

    dialog
      .showMessageBox(browserWindow || undefined, {
        type: 'info',
        title: '更新下载完成',
        message: '更新已下载完成',
        detail:
          '应用将在关闭后自动安装更新。是否现在重启并安装？',
        buttons: ['立即重启', '稍后重启'],
        defaultId: 0,
        cancelId: 1
      })
      .then((result) => {
        if (result.response === 0) {
          // 用户选择立即重启
          autoUpdater.quitAndInstall(false, true)
        }
      })
      .catch((error) => {
        console.error('显示更新对话框错误:', error)
      })
  })

  /**
   * 手动检查更新
   * @returns {Promise<void>}
   */
  const checkForUpdates = async (): Promise<void> => {
    try {
      // 在开发环境中跳过更新检查
      if (!app.isPackaged) {
        const browserWindow =
          BrowserWindow.getFocusedWindow()
        dialog
          .showMessageBox(browserWindow || undefined, {
            type: 'info',
            title: '检查更新',
            message: '开发环境不支持更新检查',
            detail: '请在打包后的应用中使用此功能',
            buttons: ['确定']
          })
          .catch((error) => {
            console.error('显示更新对话框错误:', error)
          })
        return
      }

      await autoUpdater.checkForUpdates()
    } catch (error) {
      console.error('检查更新失败:', error)
      const browserWindow = BrowserWindow.getFocusedWindow()
      dialog
        .showMessageBox(browserWindow || undefined, {
          type: 'error',
          title: '检查更新失败',
          message: '无法检查更新',
          detail:
            error instanceof Error
              ? error.message
              : '请检查网络连接或稍后重试',
          buttons: ['确定']
        })
        .catch((err) => {
          console.error('显示错误对话框失败:', err)
        })
    }
  }

  /**
   * 下载更新
   * @returns {Promise<void>}
   */
  const downloadUpdate = async (): Promise<void> => {
    try {
      await autoUpdater.downloadUpdate()
    } catch (error) {
      console.error('下载更新失败:', error)
      const browserWindow = BrowserWindow.getFocusedWindow()
      dialog
        .showMessageBox(browserWindow || undefined, {
          type: 'error',
          title: '下载更新失败',
          message: '无法下载更新',
          detail:
            error instanceof Error
              ? error.message
              : '请检查网络连接或稍后重试',
          buttons: ['确定']
        })
        .catch((err) => {
          console.error('显示错误对话框失败:', err)
        })
    }
  }

  // 如果启用自动检查，在应用启动时检查更新
  if (autoCheckOnStart) {
    app.whenReady().then(() => {
      // 延迟 5 秒后检查更新，避免影响应用启动速度
      setTimeout(() => {
        checkForUpdates().catch((error) => {
          console.error('自动检查更新失败:', error)
        })
      }, 5000)
    })
  }

  // 定期检查更新
  if (checkInterval > 0) {
    setInterval(() => {
      checkForUpdates().catch((error) => {
        console.error('定期检查更新失败:', error)
      })
    }, checkInterval)
  }

  return {
    checkForUpdates,
    downloadUpdate
  }
}
