import {
  BrowserWindow,
  Tray,
  app,
  Rectangle,
  screen as electronScreen,
  globalShortcut
} from 'electron'
import Positioner from 'electron-positioner'
import { EventEmitter } from 'events'
import * as fs from 'fs'
import * as path from 'path'
import { WindowBehavior } from './constants'

/**
 * @description 负责控制托盘图标、BrowserWindow 以及定位逻辑的菜单栏管理器。
 * @fires ElectronMenubar#ready
 * @fires ElectronMenubar#show
 * @fires ElectronMenubar#hide
 */
export class ElectronMenubar extends EventEmitter<MenubarEvents> {
  /**
   * @description 默认窗口高度
   */
  private readonly _DEFAULT_WINDOW_HEIGHT: number = 400
  /**
   * @description 默认窗口宽度
   */
  private readonly _DEFAULT_WINDOW_WIDTH: number = 400
  /**
   * @description 是否为 Linux 平台
   */
  private readonly _isLinux: boolean =
    process.platform === 'linux'
  /**
   * @description 是否为 Windows 平台
   */
  private readonly _isWindows: boolean =
    process.platform === 'win32'
  /**
   * @description Electron App 实例
   */
  private _app: Electron.App
  /**
   * @description Electron BrowserWindow 实例
   */
  private _browserWindow?: BrowserWindow
  /**
   * @description 模糊定时器
   */
  private _blurTimeout: NodeJS.Timeout | null
  /**
   * @description 是否可见
   */
  private _isVisible: boolean
  /**
   * @description 双击事件需要_cachedBounds
   */
  private _cachedBounds?: Electron.Rectangle
  /**
   * @description 配置项
   */
  private _options: ElectronMenubarOptions
  private _positioner: Positioner | undefined
  /**
   * @description Electron Tray 实例
   */
  private _tray?: Tray
  /**
   * @description 托盘位置检查定时器
   */
  // 在类中新增私有变量
  private _trayPositionChecker: NodeJS.Timeout | null = null
  /**
   * @description 上次托盘边界
   */
  private _lastTrayBounds: Electron.Rectangle | null = null
  /**
   * @description 临时禁用自动隐藏标志
   */
  private _autoHideDisabled = false
  /**
   * @description 锁定窗口标志
   */
  private _lockWindow = false
  /**
   * @description 窗口行为模式
   */
  private _windowBehavior: WindowBehavior =
    WindowBehavior.AutoHide

  /**
   * @description 注册与应用生命周期相关的清理任务
   */
  private registerAppShutdownHandlers() {
    this._app.once('before-quit', () => {
      this.stopTrayPositionWatcher()
      this.unregisterEscapeShortcut()
    })
  }

  /**
   * @description 创建一个菜单栏实例，同时在 app ready 后初始化托盘与窗口。
   * @param app Electron App 实例
   * @param options 自定义配置
   */
  constructor(
    app: Electron.App,
    options?: Partial<ElectronMenubarOptions>
  ) {
    super()
    this._app = app
    this._blurTimeout = null
    this._options = this.cleanOptions(options)
    this._isVisible = false
    this.registerAppShutdownHandlers()
    if (app.isReady()) {
      /**
       * @link https://github.com/maxogden/menubar/pull/151
       */
      process.nextTick(() => {
        this.appReady().catch(this.handleIgnoredRejection)
      })
    } else {
      app.on('ready', () => {
        this.appReady().catch(this.handleIgnoredRejection)
      })
    }
  }

