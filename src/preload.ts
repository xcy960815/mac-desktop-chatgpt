// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from 'electron'

// 定义 API 类型
interface ElectronAPI {
  /**
   * 模型改变回调
   * @param callback (modelName: string, url?: string) => void
   * @returns void
   */
  onModelChanged: (
    callback: (modelName: string, url?: string) => void
  ) => void
  /**
   * 加载错误回调
   * @param callback (errorMessage: string) => void
   * @returns void
   */
  onLoadError: (
    callback: (errorMessage: string) => void
  ) => void
  /**
   * 发送模型改变
   * @param model string
   * @returns void
   */
  sendModelChanged: (model: string) => void
  /**
   * 更新背景颜色
   * @param color string
   * @returns void
   */
  updateBackgroundColor: (color: string) => void
  /**
   * 设置快捷键
   * @param shortcut string
   * @returns Promise<{ success: boolean; message: string }>
   */
  setToggleShortcut: (
    shortcut: string
  ) => Promise<{ success: boolean; message: string }>
  /**
   * 获取快捷键
   * @returns Promise<string>
   */
  getToggleShortcut: () => Promise<string>
  /**
   * 发送快捷键输入
   * @param value string | null
   * @returns void
   */
  sendShortcutInput: (value: string | null) => void
  /**
   * 平台
   * @returns string
   */
  platform: string
}

// 暴露安全的 API 到渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  onModelChanged: (
    callback: (modelName: string, url?: string) => void
  ) => {
    ipcRenderer.on(
      'model-changed',
      (_event, modelName, url) => {
        callback(modelName, url)
      }
    )
  },
  onLoadError: (
    callback: (errorMessage: string) => void
  ) => {
    ipcRenderer.on('load-error', (_event, errorMessage) => {
      callback(errorMessage)
    })
  },
  sendModelChanged: (model: string) => {
    ipcRenderer.send('model-changed', model)
  },
  updateBackgroundColor: (color: string) => {
    ipcRenderer.send('update-background-color', color)
  },
  setToggleShortcut: (shortcut: string) => {
    return ipcRenderer.invoke(
      'set-toggle-shortcut',
      shortcut
    )
  },
  getToggleShortcut: () => {
    return ipcRenderer.invoke('get-toggle-shortcut')
  },
  sendShortcutInput: (value: string | null) => {
    ipcRenderer.send('shortcut-input-response', value)
  },
  platform: process.platform
} as ElectronAPI)
