import { app } from 'electron'
import { WindowManager } from '@/window-manager'
import { readUserSetting } from '@/utils/user-setting'
import { Model, ModelUrl } from '@/utils/constants'

export const setupAppEvents = (
  windowManager: WindowManager
): void => {
  app.on(
    'certificate-error',
    (
      _event,
      _webContents,
      _url,
      _error,
      _certificate,
      callback
    ) => {
      callback(true)
    }
  )

  app.on('activate', () => {
    windowManager.showWindow()
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })

  app.on('before-quit', () => {
    if (windowManager) {
      windowManager.setWillQuit(true)
    }
  })

  windowManager.on('after-show', async () => {
    const win = windowManager.getMainBrowserWindow()
    if (!win) return

    const userSetting = readUserSetting()
    // 使用 ModelUrl 枚举映射简化 URL 获取逻辑
    const modelUrlMap: Record<Model, string> = {
      [Model.ChatGPT]: ModelUrl.ChatGPT,
      [Model.DeepSeek]: ModelUrl.DeepSeek,
      [Model.Grok]: ModelUrl.Grok,
      [Model.Gemini]: ModelUrl.Gemini,
      [Model.Qwen]: ModelUrl.Qwen,
      [Model.Doubao]: ModelUrl.Doubao
    }
    const savedUrl =
      userSetting.urls?.[userSetting.model] ||
      modelUrlMap[userSetting.model]

    win.webContents.send(
      'model-changed',
      userSetting.model,
      savedUrl
    )
  })
}
