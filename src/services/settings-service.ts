import {
  getUserSettingPath,
  readUserSetting,
  UserSetting,
  writeUserSetting
} from '@/utils/user-setting'
import {
  MenuLanguage,
  Model,
  ModelUrl
} from '@/utils/constants'

const DEFAULT_TOGGLE_SHORTCUT = 'CommandOrControl+g'
const HISTORY_LIMIT = 10

// Retain conversation links from provider domains used by older releases.
const previousOrigins: Partial<Record<Model, string[]>> = {
  [Model.ChatGPT]: ['https://chat.openai.com'],
  [Model.Qwen]: [
    'https://tongyi.aliyun.com',
    'https://chat.qwen.ai'
  ]
}

function isModelUrl(model: Model, url?: string): boolean {
  if (!ModelUrl[model] || !url || !URL.canParse(url))
    return false
  const { origin, protocol } = new URL(url)
  if (protocol !== 'https:') return false
  return (
    origin === new URL(ModelUrl[model]).origin ||
    !!previousOrigins[model]?.includes(origin)
  )
}

const dedupeRecent = (
  value: string,
  history: string[]
): string[] =>
  [
    value,
    ...history.filter((item) => item !== value)
  ].slice(0, HISTORY_LIMIT)

export interface SettingsService {
  get(): UserSetting
  save(settings: UserSetting): UserSetting
  update(
    updater: (settings: UserSetting) => UserSetting
  ): UserSetting
  getPath(): string
  getDefaultModelUrl(model: Model): string
  getDefaultModelUrls(): Required<
    NonNullable<UserSetting['urls']>
  >
  getCurrentModelUrl(model?: Model): string
  setCurrentModel(model: Model): UserSetting
  setCurrentModelUrl(url: string): UserSetting
  getToggleShortcut(): string
  setToggleShortcut(shortcut: string): UserSetting
  upsertShortcutHistory(shortcut: string): UserSetting
  removeShortcutHistory(shortcut: string): UserSetting
  getShortcutHistory(): string[]
  getProxy(): string | undefined
  setProxy(proxy?: string): UserSetting
  upsertProxyHistory(proxy: string): UserSetting
  removeProxyHistory(proxyUrl: string): UserSetting
  getProxyHistory(): string[]
  setAutoLaunchOnStartup(enabled: boolean): UserSetting
  setAlwaysOnTop(enabled: boolean): UserSetting
  setMenuLanguage(language: MenuLanguage): UserSetting
}

export const createSettingsService =
  (): SettingsService => {
    const get = (): UserSetting => readUserSetting()

    const save = (settings: UserSetting): UserSetting =>
      writeUserSetting(settings)

    const update = (
      updater: (settings: UserSetting) => UserSetting
    ): UserSetting => save(updater(get()))

    const getDefaultModelUrls = () => ({
      ...ModelUrl
    })

    const getDefaultModelUrl = (model: Model): string =>
      ModelUrl[model]

    const getCurrentModelUrl = (model?: Model): string => {
      const settings = get()
      const targetModel = model ?? settings.model
      const saved = settings.urls?.[targetModel]
      if (isModelUrl(targetModel, saved)) return saved
      if (
        isModelUrl(targetModel, settings.lastVisitedUrl)
      ) {
        return settings.lastVisitedUrl
      }
      return getDefaultModelUrl(targetModel)
    }

    return {
      get,
      save,
      update,
      getPath: () => getUserSettingPath(),
      getDefaultModelUrl,
      getDefaultModelUrls,
      getCurrentModelUrl,
      setCurrentModel: (model: Model) =>
        update((settings) => ({
          ...settings,
          model
        })),
      setCurrentModelUrl: (url: string) => {
        const settings = get()
        const model = settings.model
        if (
          !isModelUrl(model, url) ||
          settings.urls?.[model] === url
        ) {
          return settings
        }
        return save({
          ...settings,
          urls: { ...settings.urls, [model]: url }
        })
      },
      getToggleShortcut: () =>
        get().toggleShortcut || DEFAULT_TOGGLE_SHORTCUT,
      setToggleShortcut: (shortcut: string) =>
        update((settings) => ({
          ...settings,
          toggleShortcut: shortcut
        })),
      upsertShortcutHistory: (shortcut: string) =>
        update((settings) => ({
          ...settings,
          shortcutHistory: dedupeRecent(
            shortcut,
            settings.shortcutHistory || []
          )
        })),
      removeShortcutHistory: (shortcut: string) =>
        update((settings) => ({
          ...settings,
          shortcutHistory: (
            settings.shortcutHistory || []
          ).filter((item) => item !== shortcut)
        })),
      getShortcutHistory: () => get().shortcutHistory || [],
      getProxy: () => get().proxy,
      setProxy: (proxy?: string) =>
        update((settings) => ({
          ...settings,
          proxy
        })),
      upsertProxyHistory: (proxy: string) =>
        update((settings) => ({
          ...settings,
          proxyHistory: dedupeRecent(
            proxy,
            settings.proxyHistory || []
          )
        })),
      removeProxyHistory: (proxyUrl: string) =>
        update((settings) => ({
          ...settings,
          proxyHistory: (
            settings.proxyHistory || []
          ).filter((item) => item !== proxyUrl)
        })),
      getProxyHistory: () => get().proxyHistory || [],
      setAutoLaunchOnStartup: (enabled: boolean) =>
        update((settings) => ({
          ...settings,
          autoLaunchOnStartup: enabled
        })),
      setAlwaysOnTop: (enabled: boolean) =>
        update((settings) => ({
          ...settings,
          alwaysOnTop: enabled
        })),
      setMenuLanguage: (language: MenuLanguage) =>
        update((settings) => ({
          ...settings,
          menuLanguage: language
        }))
    }
  }

export const settingsService = createSettingsService()
