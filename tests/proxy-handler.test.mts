import { beforeEach, expect, it, vi } from 'vitest'
import { app, dialog, session } from 'electron'
import { editProxy } from '@/handlers/proxy-handler.js'
import { proxyInputDialog } from '@/proxy-input-dialog.js'
import { settingsService } from '@/services/settings-service.js'
import { MenuLanguage } from '@/utils/constants.js'

vi.mock('electron', () => ({
  app: {
    commandLine: {
      appendSwitch: vi.fn(),
      removeSwitch: vi.fn()
    }
  },
  session: { defaultSession: { setProxy: vi.fn() } },
  dialog: { showMessageBox: vi.fn() }
}))
vi.mock('@/utils/common', () => ({ getAppIcon: vi.fn() }))
vi.mock('@/proxy-input-dialog', () => ({
  proxyInputDialog: {
    focusIfOpen: () => false,
    show: vi.fn()
  }
}))
vi.mock('@/services/settings-service', () => ({
  settingsService: {
    get: () => ({ proxy: 'old.test:8000' }),
    saveProxy: vi.fn()
  }
}))

const ready = {
  isMenubarReady: () => true,
  waitForMenubarReady: async () => true
}
beforeEach(() => {
  vi.clearAllMocks()
})

it('restores the session proxy if the new settings cannot be saved', async () => {
  vi.mocked(proxyInputDialog.show).mockResolvedValueOnce(
    'new.test:8001'
  )
  vi.mocked(
    settingsService.saveProxy
  ).mockImplementationOnce(() => {
    throw new Error('disk full')
  })
  await editProxy(ready, MenuLanguage.English)
  expect(
    vi.mocked(session.defaultSession.setProxy).mock.calls
  ).toEqual([
    [{ proxyRules: 'new.test:8001' }],
    [{ proxyRules: 'old.test:8000' }]
  ])
  expect(
    app.commandLine.appendSwitch
  ).not.toHaveBeenCalled()
  expect(dialog.showMessageBox).toHaveBeenCalledWith(
    expect.objectContaining({
      type: 'error',
      message: expect.stringContaining('disk full')
    })
  )
})

it('commits a clear only after the session accepts it', async () => {
  vi.mocked(proxyInputDialog.show).mockResolvedValue('')
  vi.mocked(
    session.defaultSession.setProxy
  ).mockRejectedValueOnce(new Error('session unavailable'))
  await editProxy(ready, MenuLanguage.English)
  expect(settingsService.saveProxy).not.toHaveBeenCalled()
  expect(
    app.commandLine.removeSwitch
  ).not.toHaveBeenCalled()
  await editProxy(ready, MenuLanguage.English)
  expect(
    settingsService.saveProxy
  ).toHaveBeenCalledExactlyOnceWith('')
  expect(
    app.commandLine.removeSwitch
  ).toHaveBeenCalledExactlyOnceWith('proxy-server')
})
