import { BrowserWindow, Tray, app, Rectangle, screen as electronScreen } from 'electron';
import Positioner from 'electron-positioner';
import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import * as url from 'url';

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
	public getOption<K extends keyof ElectronMenubarOptions>(key: K): ElectronMenubarOptions[K] {
		return this._options[key];
	}

	/**
	 * @desc 修改配置项
	 * @see ElectronMenubarOptions
	 * @param key {K extends keyof ElectronMenubarOptions}
	 * @param value {ElectronMenubarOptions[K]}
	 * @return {void}
	 */
	public setOption<K extends keyof ElectronMenubarOptions>(key: K, value: ElectronMenubarOptions[K]): void {
		this._options[key] = value;
	}

	/**
	 * @desc 隐藏菜单栏窗口
	 * @return {void}
	 */
	public hideWindow(): void {
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
	public async showWindow(trayPosition?: Electron.Rectangle): Promise<void> {

		if (!this.tray) {
			throw new Error('Tray should have been instantiated by now');
		}

		if (!this._browserWindow) {
			await this.createWindow();
		}

		if (!this._browserWindow) {
			throw new Error('Window has been initialized just above. qed.');
		}

		/** 
		 * @desc Windows任务栏：每次显示前同步窗口位置
		 * @link https://github.com/maxogden/menubar/issues/232
		 */
		if (['win32', 'linux'].includes(process.platform)) {
			this._options.windowPosition = this.getWindowPosition(this.tray);
		}

		this.emit('show', this);

		if (trayPosition && trayPosition.x !== 0) {
			// 将位置缓存起来
			this._cachedBounds = trayPosition;
		} else if (this._cachedBounds) {
			// 如果在没有边界数据的情况下调用 showWindow，将使用缓存的值
			trayPosition = this._cachedBounds;
		} else if (this.tray.getBounds) {
			// 获取当前图标边界
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

		const calculateResult = this.positioner.calculate(
			windowPosition,
			trayPosition
		)

		// 不使用“||”，因为 x 和 y 可以为零。
		const x = Math.round(this._options.browserWindow.x !== undefined
			? this._options.browserWindow.x
			: calculateResult.x);

		const y = Math.round(this._options.browserWindow.y !== undefined
			? this._options.browserWindow.y
			: calculateResult.y);

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

		// `icon`, `preloadWindow`, `showDockIcon`, `showOnAllWorkspaces`,`showOnRightClick` 不需要特殊处理

		if (!options.browserWindow) {
			options.browserWindow = {};
		}

		options.browserWindow.width =
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
			// 支持顶部任务栏
			case 'darwin':
				return 'trayCenter';
			// Linux
			// Windows
			// Supports top/bottom/left/right taskbar
			case 'linux':
			case 'win32':
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
			default:
				return 'topRight';
		}
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
					this.hideWindow()
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

		if (this._options.index !== false) {
			await this._browserWindow.loadURL(this._options.index, this._options.loadUrlOptions);
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
