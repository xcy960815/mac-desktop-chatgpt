

type BrowserWindowConstructorOptions = import("electron").BrowserWindowConstructorOptions

type LoadURLOptions = import("electron").LoadURLOptions

type Position = import("electron-positioner").Position



/**
 * 用于创建菜单栏应用程序的选项
 */
declare interface ElectronMenubarOptions {
    /**
     * 监听 `app.on('activate')` 以在应用程序激活时打开菜单栏。
     * @default `true`
     */
    activateWithApp?: boolean;
    /**
     * 一个 Electron BrowserWindow 实例，或者要传入的选项对象 浏览器窗口构造函数
     * @example
     * ```typescript
     * const options = { height: 640, width: 480 };
     *
     * const mb = new Menubar({
     *   browserWindow: options
     * });
     * ```
     */
    browserWindow: BrowserWindowConstructorOptions;
    /**
     * 应用程序根目录。
     */
    dir: string;
    /**
     * 用于菜单栏的 png 图标。合适的起始尺寸是 20x20。
     * 为了支持视网膜，请提供 2x 大小的图像（例如 40x40）并添加 @2x
     * 名称结尾，因此 icon.png 和 icon@2x.png 和 Electron 都会
     * 在视网膜屏幕上自动使用您的@2x 版本。
     */
    icon?: string | Electron.NativeImage;
    /**
     * 用于加载菜单栏的 browserWindow 的 URL。 url 可以是远程的
     * 地址（例如 `http://`）或使用以下命令的本地 HTML 文件的路径
     * `file://` 协议。如果为 false，则菜单栏不会调用“loadURL”
     * @default `file:// options.dir index.html`
     * @参见https://electronjs.org/docs/api/browser-browserWindow#winloadurlurl-options
     */
    index: string | false;
    /**
     * 在菜单栏加载索引URL时传递的选项
     * 浏览器窗口。 browserWindow.loadURL 支持的所有内容均受支持；
     * 这个对象只是简单地传递到 browserWindow.loadURL
     * @默认`{}`
     * @参见https://electronjs.org/docs/api/browser-browserWindow#winloadurlurl-options
     */
    loadUrlOptions?: LoadURLOptions;
    /**
     * 在使用前创建BrowserWindow实例——增加资源
     * 用法，但使菜单栏上的单击加载速度更快。
     */
    preloadWindow?: boolean;
    /**
     * 配置应用程序停靠栏图标的可见性（仅限 macOS）
     * [`app.dock.hide`](https://electronjs.org/docs/api/app#appdockhide-macos).
     */
    showDockIcon?: boolean;
    /**
      * 使 browserWindow 在所有 OSX 工作区上可用。通话
      * [`setVisibleOnAllWorkspaces`](https:// Electronjs.org/docs/api/browser-browserWindow#winsetvisibleonallworkspacesvisible-options)。
      */
    showOnAllWorkspaces?: boolean;
    /**
     * 在“右键单击”事件而不是常规“单击”事件上显示浏览器窗口
     */
    showOnRightClick?: boolean;
    /**
     * 菜单栏托盘图标工具提示文本。调用 [`tray.setTooltip`](https://electronjs.org/docs/api/tray#traysettooltiptooltip)。
     */
    tooltip: string;
    /**
     * 菜单栏实例。如果提供，“options.icon”将被忽略。
     */
    tray?: Tray;
    /**
     * 设置浏览器窗口位置（x 和 y 仍将覆盖它），检查
     * 电子定位器文档的有效值。
     */
    windowPosition?: Position
}


/**
 * @desc 任务栏位置
 */
declare type TaskbarLocation = 'top' | 'bottom' | 'left' | 'right';

/**
 * @desc ElectronMenubar 实例
 */
type ElectronMenubar = import("../src/electron-menubar").ElectronMenubar

/**
 * @desc ElectronMenubar 时间类型以及回调函数
 */
declare interface MenubarEvents {
    ready: [ElectronMenubar];
    hide: [ElectronMenubar];
    show: [ElectronMenubar];
    'create-browserWindow': [ElectronMenubar];
    'after-create-browserWindow': [ElectronMenubar];
    'after-close': [ElectronMenubar];
    'after-hide': [ElectronMenubar];
    'after-show': [ElectronMenubar],
    "focus-lost": [ElectronMenubar],
    "before-load": [ElectronMenubar]
}
