import { Tray, nativeImage, nativeTheme } from 'electron'
import * as path from 'path'

import { TOOLTIP } from '@/utils/constants'

export interface CreateTrayOptions {
  appPath: string
}

export const getTrayIconPath = ({
  appPath
}: CreateTrayOptions): string => {
  // macOS 上使用 Template 图片，系统会自动处理深浅色适配
  if (process.platform === 'darwin') {
    return path.join(
      appPath,
      'images',
      'gptIconTemplate.png'
    )
  }

  // Windows/Linux 根据系统当前是否为深色模式，返回不同的图标
  // 深色模式使用浅色图片，浅色模式使用深色图片
  return nativeTheme.shouldUseDarkColors
    ? path.join(appPath, 'images', 'gptIconLight.png')
    : path.join(appPath, 'images', 'gptIconDark.png')
}

export const createAppTray = ({
  appPath
}: CreateTrayOptions): Tray => {
  const tray = new Tray(
    nativeImage.createFromPath(
      getTrayIconPath({
        appPath
      })
    )
  )

  tray.setToolTip(TOOLTIP)
  tray.setIgnoreDoubleClickEvents(true)

  if (process.platform !== 'darwin') {
    nativeTheme.on('updated', () => {
      tray.setImage(
        nativeImage.createFromPath(
          getTrayIconPath({
            appPath
          })
        )
      )
    })
  }

  return tray
}
