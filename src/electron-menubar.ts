import { BrowserWindow, Tray, app, Rectangle, screen as electronScreen, BrowserWindowConstructorOptions, LoadURLOptions } from 'electron';
import Positioner from 'electron-positioner';
import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import * as url from 'url';
/**
 * Options for creating a menubar application
 */
export interface ElectronMenubarOptions {
	/**
	 * 监听 `app.on('activate')` 以在应用程序激活时打开菜单栏。
	 * @default `true`
	 */
	activateWithApp?: boolean;
	/**
	 * An Electron BrowserWindow instance, or an options object to be passed into
	 * the BrowserWindow constructor.
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
	 * The app source directory.
	 */
	dir: string;
	/**
	 * The png icon to use for the menubar. A good size to start with is 20x20.
	 * To support retina, supply a 2x sized image (e.g. 40x40) with @2x added to
	 * the end of the name, so icon.png and icon@2x.png and Electron will
	 * automatically use your @2x version on retina screens.
	 */
	icon?: string | Electron.NativeImage;
	/**
	 * The URL to load the menubar's browserWindow with. The url can be a remote
	 * address (e.g. `http://`) or a path to a local HTML file using the
	 * `file://` protocol. If false, then menubar won't call `loadURL` on
	 * start.
	 * @default `file:// + options.dir + index.html`
	 * @see https://electronjs.org/docs/api/browser-browserWindow#winloadurlurl-options
	 */
	index: string | false;
	/**
	 * The options passed when loading the index URL in the menubar's
	 * browserWindow. Everything browserWindow.loadURL supports is supported;
	 * this object is simply passed onto browserWindow.loadURL
	 * @default `{}`
	 * @see https://electronjs.org/docs/api/browser-browserWindow#winloadurlurl-options
	 */
	loadUrlOptions?: LoadURLOptions;
	/**
	 * Create BrowserWindow instance before it is used -- increasing resource
	 * usage, but making the click on the menubar load faster.
	 */
	preloadWindow?: boolean;
	/**
	 * Configure the visibility of the application dock icon, macOS only. Calls
	 * [`app.dock.hide`](https://electronjs.org/docs/api/app#appdockhide-macos).
	 */
	showDockIcon?: boolean;
	/**
	 * Makes the browserWindow available on all OS X workspaces. Calls
	 * [`setVisibleOnAllWorkspaces`](https://electronjs.org/docs/api/browser-browserWindow#winsetvisibleonallworkspacesvisible-options).
	 */
	showOnAllWorkspaces?: boolean;
	/**
	 * Show the browserWindow on 'right-click' event instead of regular 'click'.
	 */
	showOnRightClick?: boolean;
	/**
	 * Menubar tray icon tooltip text. Calls [`tray.setTooltip`](https://electronjs.org/docs/api/tray#traysettooltiptooltip).
	 */
	tooltip: string;
	/**
	 * An electron Tray instance. If provided, `options.icon` will be ignored.
	 */
	tray?: Tray;
	/**
	 * Sets the browserWindow position (x and y will still override this), check
	 * electron-positioner docs for valid values.
	 */
	windowPosition?: Positioner.Position;
}


// 任务栏位置
export type TaskbarLocation = 'top' | 'bottom' | 'left' | 'right';


export interface MenubarEvents {
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

export class ElectronMenubar extends EventEmitter<MenubarEvents> {
	private readonly _DEFAULT_WINDOW_HEIGHT: number = 400;
	private readonly _DEFAULT_WINDOW_WIDTH: number = 400;
	private readonly _isLinux: boolean = process.platform === 'linux';
	private _app: Electron.App;
	private _browserWindow?: BrowserWindow;
	private _blurTimeout: NodeJS.Timeout | null;
	private _isVisible: boolean; // 是否可见
	private _cachedBounds?: Electron.Rectangle; // 双击事件需要_cachedBounds
	private _options: ElectronMenubarOptions;
	private _positioner: Positioner | undefined;
	private _tray?: Tray;

	constructor(app: Electron.App, options?: Partial<ElectronMenubarOptions>) {
		super();
		this._app = app;
		this._blurTimeout = null
		this._options = this.cleanOptions(options);
		this._isVisible = false;
		if (app.isReady()) {
			/** 
			 * @link https://github.com/maxogden/menubar/pull/151 
			 */
			process.nextTick(() =>
				this.appReady().catch((error) => console.error('menubar:isReady ', error))
			);
		} else {
			app.on('ready', () => {
				this.appReady().catch((error) => console.error('menubar: ready', error));
			});
		}
	}

	/**
	 * @desc Electron App 实例
	 * @link https://electronjs.org/docs/api/app
	 * @returns {Electron.App}
	 */
	get app(): Electron.App {
		return this._app;
	}

