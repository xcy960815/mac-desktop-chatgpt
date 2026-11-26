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
import { app, Menu } from 'electron'
import { setupTrayContextMenu } from '@/tray-context-menu.js'
import { createShortcutManager } from '@/shortcut-manager.js'
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
  Menu: { buildFromTemplate: vi.fn() },
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
  isDestroyed: () => false,
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
  await actions.reloadCurrentModel()
  expect(send).toHaveBeenCalledWith('reload-current-model')
  expect(settingsService.get().urls).toEqual(urls)
  actions.quit()
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

it('saves each setting together with its ten most recent distinct entries', () => {
  for (let i = 0; i <= 10; i++) {
    settingsService.saveProxy(`proxy.test:${1000 + i}`)
    settingsService.saveShortcut(`Ctrl+F${i + 1}`, true)
  }
  const { proxyHistory, shortcutHistory } =
    settingsService.get()
  expect(proxyHistory).toHaveLength(10)
  expect(shortcutHistory).toHaveLength(10)
  expect(proxyHistory).not.toContain('proxy.test:1000')
  expect(shortcutHistory).not.toContain('Ctrl+F1')
  settingsService.saveProxy('proxy.test:1001')
  settingsService.saveShortcut('Ctrl+F2', true)
  const promoted = settingsService.get()
  expect(promoted.proxyHistory).toEqual([
    'proxy.test:1001',
    ...proxyHistory.slice(0, -1)
  ])
  expect(promoted.shortcutHistory).toEqual([
    'Ctrl+F2',
    ...shortcutHistory.slice(0, -1)
  ])
  settingsService.saveProxy('')
  settingsService.saveShortcut('CommandOrControl+g', false)
  const cleared = settingsService.get()
  expect(cleared.proxy).toBeUndefined()
  expect(cleared.toggleShortcut).toBe('CommandOrControl+g')
  expect(cleared.proxyHistory).toEqual(
    promoted.proxyHistory
  )
  expect(cleared.shortcutHistory).toEqual(
    promoted.shortcutHistory
  )
})

it('uses the default URL for a model missing from older settings', () => {
  settingsService.save({ model: Model.Grok, urls })
  expect(settingsService.getCurrentModelUrl()).toBe(
    ModelUrl.Grok
  )
})

it('builds model menu items in display order and switches only when clicked', () => {
  settingsService.save({ model: Model.ChatGPT, urls })
  setupTrayContextMenu({
    tray: {
      setContextMenu: vi.fn()
    } as unknown as Electron.Tray,
    isMenubarReady: () => true,
    waitForMenubarReady: async () => true,
    getBrowserWindow: () => win,
    withBrowserWindow: async (task) => task(win),
    setAlwaysOnTop: vi.fn(),
    shortcutManager: createShortcutManager(vi.fn()),
    updateManager: createUpdateManager()
  })
  const submenu = () =>
    vi.mocked(Menu.buildFromTemplate).mock.lastCall[0][0]
      .submenu as Electron.MenuItemConstructorOptions[]
  expect(submenu().map((item) => item.label)).toEqual([
    'ChatGPT',
    'Grok',
    'Gemini',
    'DeepSeek',
    'Qwen',
    'Doubao'
  ])
  expect(
    submenu()
      .filter((item) => item.checked)
      .map((item) => item.label)
  ).toEqual(['ChatGPT'])
  const gemini = submenu().find(
    (item) => item.label === 'Gemini'
  )
  gemini.click(null, null, null)
  expect(settingsService.get().model).toBe(Model.Gemini)
  expect(send).toHaveBeenCalledWith(
    'model-changed',
    Model.Gemini,
    urls.Gemini
  )
  expect(
    submenu()
      .filter((item) => item.checked)
      .map((item) => item.label)
  ).toEqual(['Gemini'])
})
