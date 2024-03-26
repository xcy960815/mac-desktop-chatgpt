import { ElectronMenubar } from "./menubar"
import { app, globalShortcut, dialog, nativeImage, Tray, shell, Menu } from "electron"
import * as path from "path"
import * as url from 'url';
import contextMenu from "electron-context-menu";

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
      webPreferences: {
        webviewTag: true,
        nodeIntegration: true,
        contextIsolation: false,
      },
      width: 500,
      height: 550,
    },
    index: url.format({
      pathname: path.join(dir, 'index.html'),
      protocol: 'file:',
      slashes: true,
    }),
    tray,
    dir,
    showOnAllWorkspaces: true,
    preloadWindow: true,
    showDockIcon: false,
    icon: image,
  });


  electronMenubar.on("ready", ({ window }) => {

    if (process.platform !== "darwin") {
      window.setSkipTaskbar(true);
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
          window.reload();
        },
      },
      {
        label: "Open in browser",
        accelerator: "Command+O",
        click: () => {
          shell.openExternal("https://chatweb.vdian.net/#/chat/");
        },
      },
    ];
    // 右键事件 弹出菜单
    tray.on("right-click", () => {
      electronMenubar.tray.popUpContextMenu(Menu.buildFromTemplate(contextMenuTemplate));
    });

    // 左键事件 组合点击 ctrl + 左键 或者 command + 左键 弹出菜单
    tray.on("click", (e) => {
      const isCtrlOrMetaKey = e.ctrlKey || e.metaKey
      isCtrlOrMetaKey && electronMenubar.tray.popUpContextMenu(Menu.buildFromTemplate(contextMenuTemplate))

    });

    const menu = new Menu();
    // CommandOrControl+g Command + g
    // Alt+x option + x
    // 添加快捷键 
    globalShortcut.register("CommandOrControl+g", () => {
      const menubarVisible = window.isVisible()
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

    // open devtools
    // window.webContents.openDevTools();
  });

  app.on("web-contents-created", (_event, webContents) => {
   
    
    if (webContents.getType() == "webview") {
      // 在 webview 中使用外部浏览器打开链接
      webContents.on("zoom-changed", (e, url) => {
        e.preventDefault();
        shell.openExternal(url);
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
        // restore focus to previous app on hiding
        electronMenubar.on("after-hide", ({ app }) => {
          app.hide();
        });
      }

     

      // prevent background flickering
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