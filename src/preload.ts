// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import {
  contextBridge,
  ipcRenderer,
  IpcRendererEvent
} from 'electron'

// 定义 API 类型
interface ElectronAPI {
  onModelChanged: (
    callback: (model: string) => void
  ) => void
  sendModelChanged: (model: string) => void
}

// 暴露安全的 API 到渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  onModelChanged: (callback: (model: string) => void) => {
    const subscription = (
      _event: IpcRendererEvent,
      model: string
    ) => callback(model)
    ipcRenderer.on('model-changed', subscription)
    return () => {
      ipcRenderer.removeListener(
        'model-changed',
        subscription
      )
    }
  },
  sendModelChanged: (model: string) => {
    ipcRenderer.send('model-changed', model)
  }
} as ElectronAPI)
