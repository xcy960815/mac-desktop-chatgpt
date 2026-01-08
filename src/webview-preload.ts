// 移除 webdriver 属性，绕过 Cloudflare 检测
try {
  const code = `
    // 0. Remove Selenium/ChromeDriver markers (cdc_...)
    // These are often used by detection scripts.
    for (const key in window) {
      if (key.startsWith('cdc_')) {
        delete window[key];
      }
    }

    // 1. Pass the Webdriver check
    // If the flag disable-blink-features=AutomationControlled didn't work for some reason,
    // or if some other mechanism set it, we ensure it's gone.
    if ('webdriver' in navigator) {
      delete Object.getPrototypeOf(navigator).webdriver;
      delete navigator.webdriver;
    }
    
    // 2. Mock plugins if empty
    if (navigator.plugins.length === 0) {
      const pdfPlugin = {
        0: { type: "application/x-google-chrome-pdf", suffixes: "pdf", description: "Portable Document Format", enabledPlugin: null },
        description: "Portable Document Format",
        filename: "internal-pdf-viewer",
        length: 1,
        name: "Chrome PDF Plugin"
      };
      // Fix circular reference for enabledPlugin
      pdfPlugin[0].enabledPlugin = pdfPlugin;
      
      const plugins = [pdfPlugin, pdfPlugin, pdfPlugin]; // Simplified for brevity, usually distinct
      // Better to make it look like a PluginArray
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

    // 3. Ensure languages exist
    if (!navigator.languages || navigator.languages.length === 0) {
      Object.defineProperty(navigator, 'languages', {
        get: () => ['zh-CN', 'zh', 'en'],
        configurable: true
      });
    }

    // 4. WebGL Vendor/Renderer
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

    // 5. Mock window.chrome
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

    // 6. Mock navigator.permissions
    if (navigator.permissions) {
      const originalQuery = navigator.permissions.query;
      navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: Notification.permission, onchange: null }) :
          originalQuery(parameters)
      );
    }

    // 7. Ensure User-Agent consistency in Main World
    // Use the SAME hardcoded UA as in main.ts
    // Note: We hardcode it here to avoid import issues in the preload script
    const newUA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    
    Object.defineProperty(navigator, 'userAgent', {
      get: () => newUA,
      configurable: true
    });

    // 8. Mock maxTouchPoints
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
