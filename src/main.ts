import { app } from 'electron'
import electronSquirrelStartup from 'electron-squirrel-startup'

import { setupAppConfig } from '@/core/app-config'
import { bootstrapApp } from '@/core/bootstrap'

if (!electronSquirrelStartup) {
  setupAppConfig()

  app.on('ready', async () => {
    await bootstrapApp()
  })
}
