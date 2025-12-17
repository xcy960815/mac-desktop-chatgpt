
import type { ConfigEnv, UserConfig } from 'vite' with { "resolution-mode": "import" };

import { getBuildConfig, external, pluginHotRestart } from './vite.base.config';

// https://vitejs.dev/config
export default async function createPreloadConfig(env: ConfigEnv): Promise<UserConfig> {
  const { mergeConfig } = await import('vite');
  const forgeEnv = env as ConfigEnv<'build'>;
  const { forgeConfigSelf } = forgeEnv;
  const isProduction = forgeEnv.command === 'build'
  
  const config: UserConfig = {
    build: {
      // 生产环境启用压缩
      minify: isProduction ? 'terser' : false,
      terserOptions: isProduction ? {
        compress: {
          drop_console: true,
          drop_debugger: true,
          dead_code: true,
          unused: true,
          passes: 2,
        },
        mangle: {
          safari10: true,
        },
        format: {
          comments: false,
        },
      } : undefined,
      sourcemap: false,
      rollupOptions: {
        external,
        treeshake: {
          preset: 'recommended',
        },
        // Preload scripts may contain Web assets, so use the `build.rollupOptions.input` instead `build.lib.entry`.
        input: forgeConfigSelf.entry!,
        output: {
          format: 'cjs',
          // It should not be split chunks.
          inlineDynamicImports: true,
          entryFileNames: '[name].js',
          chunkFileNames: '[name].js',
          assetFileNames: '[name].[ext]',
          compact: true,
        },
      },
    },
    plugins: [pluginHotRestart('reload')],
  };

  return mergeConfig(getBuildConfig(forgeEnv), config);
}
