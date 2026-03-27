import {
  getUserSettingPath,
  readUserSetting,
  resetUserUrls,
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

const DEFAULT_MODEL_URLS: Required<
  NonNullable<UserSetting['urls']>
> = {
  ChatGPT: ModelUrl.ChatGPT,
  DeepSeek: ModelUrl.DeepSeek,
  Grok: ModelUrl.Grok,
  Gemini: ModelUrl.Gemini,
  Qwen: ModelUrl.Qwen,
  Doubao: ModelUrl.Doubao
}

const DEFAULT_MODEL_URL_MAP: Record<Model, string> = {
  [Model.ChatGPT]: ModelUrl.ChatGPT,
  [Model.DeepSeek]: ModelUrl.DeepSeek,
  [Model.Grok]: ModelUrl.Grok,
  [Model.Gemini]: ModelUrl.Gemini,
  [Model.Qwen]: ModelUrl.Qwen,
  [Model.Doubao]: ModelUrl.Doubao
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
  resetUrls(): UserSetting
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
  setLastVisitedUrl(url?: string): UserSetting
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
      ...DEFAULT_MODEL_URLS
    })

    const getDefaultModelUrl = (model: Model): string =>
      DEFAULT_MODEL_URL_MAP[model]

    const getCurrentModelUrl = (model?: Model): string => {
      const settings = get()
      const targetModel = model ?? settings.model
      return (
        settings.urls?.[targetModel] ||
        getDefaultModelUrl(targetModel)
      )
    }

    return {
      get,
      save,
      update,
      getPath: () => getUserSettingPath(),
      resetUrls: () => resetUserUrls(),
      getDefaultModelUrl,
      getDefaultModelUrls,
      getCurrentModelUrl,
      setCurrentModel: (model: Model) =>
        update((settings) => ({
          ...settings,
          model
        })),
      setCurrentModelUrl: (url: string) =>
        update((settings) => ({
          ...settings,
          urls: {
            ...getDefaultModelUrls(),
            ...settings.urls,
            [settings.model]: url
          }
        })),
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
        })),
      setLastVisitedUrl: (url?: string) =>
        update((settings) => ({
          ...settings,
          lastVisitedUrl: url
        }))
    }
  }

export const settingsService = createSettingsService()
