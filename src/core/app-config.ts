import { app } from 'electron'
import { TOOLTIP } from '@/utils/constants'
import { readUserSetting } from '@/utils/user-setting'

export const setupAppConfig = (): void => {
  const userSetting = readUserSetting()
  if (userSetting.proxy) {
    app.commandLine.appendSwitch(
      'proxy-server',
      userSetting.proxy
    )
  }

  // 设置应用名称，这会影响 Dock Hover Title
  app.setName(TOOLTIP)

  // 设置忽略证书错误
  app.commandLine.appendSwitch('ignore-certificate-errors')

  // 设置禁用 自动化受控
  app.commandLine.appendSwitch(
    'disable-blink-features',
    'AutomationControlled'
  )

  // 设置禁用 WebGPU、WebAuthn
  app.commandLine.appendSwitch(
    'disable-features',
    'WebGPU,WebAuthn'
  )

  // 禁用 QUIC 协议，解决代理环境下 Google 服务连接不稳定/SSL 握手失败的问题
  app.commandLine.appendSwitch('disable-quic')

  // 防止后台窗口被节流，解决隐藏后再打开白屏的问题
  app.commandLine.appendSwitch(
    'disable-backgrounding-occluded-windows',
    'true'
  )
}