  /**
   * 初始化配置项
   * @param {Partial<ElectronMenubarOptions>} [opts] - 部分配置选项（可选）
   * @returns {ElectronMenubarOptions} 完整的配置选项对象
   */
  private cleanOptions(
    opts?: Partial<ElectronMenubarOptions>
  ): ElectronMenubarOptions {
    const options: Partial<ElectronMenubarOptions> = {
      ...opts
    }

    if (options.activateWithApp === undefined) {
      options.activateWithApp = true
    }

    if (!options.dir) {
      options.dir = app.getAppPath()
    }

    if (!path.isAbsolute(options.dir)) {
      options.dir = path.resolve(options.dir)
    }

    options.loadUrlOptions = options.loadUrlOptions || {}
    options.tooltip = options.tooltip || ''

    if (!options.browserWindow) {
      options.browserWindow = {}
    }

    options.browserWindow.width =
      options.browserWindow.width !== undefined
        ? options.browserWindow.width
        : this._DEFAULT_WINDOW_WIDTH

    options.browserWindow.height =
      options.browserWindow.height !== undefined
        ? options.browserWindow.height
        : this._DEFAULT_WINDOW_HEIGHT

    return options as ElectronMenubarOptions
  }

  /**
   * @description Electron App 实例
   * @link https://electronjs.org/docs/api/app
   * @returns {Electron.App}
   */
  get app(): Electron.App {
    return this._app
  }

  /**
   * @description electron-positioner 实例
   * @link https://github.com/jenslind/electron-positioner
   * @returns {Positioner}
   */
  get positioner(): Positioner {
    if (!this._positioner) {
      throw new Error(
        'Please access `this.positioner` after the `after-create-browserWindow` event has fired.'
      )
    }

    return this._positioner
  }

  /**
   * @description Electron Tray 实例
   * @link https://electronjs.org/docs/api/tray
   * @returns {Tray}
   */
  get tray(): Tray {
    if (!this._tray) {
      throw new Error(
        'Please access `this.tray` after the `ready` event has fired.'
      )
    }
    return this._tray
  }

  /**
   * @description Electron BrowserWindow 实例
   * @link https://electronjs.org/docs/api/browser-browserWindow
   * @returns {BrowserWindow | undefined}
   */
  get browserWindow(): BrowserWindow | undefined {
    return this._browserWindow
  }

  /**
   * @description 开始监听 Tray 位置变化
   */
  private startTrayPositionWatcher() {
    if (!this._tray || this._trayPositionChecker) return
    // 初始记录位置
    this._lastTrayBounds = this._tray.getBounds()
    // 每 500ms 检查一次位置变化
    this._trayPositionChecker = setInterval(() => {
      const currentBounds = this._tray.getBounds()
      if (
        !this._lastTrayBounds ||
        currentBounds.x !== this._lastTrayBounds.x ||
        currentBounds.y !== this._lastTrayBounds.y
      ) {
        this._lastTrayBounds = currentBounds
        this.emit('tray-position-changed', this) // 触发事件
        this.correctArrowPosition() // 修正箭头位置（如果窗口可见）
      }
    }, 500)
  }

  /**
   * @description 停止监听 Tray 位置变化
   */
  private stopTrayPositionWatcher() {
    if (this._trayPositionChecker) {
      clearInterval(this._trayPositionChecker)
      this._trayPositionChecker = null
    }
  }

  /**
   * @description 订正箭头位置
   * @return {void}
   */
  private correctArrowPosition() {
    if (
      this._isWindows ||
      !this._tray ||
      !this._browserWindow
    ) {
      return
    }
    // 获取 Tray 的位置
    const { x: trayX, width: trayWidth } =
      this._tray.getBounds()
    const { x: windowX } = this._browserWindow.getBounds()
    const rawTriangleLeft = trayX + trayWidth / 2 - windowX
    const triangleLeft = Math.max(0, rawTriangleLeft)
    this.sendArrowPositionUpdate(triangleLeft)
  }

  /**
   * @description 向渲染进程发送箭头偏移量
   * @param {number} triangleLeft
   */
  private sendArrowPositionUpdate(triangleLeft: number) {
    if (
      !this._browserWindow ||
      this._browserWindow.isDestroyed()
    ) {
      return
    }
    this._browserWindow.webContents.send(
      'update-arrow-position',
      triangleLeft
    )
  }

