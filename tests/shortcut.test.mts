import { beforeEach, expect, it, vi } from 'vitest'
import { globalShortcut, ipcMain } from 'electron'
import { createShortcutManager } from '@/shortcut-manager.js'
import { settingsService } from '@/services/settings-service.js'

vi.mock('electron', () => ({
  ipcMain: { handle: vi.fn() },
  globalShortcut: { register: vi.fn(), unregister: vi.fn() }
}))
vi.mock('@/services/settings-service', () => ({
  settingsService: {
    getToggleShortcut: () => 'Ctrl+G',
    saveShortcut: vi.fn()
  }
}))

const registered = new Set<string>()
beforeEach(() => {
  vi.clearAllMocks()
  registered.clear()
  vi.mocked(globalShortcut.register).mockImplementation(
    (key) => {
      if (registered.has(key)) return false
      registered.add(key)
      return true
    }
  )
  vi.mocked(globalShortcut.unregister).mockImplementation(
    (key) => {
      registered.delete(key)
    }
  )
})

function start() {
  const manager = createShortcutManager(vi.fn())
  manager.registerToggleShortcut()
  return manager
}

it('suspends the active shortcut while recording and restores it on cancel', async () => {
  const manager = start()
  await manager.editToggleShortcut(async () => {
    expect(registered.has('Ctrl+G')).toBe(false)
    return null
  })
  expect([...registered]).toEqual(['Ctrl+G'])
  expect(
    settingsService.saveShortcut
  ).not.toHaveBeenCalled()
})

it('restores the active shortcut on conflict or a settings write failure', async () => {
  const manager = start()
  registered.add('Ctrl+T')
  expect(
    await manager.editToggleShortcut(async () => 'Ctrl+T')
  ).toMatchObject({ success: false })
  expect(registered.has('Ctrl+G')).toBe(true)
  vi.mocked(
    settingsService.saveShortcut
  ).mockImplementationOnce(() => {
    throw Error('disk full')
  })
  await expect(
    manager.editToggleShortcut(async () => 'Ctrl+F')
  ).rejects.toThrow('disk full')
  expect(registered.has('Ctrl+F')).toBe(false)
  expect(registered.has('Ctrl+G')).toBe(true)
})

it('only accepts one edit while recording or confirming a reset', async () => {
  const manager = start()
  let finish!: (value: string) => void
  const first = manager.editToggleShortcut(
    () =>
      new Promise((resolve) => {
        finish = resolve
      })
  )
  const duplicate = vi.fn(async () => 'Ctrl+T')
  expect(
    await manager.editToggleShortcut(duplicate)
  ).toBeNull()
  expect(duplicate).not.toHaveBeenCalled()
  finish('Ctrl+F')
  await first
  expect(
    settingsService.saveShortcut
  ).toHaveBeenCalledTimes(1)
  expect([...registered]).toEqual(['Ctrl+F'])
})

it('restores after a failed dialog and accepts a later reset without adding history', async () => {
  const manager = start()
  await expect(
    manager.editToggleShortcut(async () => {
      throw new Error('failed to open')
    })
  ).rejects.toThrow('failed to open')
  expect([...registered]).toEqual(['Ctrl+G'])
  expect(
    await manager.editToggleShortcut(async () => ' ')
  ).toEqual({
    success: true,
    shortcut: 'CommandOrControl+g',
    reset: true
  })
  expect(settingsService.saveShortcut).toHaveBeenCalledWith(
    'CommandOrControl+g',
    false
  )
  expect([...registered]).toEqual(['CommandOrControl+g'])
})

it('falls back on startup if Electron rejects a malformed saved shortcut', () => {
  vi.mocked(globalShortcut.register).mockImplementationOnce(
    () => {
      throw new Error('invalid accelerator')
    }
  )
  start()
  expect([...registered]).toEqual(['CommandOrControl+g'])
  expect(
    settingsService.saveShortcut
  ).not.toHaveBeenCalled()
})

it('uses the same edit lock for IPC and preserves the preload response contract', async () => {
  const manager = start()
  manager.registerIpcHandlers()
  const handlers = new Map(
    vi.mocked(ipcMain.handle).mock.calls
  )
  const set = (value: string) =>
    handlers.get('set-toggle-shortcut')?.(null, value)
  expect(handlers.get('get-toggle-shortcut')?.(null)).toBe(
    'Ctrl+G'
  )
  await manager.editToggleShortcut(async () => {
    expect(await set('Ctrl+P')).toMatchObject({
      success: false,
      message: expect.any(String)
    })
    return null
  })
  expect(await set('  ')).toMatchObject({ success: false })
  expect(await set('Ctrl+P')).toMatchObject({
    success: true,
    message: expect.any(String)
  })
  expect(
    settingsService.saveShortcut
  ).toHaveBeenCalledExactlyOnceWith('Ctrl+P', false)
  expect([...registered]).toEqual(['Ctrl+P'])
})
