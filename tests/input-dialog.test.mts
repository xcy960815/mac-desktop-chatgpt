import { EventEmitter } from 'node:events'
import {
  afterEach,
  beforeEach,
  expect,
  it,
  vi
} from 'vitest'
import { ipcMain } from 'electron'
import { createInputDialog } from '@/dialogs/input-dialog-shared.js'
import { MenuLanguage } from '@/utils/constants.js'

const windows: TestWindow[] = []
class TestWindow extends EventEmitter {
  webContents = {}
  focus = vi.fn()
  restore = vi.fn()
  isMinimized = () => true
  loadURL() {
    return Promise.resolve()
  }
  destroyed = false
  isDestroyed = () => this.destroyed
  close() {
    this.emit('close')
    this.destroyed = true
    this.emit('closed')
  }
  constructor() {
    super()
    windows.push(this)
  }
}

vi.mock('electron', async () => {
  const { EventEmitter } = await import('node:events')
  return {
    get BrowserWindow() {
      return TestWindow
    },
    app: { getAppPath: () => '/test' },
    screen: {
      getPrimaryDisplay: () => ({
        workArea: { x: 0, y: 0, width: 1200, height: 800 }
      })
    },
    ipcMain: new EventEmitter()
  }
})

function openDialog(render = () => '<html></html>') {
  const removeHistory = vi.fn()
  const dialog = createInputDialog({
    title: 'shortcutDialogTitle',
    responseChannel: 'submit',
    deleteChannel: 'delete',
    render,
    removeHistory
  })
  const open = () => dialog.show(MenuLanguage.Chinese, null)
  return { open, removeHistory }
}

beforeEach(() => {
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
  windows.length = 0
  ipcMain.removeAllListeners()
})

it('focuses an existing dialog and only processes IPC from its own window until submission', async () => {
  const { open, removeHistory } = openDialog()
  const first = open()
  const [win] = windows
  expect(await open()).toBeNull()
  expect(windows).toHaveLength(1)
  expect(win.restore).toHaveBeenCalledOnce()
  expect(win.focus).toHaveBeenCalledOnce()
  const event = { sender: win.webContents }
  ipcMain.emit('submit', { sender: {} }, 'wrong window')
  ipcMain.emit('submit', event, 123)
  ipcMain.emit('delete', { sender: {} }, 'wrong window')
  ipcMain.emit('delete', event, 'old')
  ipcMain.emit('submit', event, 'new')
  ipcMain.emit('submit', event, 'duplicate')
  expect(await first).toBe('new')
  expect(removeHistory.mock.calls).toEqual([['old']])
  expect(ipcMain.listenerCount('submit')).toBe(0)
  expect(ipcMain.listenerCount('delete')).toBe(0)
  vi.runAllTimers()
  expect(win.isDestroyed()).toBe(true)
})

it('reopens after load failure and treats a native window close as cancel', async () => {
  const { open } = openDialog()
  const load = vi
    .spyOn(TestWindow.prototype, 'loadURL')
    .mockRejectedValueOnce(new Error('load failed'))
  await expect(open()).rejects.toThrow('load failed')
  load.mockRestore()
  expect(windows[0].isDestroyed()).toBe(true)
  expect(ipcMain.listenerCount('submit')).toBe(0)
  const next = open()
  expect(windows).toHaveLength(2)
  windows[1].close()
  expect(await next).toBeNull()
})
