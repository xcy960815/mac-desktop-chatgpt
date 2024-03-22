// import electronReload from "electron-reload"
// import * as electronReloader from "electron-reloader" // 目前这个好用  electron-reload 不知道怎么配置
import { Menubar } from "./menubar"
import { app, globalShortcut, nativeImage, Tray, shell, Menu } from "electron"
import * as path from "path"
// import * as url from 'url';
import * as contextMenu from "electron-context-menu";
// const isDevelopment = !app.isPackaged


// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}




app.on("ready", () => {
  /**
   * @desc 创建菜单栏图标
   * @type {Tray}
   * @param {nativeImage} image - 图标
   */
  const image = nativeImage.createFromPath(
    path.join(app.getAppPath(),'images', `gpt-icon.png`)
  );
  
  const tray = new Tray(image);

  const menubar = new Menubar(app, {
    browserWindow: {
      icon: image,
      transparent: true,
      webPreferences: {
        webviewTag: true,
      },
      width: 500,
      height: 550,
    },
    tray,
    dir: app.getAppPath(),
    showOnAllWorkspaces: true,
    preloadWindow: true,
    showDockIcon: false,
    icon: image,
  });

  menubar.on("ready", () => {
    const { window } = menubar;

    window.addListener("resize", async () => {
      // 获取 Tray 的位置
      const { x: trayX, width: trayWidth } = tray.getBounds()
      const { x: windowX, width: windowWidth } = window.getBounds()
      const triangleLeft = (trayX + trayWidth / 2) - windowX
      window.webContents.executeJavaScript(`
              // 不能使用变量承接会报错
              document.getElementsByClassName('triangle')[0].style.left = ${triangleLeft}+'px'
          `)
    })
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
      menubar.tray.popUpContextMenu(Menu.buildFromTemplate(contextMenuTemplate));
    });

    // 左键事件 组合点击 ctrl + 左键 或者 command + 左键 弹出菜单
    tray.on("click", (e) => {
      const isCtrlOrMetaKey = e.ctrlKey || e.metaKey
      isCtrlOrMetaKey && menubar.tray.popUpContextMenu(Menu.buildFromTemplate(contextMenuTemplate))

    });

    const menu = new Menu();

    // 添加快捷键 option + x
    globalShortcut.register("OptionOrAlt+x", () => {
      const menubarVisible = window.isVisible()
      if (menubarVisible) {
        menubar.hideWindow();
      } else {
        menubar.showWindow();
        if (process.platform == "darwin") {
          menubar.app.show();
        }
        menubar.app.focus();
      }
    });

    Menu.setApplicationMenu(menu);

    // open devtools
    window.webContents.openDevTools();
  });

  app.on("web-contents-created", (_event, contents) => {
    if (contents.getType() == "webview") {
      // 在 webview 中使用外部浏览器打开链接
      contents.on("zoom-changed", (e, url) => {
        e.preventDefault();
        shell.openExternal(url);
      });
      // 在 webview 中设置上下文菜单
      // contextMenu({
      //     window: contents,
      // });

      // 手动注册快捷键
      contents.on("before-input-event", (_event, input) => {
        const { control, meta, key } = input;
        if (!control && !meta) return;
        switch (key) {
          case "c":
            contents.copy();
            break;
          case "v":
            contents.paste();
            break;
          case "a":
            contents.selectAll();
            break;
          case "z":
            contents.undo();
            break;
          case "y":
            contents.redo();
            break;
          case "q":
            app.quit();
            break;
          case "r":
            contents.reload();
            break;
        }
      });
    }
  });
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit()
  }
})