	/**
	 * @desc electron-positioner 实例
	 * @link https://github.com/jenslind/electron-positioner
	 * @returns {Positioner}
	 */
	get positioner(): Positioner {
		if (!this._positioner) {
			throw new Error(
				'Please access `this.positioner` after the `after-create-browserWindow` event has fired.'
			);
		}

		return this._positioner;
	}

	/**
	 * @desc Electron Tray 实例
	 * @link https://electronjs.org/docs/api/tray
	 * @returns {Tray}
	 */
	get tray(): Tray {
		if (!this._tray) {
			throw new Error(
				'Please access `this.tray` after the `ready` event has fired.'
			);
		}

		return this._tray;
	}

	/**
	 * @desc Electron BrowserWindow 实例 
	 * @link https://electronjs.org/docs/api/browser-browserWindow
	 * @returns {BrowserWindow | undefined}
	 */
	get browserWindow(): BrowserWindow | undefined {
		return this._browserWindow;
	}

	/**
	 * @desc 订正箭头位置
	 */
	private correctArrowPosition() {
		// 获取 Tray 的位置
		const { x: trayX, width: trayWidth } = this.tray.getBounds()
		const { x: windowX } = this.browserWindow.getBounds()
		const triangleLeft = (trayX + trayWidth / 2) - windowX
		// 不能使用变量承接会报错
		this.browserWindow.webContents.executeJavaScript(`
			document.getElementsByClassName('triangle')[0].style.left = ${triangleLeft}+'px'
		`)
	}

	/**
	 * @desc 获取配置项
	 * @see ElectronMenubarOptions
	 * @param key { K extends keyof ElectronMenubarOptions }
	 * @returns { ElectronMenubarOptions[keyof ElectronMenubarOptions]}
	 */
	getOption<K extends keyof ElectronMenubarOptions>(key: K): ElectronMenubarOptions[K] {
		return this._options[key];
	}

	/**
	 * @desc 修改配置项
	 * @see ElectronMenubarOptions
	 * @param key {K extends keyof ElectronMenubarOptions}
	 * @param value {ElectronMenubarOptions[K]}
	 * @return {void}
	 */
	setOption<K extends keyof ElectronMenubarOptions>(key: K, value: ElectronMenubarOptions[K]): void {
		this._options[key] = value;
	}

	/**
	 * @desc 隐藏菜单栏窗口
	 * @return {void}
	 */
	hideWindow(): void {
		if (!this._browserWindow || !this._isVisible) return;
		this.emit('hide', this);
		this._browserWindow.hide();
		this.emit('after-hide', this);
		this._isVisible = false;
		if (this._blurTimeout) {
			clearTimeout(this._blurTimeout);
			this._blurTimeout = null;
		}
	}

	/**
	 * @desc 显示菜单栏窗口
	 * @param trayPosition {Electron.Rectangle}
	 * @returns {Promise<void>}
	 */
	async showWindow(trayPosition?: Electron.Rectangle): Promise<void> {
		if (!this.tray) {
			throw new Error('Tray should have been instantiated by now');
		}

		if (!this._browserWindow) {
			await this.createWindow();
		}

		if (!this._browserWindow) {
			throw new Error('Window has been initialized just above. qed.');
		}

		/** Windows任务栏：每次显示前同步窗口位置 */
		/** @link https://github.com/maxogden/menubar/issues/232 */
		if (['win32', 'linux'].includes(process.platform)) {
			// 当任务栏位置可用时填写this._options.windowPosition
			this._options.windowPosition = this.getWindowPosition(this.tray);
		}

		this.emit('show', this);

		if (trayPosition && trayPosition.x !== 0) {
			// Cache the bounds
			this._cachedBounds = trayPosition;
		} else if (this._cachedBounds) {
			// Cached value will be used if showWindow is called without bounds data
			trayPosition = this._cachedBounds;
		} else if (this.tray.getBounds) {
			// Get the current tray bounds
			trayPosition = this.tray.getBounds();
		}

		// Default the browserWindow to the right if `trayPosition` bounds are undefined or null.
		let windowPosition = this._options.windowPosition;
		if (
			(trayPosition === undefined || trayPosition.x === 0) &&
			this._options.windowPosition &&
			this._options.windowPosition.startsWith('tray')
		) {
			windowPosition = process.platform === 'win32' ? 'bottomRight' : 'topRight';
		}

		const position = this.positioner.calculate(
			windowPosition,
			trayPosition
		)

		// 不使用“||”，因为 x 和 y 可以为零。
		const x = Math.round(this._options.browserWindow.x !== undefined
			? this._options.browserWindow.x
			: position.x);
		const y = Math.round(this._options.browserWindow.y !== undefined
			? this._options.browserWindow.y
			: position.y);

		/** 
		 * @desc setPosition 方法只能使用整数 
		 * @link https://github.com/maxogden/menubar/issues/233 
		 */
		this._browserWindow.setPosition(x, y);

		this._browserWindow.show();

		// 调整箭头位置
		this.correctArrowPosition()

		this._isVisible = true;

		this.emit('after-show', this);

		return;
	}

