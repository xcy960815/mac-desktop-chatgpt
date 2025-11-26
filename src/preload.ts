// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from 'electron'

/**
 * Electron API 接口定义
 * @interface ElectronAPI
 */
interface ElectronAPI {
  /**
   * 模型改变回调
   * @param {function} callback - 回调函数，接收模型名称和可选的 URL
   * @param {string} callback.modelName - 模型名称
   * @param {string} [callback.url] - 模型 URL（可选）
   * @returns {void}
   */
  onModelChanged: (
    callback: (modelName: string, url?: string) => void
  ) => void
  /**
   * 加载错误回调
   * @param {function} callback - 回调函数，接收错误消息
   * @param {string} callback.errorMessage - 错误消息文本
   * @returns {void}
   */
  onLoadError: (
    callback: (errorMessage: string) => void
  ) => void
  /**
   * 箭头位置更新回调
   * @param {function} callback - 回调函数，接收箭头偏移量
   * @param {number} callback.offset - 偏移量（像素）
   * @returns {void}
   */
  onArrowPositionUpdate: (
    callback: (offset: number) => void
  ) => void
  /**
   * 发送模型改变事件
   * @param {string} model - 模型名称
   * @returns {void}
   */
  sendModelChanged: (model: string) => void
  /**
   * 更新背景颜色
   * @param {string} color - 颜色值（CSS 颜色字符串）
   * @returns {void}
   */
  updateBackgroundColor: (color: string) => void
  /**
   * 设置快捷键
   * @param {string} shortcut - 快捷键字符串
   * @returns {Promise<{ success: boolean; message: string }>} 设置结果
   */
  setToggleShortcut: (
    shortcut: string
  ) => Promise<{ success: boolean; message: string }>
  /**
   * 获取快捷键
   * @returns {Promise<string>} 当前快捷键字符串
   */
  getToggleShortcut: () => Promise<string>
  /**
   * 发送快捷键输入
   * @param {string | null} value - 快捷键字符串，如果为 null 表示取消
   * @returns {void}
   */
  sendShortcutInput: (value: string | null) => void
  /**
   * 当前运行平台
   * @type {string}
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
  onArrowPositionUpdate: (
    callback: (offset: number) => void
  ) => {
    ipcRenderer.on(
      'update-arrow-position',
      (_event, offset: number) => {
        callback(offset)
      }
    )
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
