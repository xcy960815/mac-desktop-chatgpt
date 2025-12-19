import type { ConfigEnv, UserConfig } from 'vite' with {
  'resolution-mode': 'import'
}

import { pluginExposeRenderer } from './vite.base.config'

// https://vitejs.dev/config
export default async function createRendererConfig(
  env: ConfigEnv
): Promise<UserConfig> {
  const forgeEnv = env as ConfigEnv<'renderer'>
  const { root, mode, forgeConfigSelf, command } = forgeEnv
  const name = forgeConfigSelf.name ?? ''
  const isProduction = command === 'build'

  return {
    root,
    mode,
    base: './',
    build: {
      outDir: `.vite/build/renderer/${name}`,
      emptyOutDir: true,
      // 禁用 sourcemap 以减小体积
      sourcemap: false,
      // 报告压缩后的大小而不是原始大小
      reportCompressedSize: false,
      // 代码压缩
      minify: isProduction ? 'terser' : false,
      terserOptions: isProduction
        ? {
            compress: {
              drop_console: true,
              drop_debugger: true,
              // 移除未使用的代码
              dead_code: true,
              unused: true,
              // 移除注释
              passes: 2,
              // 内联函数
              inline: 2,
              // 移除未使用的变量
              pure_funcs: [
                'console.log',
                'console.info',
                'console.debug'
              ]
            },
            mangle: {
              // 混淆变量名
              safari10: true
            },
            format: {
              // 移除注释
              comments: false
            }
          }
        : undefined,
      // CSS 优化
      cssCodeSplit: true,
      cssMinify: isProduction,
      // Chunk 大小警告限制
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          // 代码分割优化
          manualChunks: {
            vendor: ['electron']
          },
          // 压缩输出
          compact: true
        },
        // Tree shaking 优化
        treeshake: {
          preset: 'recommended',
          moduleSideEffects: (id) => {
            // CSS 文件可能有副作用
            return id.endsWith('.css')
          }
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
    server: {
      port: 12138,
      strictPort: true
    },
    optimizeDeps: {
      exclude: ['electron']
    }
  }
}
