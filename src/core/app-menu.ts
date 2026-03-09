import { app, Menu, BrowserWindow } from 'electron'

export function setupAppMenu(browserWindow: BrowserWindow) {
  // macOS 保留系统应用菜单（关于、退出等），非 macOS 平台隐藏菜单栏
  if (process.platform === 'darwin') {
    const template: Electron.MenuItemConstructorOptions[] =
      [
        {
          label: app.name,
          submenu: [
            { role: 'about' },
            { type: 'separator' },
            { role: 'services' },
            { type: 'separator' },
            { role: 'hide' },
            { role: 'hideOthers' },
            { role: 'unhide' },
            { type: 'separator' },
            { role: 'quit' }
          ]
        },
        {
          label: 'Edit',
          submenu: [
            { role: 'undo' },
            { role: 'redo' },
            { type: 'separator' },
            { role: 'cut' },
            { role: 'copy' },
            { role: 'paste' },
            { role: 'pasteAndMatchStyle' },
            { role: 'delete' },
            { role: 'selectAll' }
          ]
        }
      ]
    const menu = Menu.buildFromTemplate(template)
    Menu.setApplicationMenu(menu)
  } else {
    // Windows/Linux 隐藏菜单栏
    Menu.setApplicationMenu(null)

    // 通过 before-input-event 在 Windows/Linux 手动实现快捷键支持
    // 因为这部分平台隐藏了顶部菜单栏，没有系统原生的 Edit 支持
    browserWindow.webContents.on(
      'before-input-event',
      (event, input) => {
        if (!input.control) return

        switch (input.key.toLowerCase()) {
          case 'c':
            browserWindow.webContents.copy()
            break
          case 'v':
            browserWindow.webContents.paste()
            break
          case 'x':
            browserWindow.webContents.cut()
            break
          case 'a':
            browserWindow.webContents.selectAll()
            break
          case 'z':
            if (input.shift) {
              browserWindow.webContents.redo()
            } else {
              browserWindow.webContents.undo()
            }
            break
        }
      }
    )
  }
}
