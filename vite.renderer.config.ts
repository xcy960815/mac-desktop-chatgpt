import type { ConfigEnv, UserConfig } from 'vite'
import { defineConfig } from 'vite'
import { pluginExposeRenderer } from './vite.base.config'

// https://vitejs.dev/config
export default defineConfig((env) => {
  const forgeEnv = env as ConfigEnv<'renderer'>
  const { root, mode, forgeConfigSelf } = forgeEnv
  const name = forgeConfigSelf.name ?? ''
  return {
    root,
    mode,
    base: './',
    build: {
      outDir: `.vite/build/renderer/${name}`,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['electron']
          }
        }
      },
      sourcemap: false,
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true
        }
      }
    },
    plugins: [pluginExposeRenderer(name)],
    resolve: {
      preserveSymlinks: true,
      alias: {
        '@': root
      }
    },
    clearScreen: false,
    optimizeDeps: {
      exclude: ['electron']
    }
  } as UserConfig
})
