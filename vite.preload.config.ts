
import type { ConfigEnv, UserConfig } from 'vite' with { "resolution-mode": "import" };

import { getBuildConfig, external, pluginHotRestart } from './vite.base.config';

// https://vitejs.dev/config
export default async function createPreloadConfig(env: ConfigEnv): Promise<UserConfig> {
  const { mergeConfig } = await import('vite');
  const forgeEnv = env as ConfigEnv<'build'>;
  const { forgeConfigSelf } = forgeEnv;
  const config: UserConfig = {
    build: {
      rollupOptions: {
        external,
        // Preload scripts may contain Web assets, so use the `build.rollupOptions.input` instead `build.lib.entry`.
        input: forgeConfigSelf.entry!,
        output: {
          format: 'cjs',
          // It should not be split chunks.
          inlineDynamicImports: true,
          entryFileNames: '[name].js',
          chunkFileNames: '[name].js',
          assetFileNames: '[name].[ext]',
        },
      },
    },
    plugins: [pluginHotRestart('reload')],
  };

  return mergeConfig(getBuildConfig(forgeEnv), config);
}
