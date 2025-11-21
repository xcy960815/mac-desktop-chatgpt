import * as path from 'path'

export const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms))

interface ResolveIndexUrlOptions {
  devServerUrl?: string
  rendererDir: string
}

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
