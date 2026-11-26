import { EventEmitter } from 'node:events'
import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, expect, it, vi } from 'vitest'
import { app, dialog, net } from 'electron'
import { updateElectronApp } from 'update-electron-app'
import { createUpdateManager } from '@/utils/update-manager.js'

vi.mock('electron', () => ({
  app: {
    isPackaged: true,
    getVersion: vi.fn(),
    getAppPath: () => '.'
  },
  dialog: {
    showMessageBox: vi.fn(async () => ({ response: 1 }))
  },
  net: { request: vi.fn() },
  nativeImage: { createFromPath: vi.fn() },
  autoUpdater: { on: vi.fn() }
}))
vi.mock('update-electron-app', () => ({
  updateElectronApp: vi.fn(),
  UpdateSourceType: { ElectronPublicUpdateService: 0 }
}))

afterEach(() => {
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

it('only initializes Windows auto-update when the Squirrel updater exists', () => {
  const dir = mkdtempSync(
    path.join(tmpdir(), 'chathub-update-')
  )
  try {
    const appDir = path.join(dir, 'app-1.1.12')
    mkdirSync(appDir)
    vi.spyOn(process, 'platform', 'get').mockReturnValue(
      'win32'
    )
    vi.spyOn(process, 'execPath', 'get').mockReturnValue(
      path.join(appDir, 'chathub-desktop.exe')
    )
    const updates = createUpdateManager()
    updates.initialize()
    expect(updateElectronApp).not.toHaveBeenCalled()
    writeFileSync(path.join(dir, 'Update.exe'), '')
    updates.initialize()
    expect(updateElectronApp).toHaveBeenCalledOnce()
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

it.each(['1.1.11', '1.1.12-beta.1'])(
  'offers stable 1.1.12 to version %s',
  async (current) => {
    vi.mocked(app.getVersion).mockReturnValue(current)
    const request = Object.assign(new EventEmitter(), {
      end() {
        const response = Object.assign(new EventEmitter(), {
          statusCode: 200
        })
        this.emit('response', response)
        response.emit(
          'data',
          Buffer.from('{"tag_name":"v1.1.12"}')
        )
        response.emit('end')
      }
    })
    vi.mocked(net.request).mockReturnValue(
      request as unknown as Electron.ClientRequest
    )
    await createUpdateManager().checkForUpdates()
    expect(dialog.showMessageBox).toHaveBeenCalledWith(
      expect.objectContaining({ title: '发现新版本' })
    )
  }
)