  /**
   * 依据托盘所在屏幕返回屏幕的全尺寸和可用工作区
   * @param {Tray} tray - 托盘实例
   * @returns {[Rectangle, Rectangle]} 返回包含屏幕边界和工作区边界的元组
   */
  private trayToScreenRects(
    tray: Tray
  ): [Rectangle, Rectangle] {
    const { workArea, bounds: screenBounds } =
      electronScreen.getDisplayMatching(tray.getBounds())
    workArea.x -= screenBounds.x
    workArea.y -= screenBounds.y
    return [screenBounds, workArea]
  }

  /**
   * 计算托盘所在任务栏的位置（顶部/底部/左右）
   * @param {Tray} tray - 托盘实例
   * @returns {TaskbarLocation} 任务栏方位字符串
   */
  private taskbarLocation(tray: Tray): TaskbarLocation {
    const [screenBounds, workArea] =
      this.trayToScreenRects(tray)
    if (workArea.x > 0) {
      if (this._isLinux && workArea.y > 0) return 'top'
      return 'left'
    }

    if (workArea.y > 0) {
      return 'top'
    }

    if (workArea.width < screenBounds.width) {
      return 'right'
    }
    return 'bottom'
  }

  /**
   * 获取窗口位置
   * @param {Tray} tray - 托盘实例
   * @returns {Positioner.Position} 窗口位置字符串
   */
  private getWindowPosition(
    tray: Tray
  ): Positioner.Position {
    switch (process.platform) {
      case 'darwin':
        return 'trayCenter'
      case 'linux':
      case 'win32': {
        const traySide = this.taskbarLocation(tray)
        if (traySide === 'top') {
          return this._isLinux ? 'topRight' : 'trayCenter'
        }
        if (traySide === 'bottom') {
          return this._isLinux
            ? 'bottomRight'
            : 'trayBottomCenter'
        }
        if (traySide === 'left') {
          return 'bottomLeft'
        }
        if (traySide === 'right') {
          return 'bottomRight'
        }
        break
      }
      default:
        return 'topRight'
    }
  }

  /**
   * 获取配置项
   * @param {K} key - 配置项的键名
   * @returns {ElectronMenubarOptions[K]} 配置项的值
   * @template K
   */
  public getOption<K extends keyof ElectronMenubarOptions>(
    key: K
  ): ElectronMenubarOptions[K] {
    return this._options[key]
  }

  /**
   * 修改配置项
   * @param {K} key - 配置项的键名
   * @param {ElectronMenubarOptions[K]} value - 配置项的新值
   * @returns {void}
   * @template K
   */
  public setOption<K extends keyof ElectronMenubarOptions>(
    key: K,
    value: ElectronMenubarOptions[K]
  ): void {
    this._options[key] = value
  }

  /**
   * 设置窗口行为（自动隐藏、锁定、置顶）
   * @param {WindowBehavior} behavior - 窗口行为模式
   * @returns {void}
   */
  public setWindowBehavior(behavior: WindowBehavior): void {
    this._windowBehavior = behavior
    this._lockWindow = behavior !== WindowBehavior.AutoHide
    if (!this._lockWindow) {
      this.enableAutoHide()
    }
    this.applyWindowBehaviorToWindow()
  }

  /**
   * 将当前窗口行为应用到 BrowserWindow
   */
  private applyWindowBehaviorToWindow(): void {
    if (
      !this._browserWindow ||
      this._browserWindow.isDestroyed()
    ) {
      return
    }
    const shouldAlwaysOnTop =
      this._windowBehavior === WindowBehavior.AlwaysOnTop
    if (shouldAlwaysOnTop) {
      this._browserWindow.setAlwaysOnTop(true, 'floating')
    } else {
      this._browserWindow.setAlwaysOnTop(false)
    }
  }

  /**
   * 当前窗口是否处于锁定状态
   * @returns {boolean} 如果窗口已锁定则返回 true，否则返回 false
   */
  public isWindowLocked(): boolean {
    return this._lockWindow
  }

