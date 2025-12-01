import * as path from 'path'

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
