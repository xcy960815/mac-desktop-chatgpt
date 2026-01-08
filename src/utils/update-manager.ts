import {
  dialog,
  BrowserWindow,
  app,
  shell,
  MessageBoxOptions,
  net
} from 'electron'

/**
 * 更新管理器
 * 负责检查和应用更新
 */
export class UpdateManager {
  private checkingUpdate = false
  private readonly RELEASES_URL =
    'https://github.com/xcy960815/mac-desktop-chatgpt/releases'
  private readonly API_URL =
    'https://api.github.com/repos/xcy960815/mac-desktop-chatgpt/releases/latest'

  constructor() {
    // 无需初始化配置
  }

  /**
   * 检查更新
   * @param {BrowserWindow | null} window - 用于显示对话框的窗口
   * @returns {Promise<void>}
   */
  async checkForUpdates(
    window: BrowserWindow | null = null
  ): Promise<void> {
    if (this.checkingUpdate) {
      return
    }

    this.checkingUpdate = true

    try {
      const latestRelease = await this.getLatestRelease()

      if (!latestRelease) {
        this.showErrorDialog(window, '无法获取版本信息')
        return
      }

      // 移除版本号中的 'v' 前缀
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
        this.showUpdateAvailableDialog(
          window,
          latestVersion,
          currentVersion
        )
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
   * 获取最新发布信息
   */
  private getLatestRelease(): Promise<any> {
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
            const json = JSON.parse(data)
            resolve(json)
          } catch (e) {
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