  /**
   * 在锁定模式下，将窗口提升至最前但不设置置顶
   * @returns {Promise<void>}
   */
  public async bringWindowToFront(): Promise<void> {
    if (
      !this._browserWindow ||
      this._browserWindow.isDestroyed()
    ) {
      await this.showWindow().catch(
        this.handleIgnoredRejection
      )
      return
    }

    if (!this._browserWindow.isVisible()) {
      await this.showWindow().catch(
        this.handleIgnoredRejection
      )
      return
    }

    const movableWindow = this
      ._browserWindow as BrowserWindow & {
      moveTop?: () => void
    }
    if (typeof movableWindow.moveTop === 'function') {
      try {
        movableWindow.moveTop()
      } catch {
        // ignore moveTop errors
      }
    }

    this._browserWindow.show()
    this._browserWindow.focus()
    if (process.platform === 'darwin') {
      this._app.focus()
    }
  }

  /**
   * @description 临时禁用自动隐藏（用于显示对话框时）
   * @return {void}
   */
  public disableAutoHide(): void {
    this._autoHideDisabled = true
    // 清除可能存在的隐藏定时器
    if (this._blurTimeout) {
      clearTimeout(this._blurTimeout)
      this._blurTimeout = null
    }
  }

  /**
   * @description 恢复自动隐藏
   * @return {void}
   */
  public enableAutoHide(): void {
    this._autoHideDisabled = false
  }

  /**
   * @description 吞掉无需关心的 Promise rejection
   */
  private handleIgnoredRejection(_error?: unknown): void {
    // no-op：某些调用失败后会通过 UI 反馈给用户
  }

  /**
   * @description 注册 ESC 快捷键用于快速关闭窗口
   */
  private registerEscapeShortcut(): void {
    this.unregisterEscapeShortcut()
    globalShortcut.register('esc', () => {
      const menubarVisible =
        this._browserWindow?.isVisible()
      if (menubarVisible) {
        this.hideWindow()
      }
    })
  }

  /**
   * @description 注销 ESC 快捷键
   */
  private unregisterEscapeShortcut(): void {
    globalShortcut.unregister('esc')
  }

  /**
   * @description 隐藏菜单栏窗口
   * @return {void}
   */
  public hideWindow(): void {
    if (!this._browserWindow || !this._isVisible) return
    this.emit('hide', this)
    this._browserWindow.hide()
    this.emit('after-hide', this)
    this._isVisible = false
    if (this._blurTimeout) {
      clearTimeout(this._blurTimeout)
      this._blurTimeout = null
    }
  }

  /**
   * 显示菜单栏窗口
   * @param {Electron.Rectangle} [trayPosition] - 托盘位置信息（可选）
   * @returns {Promise<void>}
   */
  public async showWindow(
    trayPosition?: Electron.Rectangle
  ): Promise<void> {
    if (!this.tray) {
      throw new Error(
        'Tray should have been instantiated by now'
      )
    }

    if (!this._browserWindow) {
      await this.createWindow()
    }

    if (!this._browserWindow) {
      throw new Error(
        'Window has been initialized just above. qed.'
      )
    }

    /**
     * @description Windows任务栏：每次显示前同步窗口位置
     * @link https://github.com/maxogden/menubar/issues/232
     */
    if (['win32', 'linux'].includes(process.platform)) {
      this._options.windowPosition = this.getWindowPosition(
        this.tray
      )
    }

    this.emit('show', this)

    // Windows 平台：显示在屏幕中央
    if (this._isWindows) {
      this._browserWindow.center()
      this._browserWindow.restore()
      this._browserWindow.focus()
      this._browserWindow.show()
      this._isVisible = true
      this.emit('after-show', this)
      return
    }

    if (trayPosition && trayPosition.x !== 0) {
      // 将位置缓存起来
      this._cachedBounds = trayPosition
    } else if (this._cachedBounds) {
      // 如果在没有边界数据的情况下调用 showWindow，将使用缓存的值
      trayPosition = this._cachedBounds
    } else if (this.tray.getBounds) {
      // 获取当前图标边界
      trayPosition = this.tray.getBounds()
    }

    // Default the browserWindow to the right if `trayPosition` bounds are undefined or null.
    let windowPosition = this._options.windowPosition
    if (
      (trayPosition === undefined ||
        trayPosition.x === 0) &&
      this._options.windowPosition &&
      this._options.windowPosition.startsWith('tray')
    ) {
      windowPosition =
        process.platform !== 'darwin' &&
        process.platform !== 'linux'
          ? 'bottomRight'
          : 'topRight'
    }

    const calculateResult = this.positioner.calculate(
      windowPosition,
      trayPosition
    )

    // 不使用"||"，因为 x 和 y 可以为零。
    const x = Math.round(
      this._options.browserWindow.x !== undefined
        ? this._options.browserWindow.x
        : calculateResult.x
    )

    const y = Math.round(
      this._options.browserWindow.y !== undefined
        ? this._options.browserWindow.y
        : calculateResult.y
    )

    /**
     * @description setPosition 方法只能使用整数
     * @link https://github.com/maxogden/menubar/issues/233
     */
    this._browserWindow.setPosition(x, y)

    this._browserWindow.show()

    // 调整箭头位置
    this.correctArrowPosition()

    this._isVisible = true

    this.emit('after-show', this)

    return
  }

