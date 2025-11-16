// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from 'electron'

// 定义 API 类型
interface ElectronAPI {
  onModelChanged: (
    callback: (modelName: string, url?: string) => void
  ) => void
  onLoadError: (
    callback: (errorMessage: string) => void
  ) => void
  sendModelChanged: (model: string) => void
  updateBackgroundColor: (color: string) => void
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
  platform: process.platform
} as ElectronAPI)
