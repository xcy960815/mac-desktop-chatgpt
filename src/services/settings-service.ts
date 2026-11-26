import {
  readUserSetting,
  UserSetting,
  writeUserSetting
} from '@/utils/user-setting'
import {
  DEFAULT_TOGGLE_SHORTCUT,
  MenuLanguage,
  Model,
  ModelUrl
} from '@/utils/constants'

const HISTORY_LIMIT = 10

// Retain conversation links from provider domains used by older releases.
const previousOrigins: Partial<Record<Model, string[]>> = {
  [Model.ChatGPT]: ['https://chat.openai.com'],
  [Model.Qwen]: [
    'https://tongyi.aliyun.com',
    'https://chat.qwen.ai'
  ]
}

function isModelUrl(
  model: Model,
  url?: string
): url is string {
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
  [...new Set([value, ...history])].slice(0, HISTORY_LIMIT)

export const createSettingsService = () => {
  const get = readUserSetting
  const save = writeUserSetting

  const update = (
    updater: (settings: UserSetting) => UserSetting
  ): UserSetting => save(updater(get()))

  const getCurrentModelUrl = (model?: Model): string => {
    const settings = get()
    const targetModel = model ?? settings.model
    const saved = settings.urls?.[targetModel]
    if (isModelUrl(targetModel, saved)) return saved
    if (isModelUrl(targetModel, settings.lastVisitedUrl)) {
      return settings.lastVisitedUrl
    }
    return ModelUrl[targetModel]
  }

  return {
    get,
    save,
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
    saveShortcut: (shortcut: string, remember: boolean) =>
      update((settings) => ({
        ...settings,
        toggleShortcut: shortcut,
        ...(remember && {
          shortcutHistory: dedupeRecent(
            shortcut,
            settings.shortcutHistory || []
          )
        })
      })),
    removeShortcutHistory: (shortcut: string) =>
      update((settings) => ({
        ...settings,
        shortcutHistory: (
          settings.shortcutHistory || []
        ).filter((item) => item !== shortcut)
      })),
    saveProxy: (proxy: string) =>
      update((settings) => ({
        ...settings,
        proxy: proxy || undefined,
        proxyHistory: proxy
          ? dedupeRecent(proxy, settings.proxyHistory || [])
          : settings.proxyHistory || []
      })),
    removeProxyHistory: (proxyUrl: string) =>
      update((settings) => ({
        ...settings,
        proxyHistory: (settings.proxyHistory || []).filter(
          (item) => item !== proxyUrl
        )
      })),
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