  /**
   * @description 菜单栏应用程序准备就绪
   * @return {Promise<void>}
   */
  private async appReady(): Promise<void> {
    if (this.app.dock && !this._options.showDockIcon) {
      this.app.dock.hide()
    }

    if (this._options.activateWithApp) {
      this.app.on(
        'activate',
        (_event, hasVisibleWindows) => {
          if (!hasVisibleWindows) {
            this.showWindow().catch(
              this.handleIgnoredRejection
            )
          }
        }
      )
    }

    // 兜底的图标
    let trayImage =
      this._options.icon ||
      path.join(this._options.dir, 'IconTemplate.png')
    // fs.existsSync(trayImage) 用于判断是否是一个文件
    if (
      typeof trayImage === 'string' &&
      !fs.existsSync(trayImage)
    ) {
      // 如果用户写了icon地址 但是确实个错误的文件 就走默认图标
      trayImage = path.join(
        __dirname,
        '..',
        'assets',
        'IconTemplate.png'
      )
    }

    // 默认点击事件
    const defaultClickEvent = this._options.showOnRightClick
      ? 'right-click'
      : 'click'

    // 初始化托盘
    this._tray = this._options.tray || new Tray(trayImage)
    this.startTrayPositionWatcher()
    if (!this.tray) {
      throw new Error('Tray has been initialized above')
    }

    // 给托盘绑定点击事件
    this.tray.on(
      defaultClickEvent as Parameters<Tray['on']>[0],
      this.clicked.bind(this)
    )

    // 给托盘绑定双击事件
    this.tray.on('double-click', this.clicked.bind(this))

    // 设置托盘提示
    this.tray.setToolTip(this._options.tooltip)

    if (!this._options.windowPosition) {
      // 当任务栏位置可用时填写this._options.windowPosition
      this._options.windowPosition = this.getWindowPosition(
        this.tray
      )
    }

    if (this._options.preloadWindow) {
      await this.createWindow()
    }

    this.emit('ready', this)
  }

  /**
   * 点击菜单栏图标
   * @param {Electron.KeyboardEvent} [event] - 键盘事件（可选）
   * @param {Electron.Rectangle} [bounds] - 托盘边界信息（可选）
   * @returns {Promise<void>}
   */
  private async clicked(
    event?: Electron.KeyboardEvent,
    bounds?: Electron.Rectangle
  ): Promise<void> {
    if (this.shouldHideOnModifierClick(event)) {
      this.hideWindow()
      return
    }

    this.clearPendingBlurTimeout()

    if (this._browserWindow && this._isVisible) {
      await this.handleVisibleWindowClick()
      return
    }

    this._cachedBounds = bounds || this._cachedBounds

    await this.showWindow(this._cachedBounds)
  }

