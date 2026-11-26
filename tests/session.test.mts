import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import {
  afterEach,
  beforeEach,
  expect,
  it,
  vi
} from 'vitest'
import { app } from 'electron'
import { createTrayActionService } from '@/services/tray-action-service.js'
import {
  createSettingsService,
  settingsService
} from '@/services/settings-service.js'
import {
  MenuLanguage,
  Model,
  ModelUrl
} from '@/utils/constants.js'
import { createUpdateManager } from '@/utils/update-manager.js'

vi.mock('electron', () => ({
  app: { getPath: vi.fn(), quit: vi.fn() }
}))
vi.mock('update-electron-app', () => ({}))

let profile: string
beforeEach(() => {
  profile = mkdtempSync(
    path.join(tmpdir(), 'chathub-test-')
  )
  vi.mocked(app.getPath).mockReturnValue(profile)
})
afterEach(() =>
  rmSync(profile, { recursive: true, force: true })
)

const send = vi.fn()
const win = {
  webContents: { send }
} as unknown as Electron.BrowserWindow
const actions = createTrayActionService({
  context: {
    getBrowserWindow: () => win,
    setAlwaysOnTop: vi.fn(),
    withBrowserWindow: async (task) => task(win),
    updateManager: createUpdateManager()
  },
  menuLanguage: MenuLanguage.Chinese,
  updateContextMenu: vi.fn()
})

const urls = {
  ChatGPT: 'https://chatgpt.com/c/example',
  Gemini: 'https://gemini.google.com/app/example'
}

it('reloads the guest and restores both saved conversations after tray quit', async () => {
  settingsService.save({ model: Model.Gemini, urls })
  await actions.reloadCurrentModel()()
  expect(send).toHaveBeenCalledWith('reload-current-model')
  expect(settingsService.get().urls).toEqual(urls)
  actions.quit()()
  expect(app.quit).toHaveBeenCalledOnce()
  const restored = createSettingsService()
  expect(restored.getCurrentModelUrl()).toBe(urls.Gemini)
  expect(restored.getCurrentModelUrl(Model.ChatGPT)).toBe(
    urls.ChatGPT
  )
})

it('ignores stale navigation from another model and temporary login pages', () => {
  settingsService.save({ model: Model.Gemini, urls })
  settingsService.setCurrentModelUrl(urls.ChatGPT)
  settingsService.setCurrentModelUrl(
    'https://accounts.google.com/signin'
  )
  expect(settingsService.get().urls).toEqual(urls)
  const next = 'https://gemini.google.com/app/next'
  settingsService.setCurrentModelUrl(next)
  expect(settingsService.get().urls).toEqual({
    ...urls,
    Gemini: next
  })
})

it('restores a legacy conversation and ignores a saved shell path', () => {
  settingsService.save({
    model: Model.ChatGPT,
    lastVisitedUrl: urls.ChatGPT
  })
  expect(settingsService.getCurrentModelUrl()).toBe(
    urls.ChatGPT
  )
  settingsService.save({
    model: Model.ChatGPT,
    lastVisitedUrl: 'file:///old/install/index.html'
  })
  expect(settingsService.getCurrentModelUrl()).toBe(
    ModelUrl.ChatGPT
  )
})
