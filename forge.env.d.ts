export {}; // Make this a module

declare global {
  /**
   * 主窗口 Vite 开发服务器 URL
   */
  const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
  /**
   * 主窗口 Vite 名称
   */
  const MAIN_WINDOW_VITE_NAME: string;

  namespace NodeJS {
    interface Process {
      /**
       * 用于热重载预加载脚本
       */
      viteDevServers: Record<string, import('vite').ViteDevServer>;
    }
  }

  /**
   * Vite 插件配置
   */
  type VitePluginConfig = ConstructorParameters<typeof import('@electron-forge/plugin-vite').VitePlugin>[0];

  /**
   * Vite 插件运行时键
   */
  interface VitePluginRuntimeKeys {
    /**
     * 主窗口 Vite 开发服务器 URL
     */
    VITE_DEV_SERVER_URL: `${string}_VITE_DEV_SERVER_URL`;
    /**
     * 主窗口 Vite 名称
     */
    VITE_NAME: `${string}_VITE_NAME`;
  }
}

declare module 'vite' {
  interface ConfigEnv<K extends keyof VitePluginConfig = keyof VitePluginConfig> {
    root: string;
    forgeConfig: VitePluginConfig;
    forgeConfigSelf: VitePluginConfig[K][number];
  }
}
