import { app } from 'electron'

import { setupAppConfig } from '@/core/app-config'
import { bootstrapApp } from '@/core/bootstrap'

setupAppConfig()

app.on('ready', async () => {
  await bootstrapApp()
})
