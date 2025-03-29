// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts


import { contextBridge, ipcRenderer } from 'electron';


contextBridge.exposeInMainWorld('electronAPI', {
    onModelChanged: (callback: (model: string) => void) => {
        ipcRenderer.on('model-changed', (event, model) => callback(model));
    }
});