  /**
   * @description 判断快捷键是否需要直接隐藏窗口
   */
  private shouldHideOnModifierClick(
    event?: Electron.KeyboardEvent
  ): boolean {
    if (!event) return false
    return event.shiftKey || event.ctrlKey || event.metaKey
  }

  /**
   * @description 清除待执行的 blur 定时器
   */
  private clearPendingBlurTimeout() {
    if (this._blurTimeout) {
      clearTimeout(this._blurTimeout)
      this._blurTimeout = null
    }
  }

  /**
   * @description 处理窗口可见时的点击逻辑
   */
  private async handleVisibleWindowClick(): Promise<void> {
    if (!this._browserWindow) {
      return
    }

    if (this._isWindows) {
      if (this._browserWindow.isMinimized()) {
        this._browserWindow.restore()
      }
      this._browserWindow.show()
      this._browserWindow.focus()
      return
    }

    if (
      this.isWindowLocked() &&
      !this._browserWindow.isFocused()
    ) {
      await this.bringWindowToFront()
      return
    }

    this.hideWindow()
  }

  /**
   * @description 创建窗口
   * @return {Promise<void>}
   */
  private async createWindow(): Promise<void> {
    this.emit('create-browserWindow', this)

    const baseBrowserWindowOptions: Electron.BrowserWindowConstructorOptions =
      {
        show: false,
        frame: this._isWindows ? true : false,
        transparent: this._isWindows ? false : true,
        ...this._options.browserWindow
      }

    if (this._isWindows) {
      baseBrowserWindowOptions.skipTaskbar = false
      baseBrowserWindowOptions.transparent = false
      baseBrowserWindowOptions.frame = true
    } else if (
      typeof baseBrowserWindowOptions.frame === 'undefined'
    ) {
      baseBrowserWindowOptions.frame = false
    }

    this._browserWindow = new BrowserWindow(
      baseBrowserWindowOptions
    )

    this._positioner = new Positioner(this._browserWindow)

    // 监听窗口大小变化 调整箭头的位置
    this._browserWindow.on('resize', () => {
      this.correctArrowPosition()
    })

    // 给窗口添加失去焦点事件，所有平台保持一致
    this._browserWindow.on('blur', () => {
      this.unregisterEscapeShortcut()
      if (!this._browserWindow) return
      // 锁定状态下允许窗口失焦但保持可见
      if (this._lockWindow) {
        this.emit('focus-lost', this)
        return
      }
      // 如果自动隐藏被禁用（例如显示对话框时），则不执行隐藏逻辑
      if (this._autoHideDisabled) {
        return
      }
      const blurHideDelay = this._isWindows ? 150 : 100
      this._blurTimeout = setTimeout(() => {
        this.hideWindow()
      }, blurHideDelay)
    })

    this._browserWindow.on('focus', () => {
      // 注册esc快捷键 快捷关闭窗口
      this.registerEscapeShortcut()
    })

    if (this._options.showOnAllWorkspaces !== false) {
      // https://github.com/electron/electron/issues/37832#issuecomment-1497882944
      this._browserWindow.setVisibleOnAllWorkspaces(true, {
        skipTransformProcessType: true // 避免破坏app.dock原来的可见状态
      })
    }

    this._browserWindow.on(
      'close',
      this.windowClear.bind(this)
    )

    this.emit('before-load', this)

    if (this._options.index !== false) {
      await this._browserWindow.loadURL(
        this._options.index,
        this._options.loadUrlOptions
      )
    }

    this.emit('after-create-browserWindow', this)
    this.applyWindowBehaviorToWindow()
  }

  /**
   * @description 清除窗口
   * @return {void}
   */
  private windowClear(): void {
    this.unregisterEscapeShortcut()
    this._browserWindow = undefined
    this.stopTrayPositionWatcher()
    this.emit('after-close', this)
  }
}
