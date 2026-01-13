import * as path from 'path'
import { session } from 'electron'

/**
 * 延迟执行指定毫秒数
 * @param {number} ms - 延迟的毫秒数
 * @returns {Promise<void>} 延迟完成的 Promise
 */
export const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms))

/**
 * 解析主窗口索引 URL 的选项
 * @interface ResolveIndexUrlOptions
 */
interface ResolveIndexUrlOptions {
  /** 开发服务器 URL（可选） */
  devServerUrl?: string
  /** 渲染进程目录路径 */
  rendererDir: string
}

/**
 * 解析主窗口索引 URL
 * @param {ResolveIndexUrlOptions} options - 解析选项
 * @param {string} [options.devServerUrl] - 开发服务器 URL（可选）
 * @param {string} options.rendererDir - 渲染进程目录路径
 * @returns {string} 解析后的 URL 字符串
 */
export const resolveMainIndexUrl = ({
  devServerUrl,
  rendererDir
}: ResolveIndexUrlOptions) => {
  const isDev = !!devServerUrl

  if (isDev && devServerUrl) {
    return devServerUrl
  }

  return `file://${path.join(
    rendererDir,
    './renderer/main_window/index.html'
  )}`
}

/**
 * 修复 Google 登录时的 "此浏览器或应用可能不安全" 提示
 * @param {string} [partition] - Webview 的 partition 属性值，例如 'persist:webview'。如果未使用 partition，请传 undefined 或 null。
 */
export async function fixGoogleLogin(partition?: string) {
  const ses = partition
    ? session.fromPartition(partition)
    : session.defaultSession

  // 清除缓存和存储，确保干净的登录环境（可选，如果用户反馈登录循环可开启）
  await ses.clearStorageData()

  // 1. 获取原始 UA
  const originalUA = ses.getUserAgent()

  // 2. 清洗 UA：移除 Electron 和 应用名称，保留 Chrome/Safari 版本
  // 或者直接使用硬编码的 Chrome UA，这通常更稳妥
  const cleanUA =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

  // 3. 设置全局 UA
  ses.setUserAgent(cleanUA)

  // 4. 强制拦截 Google 相关请求，确保 UA 绝对干净，并处理 Client Hints
  const filter = {
    urls: [
      '*://*.google.com/*',
      '*://accounts.google.com/*'
    ]
  }

  ses.webRequest.onBeforeSendHeaders(
    filter,
    (details, callback) => {
      try {
        const { requestHeaders } = details
        // console.log('Intercepting request:', details.url)

        // 使用最新的 Chrome UA
        const chromeUA =
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
        requestHeaders['User-Agent'] = chromeUA

        // 伪造 Client Hints 以匹配 UA
        requestHeaders['sec-ch-ua'] =
          '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"'
        requestHeaders['sec-ch-ua-mobile'] = '?0'
        requestHeaders['sec-ch-ua-platform'] = '"macOS"'

        // 移除可能暴露的完整版本信息
        delete requestHeaders['sec-ch-ua-full-version']
        delete requestHeaders['sec-ch-ua-full-version-list']

        callback({ requestHeaders })
      } catch (e) {
        console.error('Error in webRequest interceptor:', e)
        callback({ requestHeaders: details.requestHeaders })
      }
    }
  )
}

/**
 * 验证代理配置是否生效
 */
export const checkProxy = async () => {
  const url = 'https://chat.deepseek.com'
  const proxy =
    await session.defaultSession.resolveProxy(url)
  console.log(
    `[Proxy Check] URL: ${url} 将使用代理: ${proxy}`
  )
}
