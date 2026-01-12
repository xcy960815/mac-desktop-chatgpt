// 移除 webdriver 属性，绕过 Cloudflare 检测
try {
  const code = `
    // 0. 移除 Selenium/ChromeDriver 标记 (cdc_...)
    // 这些通常被检测脚本使用。
    for (const key in window) {
      if (key.startsWith('cdc_')) {
        delete window[key];
      }
    }

    // 1. 通过 Webdriver 检测
    // 如果 disable-blink-features=AutomationControlled 标志因某种原因未生效，
    // 或者有其他机制设置了它，我们确保将其移除。
    if ('webdriver' in navigator) {
      delete Object.getPrototypeOf(navigator).webdriver;
      delete navigator.webdriver;
    }
    
    // 2. 如果插件列表为空，则模拟插件
    if (navigator.plugins.length === 0) {
      const pdfPlugin = {
        0: { type: "application/x-google-chrome-pdf", suffixes: "pdf", description: "Portable Document Format", enabledPlugin: null },
        description: "Portable Document Format",
        filename: "internal-pdf-viewer",
        length: 1,
        name: "Chrome PDF Plugin"
      };
      // 修复 enabledPlugin 的循环引用
      pdfPlugin[0].enabledPlugin = pdfPlugin;
      
      const plugins = [pdfPlugin, pdfPlugin, pdfPlugin]; // 为简洁起见进行了简化，通常是不同的
      // 最好让它看起来像一个 PluginArray
      const pluginArray = {
        0: pdfPlugin,
        1: pdfPlugin,
        2: pdfPlugin,
        length: 3,
        item: (index) => plugins[index],
        namedItem: (name) => plugins.find(p => p.name === name),
        refresh: () => {}
      };
      
      Object.defineProperty(navigator, 'plugins', {
        get: () => pluginArray,
        configurable: true
      });
    }

    // 3. 确保 languages 属性存在
    if (!navigator.languages || navigator.languages.length === 0) {
      Object.defineProperty(navigator, 'languages', {
        get: () => ['zh-CN', 'zh', 'en'],
        configurable: true
      });
    }

    // 4. WebGL 供应商/渲染器
    const getParameter = WebGLRenderingContext.getParameter;
    WebGLRenderingContext.prototype.getParameter = function(parameter) {
      // UNMASKED_VENDOR_WEBGL
      if (parameter === 37445) {
        return 'Intel Inc.';
      }
      // UNMASKED_RENDERER_WEBGL
      if (parameter === 37446) {
        return 'Intel(R) Iris(R) Plus Graphics 640';
      }
      return getParameter(parameter);
    };

    // 5. 模拟 window.chrome
    if (!window.chrome) {
      const chromeMock = {
        runtime: {
          connect: () => {},
          sendMessage: () => {},
          onMessage: { addListener: () => {}, removeListener: () => {} }
        },
        loadTimes: () => {},
        csi: () => {},
        app: {
          isInstalled: false,
          InstallState: {
            DISABLED: 'disabled',
            INSTALLED: 'installed',
            NOT_INSTALLED: 'not_installed'
          },
          RunningState: {
            CANNOT_RUN: 'cannot_run',
            READY_TO_RUN: 'ready_to_run',
            RUNNING: 'running'
          }
        }
      };
      Object.defineProperty(window, 'chrome', {
        get: () => chromeMock,
        configurable: true
      });
    }

    // 6. 模拟 navigator.permissions
    if (navigator.permissions) {
      const originalQuery = navigator.permissions.query;
      navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: Notification.permission, onchange: null }) :
          originalQuery(parameters)
      );
    }

    // 7. 确保主世界中的 User-Agent 一致性
    // 使用与 main.ts 中相同的硬编码 UA
    // 注意：我们在这里硬编码以避免预加载脚本中的导入问题
    const newUA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
    
    Object.defineProperty(navigator, 'userAgent', {
      get: () => newUA,
      configurable: true
    });

    // 8. 模拟 navigator.userAgentData
    // 这一点至关重要，因为 Google 使用它来检测真实的 Chromium 版本（例如 136）
    // 这与我们伪造的 UA (131) 不匹配。
    if (navigator.userAgentData) {
      const brands = [
        { brand: 'Not_A Brand', version: '24' },
        { brand: 'Chromium', version: '131' },
        { brand: 'Google Chrome', version: '131' }
      ];
      
      Object.defineProperty(navigator, 'userAgentData', {
        get: () => ({
          brands: brands,
          mobile: false,
          platform: 'macOS',
          getHighEntropyValues: (hints) => Promise.resolve({
            brands: brands,
            mobile: false,
            platform: 'macOS',
            architecture: 'x86',
            bitness: '64',
            model: '',
            platformVersion: '14.0.0',
            uaFullVersion: '131.0.0.0',
            fullVersionList: brands
          })
        }),
        configurable: true
      });
    }

    // 9. 模拟 maxTouchPoints
    Object.defineProperty(navigator, 'maxTouchPoints', {
      get: () => 0,
      configurable: true
    });
  `

  const inject = () => {
    const doc = document.head || document.documentElement
    if (doc) {
      try {
        const script = document.createElement('script')
        script.textContent = code
        doc.appendChild(script)
        script.remove()
      } catch (e) {
        // silent fail
      }
    } else {
      setTimeout(inject, 10)
    }
  }

  inject()
} catch (e) {
  // silent fail
}