	/**
	 * @desc 菜单栏应用程序准备就绪
	 * @return {Promise<void>}
	 */
	private async appReady(): Promise<void> {
		if (this.app.dock && !this._options.showDockIcon) {
			this.app.dock.hide();
		}

		if (this._options.activateWithApp) {
			this.app.on('activate', (_event, hasVisibleWindows) => {
				if (!hasVisibleWindows) {
					this.showWindow().catch(console.error);
				}
			});
		}

		// 兜底的图标
		let trayImage = this._options.icon || path.join(this._options.dir, 'IconTemplate.png');
		// fs.existsSync(trayImage) 用于判断是否是一个文件
		if (typeof trayImage === 'string' && !fs.existsSync(trayImage)) {
			// 如果用户写了icon地址 但是确实个错误的文件 就走默认图标
			trayImage = path.join(__dirname, '..', 'assets', 'IconTemplate.png');
		}

		// 默认点击事件
		const defaultClickEvent = this._options.showOnRightClick ? 'right-click' : 'click';

		// 初始化托盘
		this._tray = this._options.tray || new Tray(trayImage);

		// Type guards for TS not to complain
		if (!this.tray) {
			throw new Error('Tray has been initialized above');
		}

		// 给托盘绑定点击事件
		this.tray.on(defaultClickEvent as Parameters<Tray['on']>[0], this.clicked.bind(this));

		// 给托盘绑定双击事件
		this.tray.on('double-click', this.clicked.bind(this));

		// 设置托盘提示
		this.tray.setToolTip(this._options.tooltip);

		if (!this._options.windowPosition) {
			// 当任务栏位置可用时填写this._options.windowPosition
			this._options.windowPosition = this.getWindowPosition(this.tray);
		}

		if (this._options.preloadWindow) {
			await this.createWindow();
		}

		// 监听窗口大小变化 调整箭头的位置
		this.browserWindow.addListener("resize", () => {
			this.correctArrowPosition()
		})

		this.emit('ready', this);
	}

	/**
	 * @desc 点击菜单栏图标
	 * @param e {Electron.KeyboardEvent}
	 * @param bounds {Electron.Rectangle}
	 * @return {Promise<void>}
	 */
	private async clicked(event?: Electron.KeyboardEvent, bounds?: Electron.Rectangle): Promise<void> {

		if (event && (event.shiftKey || event.ctrlKey || event.metaKey)) {
			return this.hideWindow();
		}

		// if blur was invoked clear timeout
		if (this._blurTimeout) {
			clearInterval(this._blurTimeout);
		}

		if (this._browserWindow && this._isVisible) {
			this.hideWindow();
			return
		}

		this._cachedBounds = bounds || this._cachedBounds;

		await this.showWindow(this._cachedBounds);
	}

	/**
	 * @desc 初始化配置项
	 * @param opts {Partial<ElectronMenubarOptions>}
	 * @returns {ElectronMenubarOptions}
	 */
	private cleanOptions(opts?: Partial<ElectronMenubarOptions>): ElectronMenubarOptions {
		const options: Partial<ElectronMenubarOptions> = { ...opts };

		if (options.activateWithApp === undefined) {
			options.activateWithApp = true;
		}
		if (!options.dir) {
			options.dir = app.getAppPath();
		}
		if (!path.isAbsolute(options.dir)) {
			options.dir = path.resolve(options.dir);
		}

		if (options.index === undefined) {
			options.index = url.format({
				pathname: path.join(options.dir, 'index.html'),
				protocol: 'file:',
				slashes: true,
			});
		}

		options.loadUrlOptions = options.loadUrlOptions || {};

		options.tooltip = options.tooltip || '';

		// `icon`, `preloadWindow`, `showDockIcon`, `showOnAllWorkspaces`,
		// `showOnRightClick` don't need any special treatment

		// Now we take care of `browserWindow`
		if (!options.browserWindow) {
			options.browserWindow = {};
		}

		// Set width/height on options to be usable before the browserWindow is created
		options.browserWindow.width =
			// Note: not using `options.browserWindow.width || _DEFAULT_WINDOW_WIDTH` so
			// that users can put a 0 width
			options.browserWindow.width !== undefined
				? options.browserWindow.width
				: this._DEFAULT_WINDOW_WIDTH;
		options.browserWindow.height =
			options.browserWindow.height !== undefined
				? options.browserWindow.height
				: this._DEFAULT_WINDOW_HEIGHT;

		return options as ElectronMenubarOptions;
	}

