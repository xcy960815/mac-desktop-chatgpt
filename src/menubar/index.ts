import { BrowserWindow, Tray } from 'electron';
import Positioner from 'electron-positioner';
import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import { Options } from './types';
import { cleanOptions } from './util/cleanOptions';
import { getWindowPosition } from './util/getWindowPosition';

interface MenubarEvents {
	ready: [ElectronMenubar];
	hide: [ElectronMenubar];
	show: [ElectronMenubar];
	'create-window': [ElectronMenubar];
	'after-create-window': [ElectronMenubar];
	'after-close': [ElectronMenubar];
	'after-hide': [ElectronMenubar];
	'after-show': [ElectronMenubar],
	"focus-lost": [ElectronMenubar],
	"before-load": [ElectronMenubar]
}
/**
 * The main Menubar class.
 *
 * @noInheritDoc
 */
export class ElectronMenubar extends EventEmitter<MenubarEvents> {
	private _app: Electron.App;
	private _browserWindow?: BrowserWindow;
	private _blurTimeout: NodeJS.Timeout | null = null; // track blur events with timeout
	private _isVisible: boolean; // track visibility
	private _cachedBounds?: Electron.Rectangle; // _cachedBounds are needed for double-clicked event
	private _options: Options;
	private _positioner: Positioner | undefined;
	private _tray?: Tray;
	// private _eventEmitter: EventEmitter
	constructor(app: Electron.App, options?: Partial<Options>) {
		super();
		this._app = app;
		this._options = cleanOptions(options);
		this._isVisible = false;
		if (app.isReady()) {
			// See https://github.com/maxogden/menubar/pull/151
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
	 * The Electron [App](https://electronjs.org/docs/api/app)
	 * instance.
	 */
	get app(): Electron.App {
		return this._app;
	}

	/**
	 * The [electron-positioner](https://github.com/jenslind/electron-positioner)
	 * instance.
	 */
	get positioner(): Positioner {
		if (!this._positioner) {
			throw new Error(
				'Please access `this.positioner` after the `after-create-window` event has fired.'
			);
		}

		return this._positioner;
	}

	/**
	 * The Electron [Tray](https://electronjs.org/docs/api/tray) instance.
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
	 * The Electron [BrowserWindow](https://electronjs.org/docs/api/browser-window)
	 * instance, if it's present.
	 */
	get window(): BrowserWindow | undefined {
		return this._browserWindow;
	}

	/**
	 * @desc 订正箭头位置
	 */
	correctArrowPosition() {
		// 获取 Tray 的位置
		const { x: trayX, width: trayWidth } = this.tray.getBounds()
		const { x: windowX, width: windowWidth } = this.window.getBounds()
		const triangleLeft = (trayX + trayWidth / 2) - windowX
		this.window.webContents.executeJavaScript(`
			// 不能使用变量承接会报错
			document.getElementsByClassName('triangle')[0].style.left = ${triangleLeft}+'px'
		`)
	}


	/**
	 * Retrieve a menubar option.
	 *
	 * @param key - The option key to retrieve, see {@link Options}.
	 */
	getOption<K extends keyof Options>(key: K): Options[K] {
		return this._options[key];
	}

	/**
	 * @desc 创建菜单栏后更改选项。
	 * @param key {K extends keyof Options}
	 * @param value {Options[K]}
	 * @return {void}
	 */
	setOption<K extends keyof Options>(key: K, value: Options[K]): void {
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
	 * @param trayPos - The bounds to show the window in.
	 */
	async showWindow(trayPos?: Electron.Rectangle): Promise<void> {
		if (!this.tray) {
			throw new Error('Tray should have been instantiated by now');
		}

		if (!this._browserWindow) {
			await this.createWindow();
		}

		// Use guard for TypeScript, to avoid ! everywhere
		if (!this._browserWindow) {
			throw new Error('Window has been initialized just above. qed.');
		}

		// 'Windows' taskbar: sync windows position each time before showing
		// https://github.com/maxogden/menubar/issues/232
		if (['win32', 'linux'].includes(process.platform)) {
			// Fill in this._options.windowPosition when taskbar position is available
			this._options.windowPosition = getWindowPosition(this.tray);
		}

		this.emit('show', this);

		if (trayPos && trayPos.x !== 0) {
			// Cache the bounds
			this._cachedBounds = trayPos;
		} else if (this._cachedBounds) {
			// Cached value will be used if showWindow is called without bounds data
			trayPos = this._cachedBounds;
		} else if (this.tray.getBounds) {
			// Get the current tray bounds
			trayPos = this.tray.getBounds();
		}

		// Default the window to the right if `trayPos` bounds are undefined or null.
		let windowPosition = this._options.windowPosition;
		if (
			(trayPos === undefined || trayPos.x === 0) &&
			this._options.windowPosition &&
			this._options.windowPosition.startsWith('tray')
		) {
			windowPosition = process.platform === 'win32' ? 'bottomRight' : 'topRight';
		}

		const position = this.positioner.calculate(
			windowPosition,
			trayPos
		)

		// Not using `||` because x and y can be zero.
		const x = this._options.browserWindow.x !== undefined
			? this._options.browserWindow.x
			: position.x;
		const y = this._options.browserWindow.y !== undefined
			? this._options.browserWindow.y
			: position.y;

		// `.setPosition` crashed on non-integers
		// https://github.com/maxogden/menubar/issues/233
		this._browserWindow.setPosition(Math.round(x), Math.round(y));

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
			trayImage = path.join(__dirname, '..', 'assets', 'IconTemplate.png'); // Default cat icon
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
			this._options.windowPosition = getWindowPosition(this.tray);
		}

		if (this._options.preloadWindow) {
			await this.createWindow();
		}

		// 监听窗口大小变化 调整箭头的位置
		this.window.addListener("resize", () => {
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
	 * @desc 创建窗口
	 * @return {Promise<void>}
	 */
	private async createWindow(): Promise<void> {
		this.emit('create-window', this);

		// 我们为菜单栏的 browserWindow 添加一些默认行为，使其看起来像一个菜单栏
		const defaultBrowserWindow = {
			show: false, // Don't show it at first
			frame: false, // Remove window frame
		};

		this._browserWindow = new BrowserWindow({
			...defaultBrowserWindow,
			...this._options.browserWindow,
		});

		this._positioner = new Positioner(this._browserWindow);

		// 给窗口添加失去焦点事件
		this._browserWindow.on('blur', () => {

			if (!this._browserWindow) return;

			// hack to close if icon clicked when open
			this._browserWindow.isAlwaysOnTop() ? this.emit('focus-lost', this) : (this._blurTimeout = setTimeout(() => this.hideWindow, 100));
		});

		if (this._options.showOnAllWorkspaces !== false) {
			// https://github.com/electron/electron/issues/37832#issuecomment-1497882944
			this._browserWindow.setVisibleOnAllWorkspaces(true, {
				skipTransformProcessType: true, // Avoid damaging the original visible state of app.dock
			});
		}

		this._browserWindow.on('close', this.windowClear.bind(this));

		this.emit('before-load', this);

		// If the user explicity set options.index to false, we don't loadURL
		// https://github.com/maxogden/menubar/issues/255
		if (this._options.index !== false) {
			await this._browserWindow.loadURL(
				this._options.index,
				this._options.loadUrlOptions
			);
		}

		this.emit('after-create-window', this);
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

// interface TestEventMap {
// 	ready: [(isReady?: boolean) => void];
// }

// class TestEventEmitter extends EventEmitter<TestEventMap> {
// 	constructor() {
// 		super();
// 	}
// }

// const testEventEmitter = new TestEventEmitter();

// testEventEmitter.on('ready', (isReady) => {
// 	console.log('ready');
// });
