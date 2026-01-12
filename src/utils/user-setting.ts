import fsSync from 'fs'
import path from 'path'
import { app } from 'electron'
import {
  MenuLanguage,
  Model,
  ModelUrl,
  WindowBehavior
} from '@/constants'

/**
 * Electron userData 目录下用于保存设置的子目录
 * @constant {string}
 */
const SUBPATH = 'config'

/**
 * 首次启动或读取失败时写入磁盘的默认配置
 * @constant {UserSetting}
 */
const DEFAULTSETTING: UserSetting = {
  model: Model.ChatGPT,
  urls: {
    ChatGPT: ModelUrl.ChatGPT,
    DeepSeek: ModelUrl.DeepSeek,
    Grok: ModelUrl.Grok,
    Gemini: ModelUrl.Gemini
  },
  toggleShortcut: 'CommandOrControl+g',
  autoLaunchOnStartup: false,
  lockWindowOnBlur: false,
  windowBehavior: WindowBehavior.AutoHide,
  menuLanguage: MenuLanguage.Chinese
}
/**
 * 位于 SUBPATH 目录中的配置文件名称
 * @constant {string}
 */
const FILENAME = 'settings.json'

/**
 * 用户配置文件的数据结构定义
 * @interface UserSetting
 */
export interface UserSetting {
  model: Model
  lastVisitedUrl?: string // 保留用于向后兼容
  urls?: {
    ChatGPT?: string
    DeepSeek?: string
    Grok?: string
    Gemini?: string
  }
  toggleShortcut?: string // 用于打开/关闭窗口的快捷键，默认 CommandOrControl+g
  autoLaunchOnStartup?: boolean // 是否随系统启动
  lockWindowOnBlur?: boolean // 锁定窗口，失去焦点时不隐藏
  windowBehavior?: WindowBehavior // 窗口行为模式
  menuLanguage?: MenuLanguage // 托盘菜单语言
}

/**
 * 规范化窗口行为设置，如果未设置则根据 lockWindowOnBlur 推导
 * @param {UserSetting} setting - 用户设置对象
 * @returns {UserSetting} 规范化后的用户设置对象
 */
function normalizeWindowBehavior(
  setting: UserSetting
): UserSetting {
  if (setting.windowBehavior) {
    return setting
  }
  const derivedBehavior = setting.lockWindowOnBlur
    ? WindowBehavior.LockOnDesktop
    : WindowBehavior.AutoHide
  return {
    ...setting,
    windowBehavior: derivedBehavior
  }
}

/**
 * 获取用户设置路径，并确保文件存在
 * @returns {string}
 */
function getUserSettingPath(): string {
  const basePath = app.getPath('userData')
  const dirPath = path.join(basePath, SUBPATH)
  const fileFullPath = path.join(dirPath, FILENAME)

  // 检查目录是否存在，不存在则创建
  if (!fsSync.existsSync(dirPath)) {
    fsSync.mkdirSync(dirPath, { recursive: true })
  }

  // 检查文件是否存在，不存在则创建默认文件
  if (!fsSync.existsSync(fileFullPath)) {
    fsSync.writeFileSync(
      fileFullPath,
      JSON.stringify(DEFAULTSETTING, null, 2)
    )
  }

  return fileFullPath
}

/**
 * 读取用户设置（如果文件不存在，自动创建并返回默认值）
 * @returns {UserSetting}
 */
function readUserSetting(): UserSetting {
  const filePath = getUserSettingPath()
  try {
    const data = fsSync.readFileSync(filePath, 'utf-8')
    return normalizeWindowBehavior(JSON.parse(data))
  } catch (err) {
    return DEFAULTSETTING
  }
}

/**
 * 写入用户设置
 * @param {US} data - 要写入的数据对象
 * @returns {US} 写入的数据对象
 * @template US
 */
function writeUserSetting<US = UserSetting>(data: US): US {
  const filePath = getUserSettingPath()
  fsSync.writeFileSync(
    filePath,
    JSON.stringify(data, null, 2)
  )
  return data
}

/**
 * 重置保存的 URLs 到默认值
 * @returns {UserSetting}
 */
function resetUserUrls(): UserSetting {
  const currentSetting = readUserSetting()
  // 使用 Model 枚举和 ModelUrl 枚举动态生成默认 URLs
  const defaultUrls = {
    [Model.ChatGPT]: ModelUrl.ChatGPT,
    [Model.DeepSeek]: ModelUrl.DeepSeek,
    [Model.Grok]: ModelUrl.Grok,
    [Model.Gemini]: ModelUrl.Gemini
  } as const
  const resetSetting: UserSetting = {
    ...currentSetting,
    urls: defaultUrls,
    lastVisitedUrl: undefined
  }
  return writeUserSetting(resetSetting)
}

export {
  writeUserSetting,
  readUserSetting,
  getUserSettingPath,
  resetUserUrls
}
