import * as path from "path"
import { ElectronMenubar } from "electron-menubar"
import contextMenu from "electron-context-menu";
import { app, globalShortcut, nativeImage, Tray, shell, Menu } from "electron"

if (require('electron-squirrel-startup')) {
  app.quit();
}

app.on("ready", () => {
  const dir = app.getAppPath();
  /**
   * @desc 创建菜单栏图标
   * @type {Tray}
   * @param {nativeImage} image - 图标
   */
  const image = nativeImage.createFromPath(
    path.join(dir, 'images', `gpt-icon.png`)
  );

  const tray = new Tray(image);
  const electronMenubar = new ElectronMenubar(app, {
    browserWindow: {
      icon: image,
      transparent: true,
      width: 1024,
      height: 768,
      useContentSize: true,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        // 启用webview标签
        webviewTag: true,
        nodeIntegration: true,
        contextIsolation: false,
      },

    },
    index: MAIN_WINDOW_VITE_DEV_SERVER_URL,
    tray,
    dir,
    showOnAllWorkspaces: true,
    preloadWindow: true,
    showDockIcon: false,
    icon: image,
    tooltip: "mac-desktop-chatgpt"
  });


  electronMenubar.on("ready", ({ browserWindow }) => {
    if (process.platform !== "darwin") {
      browserWindow.setSkipTaskbar(true);
    } else {
      app.dock.hide();
    }

    // 创建右键菜单
    const contextMenuTemplate = [
      {
        label: "Quit",
        accelerator: "Command+Q",
        click: () => {
          app.quit();
        },
      },
      {
        label: "Reload",
        accelerator: "Command+R",
        click: () => {
          browserWindow.reload();
        },
      },
      {
        label: "Open in browser",
        accelerator: "Command+O",
        click: () => {
          // shell.openExternal("https://chatweb.xxx.net/#/chat/");
          shell.openExternal("https://chat.openai.com/chat");
        },
      },
    ];

    // 右键菜单 弹出菜单
    tray.on("right-click", () => {
      electronMenubar.tray.popUpContextMenu(Menu.buildFromTemplate(contextMenuTemplate));
    });

    // 左键事件 组合点击 ctrl + 左键 或者 command + 左键 弹出菜单
    tray.on("click", (e) => {
      const isCtrlOrMetaKey = e.ctrlKey || e.metaKey
      isCtrlOrMetaKey && electronMenubar.tray.popUpContextMenu(Menu.buildFromTemplate(contextMenuTemplate))

    });

    const menu = new Menu();

    // 添加快捷键 
    globalShortcut.register("CommandOrControl+g", () => {
      const menubarVisible = browserWindow.isVisible()
      if (menubarVisible) {
        electronMenubar.hideWindow();
      } else {
        electronMenubar.showWindow();
        if (process.platform == "darwin") {
          electronMenubar.app.show();
        }
        electronMenubar.app.focus();
      }
    });

    Menu.setApplicationMenu(menu);

    // 打开开发工具
    // browserWindow.webContents.openDevTools();
  });



  app.on("web-contents-created", (_event, webContents) => {

    const webContentType = webContents.getType()

    if (webContentType == "webview") {
      // 在 webview 中使用外部浏览器打开链接
      webContents.setWindowOpenHandler(({ url }) => {
        // 调用默认浏览器打开
        shell.openExternal(url);
        // 阻止当前浏览器打开页面
        return { action: 'deny' };
      });


      // 在 webview 中设置上下文菜单
      contextMenu({
        window: webContents,
      });

      // 手动注册快捷键
      webContents.on("before-input-event", (_event, input) => {
        const { control, meta, key } = input;
        if (!control && !meta) return;
        switch (key) {
          case "x":
            webContents.cut();
          case "c":
            webContents.copy();
            break;
          case "v":
            webContents.paste();
            break;
          case "a":
            webContents.selectAll();
            break;
          case "z":
            webContents.undo();
            break;
          case "y":
            webContents.redo();
            break;
          case "q":
            app.quit();
            break;
          case "r":
            webContents.reload();
            break;
        }
      });

      if (process.platform == "darwin") {
        electronMenubar.on("after-hide", ({ app }) => {
          app.hide();
        });
      }
      // 防止背景闪烁
      app.commandLine.appendSwitch(
        "disable-backgrounding-occluded-windows",
        "true"
      );
    }
  });
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit()
  }
})