	private trayToScreenRects(tray: Tray): [Rectangle, Rectangle] {
		// There may be more than one screen, so we need to figure out on which screen our tray icon lives.
		const { workArea, bounds: screenBounds } = electronScreen.getDisplayMatching(tray.getBounds());
		workArea.x -= screenBounds.x;
		workArea.y -= screenBounds.y;
		return [screenBounds, workArea];
	};

	private taskbarLocation(tray: Tray): TaskbarLocation {
		const [screenBounds, workArea] = this.trayToScreenRects(tray);

		// TASKBAR LEFT
		if (workArea.x > 0) {
			// Most likely Ubuntu hence assuming the browserWindow should be on top
			if (this._isLinux && workArea.y > 0) return 'top';
			// The workspace starts more on the right
			return 'left';
		}

		// TASKBAR TOP
		if (workArea.y > 0) {
			return 'top';
		}

		// TASKBAR RIGHT
		// Here both workArea.y and workArea.x are 0 so we can no longer leverage them.
		// We can use the workarea and display width though.
		// Determine taskbar location
		if (workArea.width < screenBounds.width) {
			// The taskbar is either on the left or right, but since the LEFT case was handled above,
			// we can be sure we're dealing with a right taskbar
			return 'right';
		}

		// TASKBAR BOTTOM
		// Since all the other cases were handled, we can be sure we're dealing with a bottom taskbar
		return 'bottom';
	}

	/**
	 * @desc 获取窗口位置
	 * @param tray {Tray}
	 * @returns {Positioner.Position}
	 */
	private getWindowPosition(tray: Tray): Positioner.Position {
		switch (process.platform) {
			// macOS
			// Supports top taskbars
			case 'darwin':
				return 'trayCenter';
			// Linux
			// Windows
			// Supports top/bottom/left/right taskbar
			case 'linux':
			case 'win32': {
				const traySide = this.taskbarLocation(tray);
				// Assign position for menubar
				if (traySide === 'top') {
					return this._isLinux ? 'topRight' : 'trayCenter';
				}
				if (traySide === 'bottom') {
					return this._isLinux ? 'bottomRight' : 'trayBottomCenter';
				}
				if (traySide === 'left') {
					return 'bottomLeft';
				}
				if (traySide === 'right') {
					return 'bottomRight';
				}
			}
		}

		// When we really don't know, we just show the menubar on the top-right
		return 'topRight';
	}


	/**
	 * @desc 创建窗口
	 * @return {Promise<void>}
	 */
	private async createWindow(): Promise<void> {
		this.emit('create-browserWindow', this);

		// 为菜单栏的 browserWindow 添加一些默认行为，使其看起来像一个菜单栏
		const defaultBrowserWindow = {
			show: false, // 一开始不要展示窗口
			frame: false, // Remove browserWindow frame
		};

		this._browserWindow = new BrowserWindow({
			...defaultBrowserWindow,
			...this._options.browserWindow,
		});

		this._positioner = new Positioner(this._browserWindow);

		// 给窗口添加失去焦点事件
		this._browserWindow.on('blur', () => {
			if (!this._browserWindow) return;
			// 窗口是否始终位于其他窗口之上。
			const isOnTop = this._browserWindow.isAlwaysOnTop()
			if (isOnTop) {
				this.emit('focus-lost', this)
			} else {
				this._blurTimeout = setTimeout(() => {
					// this.hideWindow()
				}, 100)
			};
		});

		if (this._options.showOnAllWorkspaces !== false) {
			// https://github.com/electron/electron/issues/37832#issuecomment-1497882944
			this._browserWindow.setVisibleOnAllWorkspaces(true, {
				skipTransformProcessType: true, // Avoid damaging the original visible state of app.dock
			});
		}

		this._browserWindow.on('close', this.windowClear.bind(this));

		this.emit('before-load', this);

		// 如果用户明确将 options.index 设置为 false，我们不会 loadURL
		// https://github.com/maxogden/menubar/issues/255
		if (this._options.index !== false) {
			// await this._browserWindow.loadURL(
			// 	this._options.index,
			// 	this._options.loadUrlOptions
			// );
			if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
				await this._browserWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL, this._options.loadUrlOptions);
			} else {
				await this._browserWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
			}
		}

		this.emit('after-create-browserWindow', this);
	}

	/**
	 * @desc 清除窗口
	 * @return {void}
	 */
	private windowClear(): void {
		this._browserWindow = undefined;
		this.emit('after-close', this);
	}
}
