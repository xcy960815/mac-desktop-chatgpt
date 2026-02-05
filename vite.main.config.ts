import type { ConfigEnv, UserConfig } from 'vite' with {
  'resolution-mode': 'import'
}
import {
  getBuildConfig,
  getBuildDefine,
  external,
  pluginHotRestart
} from './vite.base.config'

// https://vitejs.dev/config
export default async function createMainConfig(
  env: ConfigEnv
): Promise<UserConfig> {
  const { mergeConfig } = await import('vite')
  const forgeEnv = env as ConfigEnv<'build'>
  const { forgeConfigSelf } = forgeEnv
  const define = getBuildDefine(forgeEnv)
  const isProduction = forgeEnv.command === 'build'

  const config: UserConfig = {
    base: './',
    build: {
      lib: {
        entry: forgeConfigSelf.entry!,
        fileName: () => '[name].js',
        formats: ['cjs']
      },
      // 生产环境启用压缩
      minify: isProduction ? 'terser' : false,
      terserOptions: isProduction
        ? {
            compress: {
              drop_console: true,
              drop_debugger: true,
              dead_code: true,
              unused: true,
              passes: 2
            },
            mangle: {
              safari10: true
            },
            format: {
              comments: false
            }
          }
        : undefined,
      sourcemap: false,
      rollupOptions: {
        external,
        treeshake: {
          preset: 'recommended'
        },
        output: {
          compact: true
        }
      }
    },
    plugins: [pluginHotRestart('restart')],
    define,
    resolve: {
      // Load the Node.js entry.
      mainFields: ['module', 'jsnext:main', 'jsnext']
    }
  }

  return mergeConfig(getBuildConfig(forgeEnv), config)
}
