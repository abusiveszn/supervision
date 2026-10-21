import base44 from "@base44/vite-plugin"
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// Helper to silence the [base44] Proxy enabled terminal output
function silenceBase44ProxyLog(plugins) {
  for (const plugin of plugins) {
    if (plugin?.name === 'base44' && typeof plugin.config === 'function') {
      const originalConfig = plugin.config;
      plugin.config = function (...args) {
        const originalLog = console.log;
        console.log = (...logArgs) => {
          if (typeof logArgs[0] === 'string' && logArgs[0].includes('[base44] Proxy enabled:')) {
            return;
          }
          originalLog.apply(console, logArgs);
        };
        try {
          const result = originalConfig.apply(this, args);
          if (result && typeof result.then === 'function') {
            return result.finally(() => {
              console.log = originalLog;
            });
          }
          console.log = originalLog;
          return result;
        } catch (err) {
          console.log = originalLog;
          throw err;
        }
      };
    }
  }
  return plugins;
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      silenceBase44ProxyLog(
        base44({
          // Support for legacy code that imports the base44 SDK with @/integrations, @/entities, etc.
          // can be removed if the code has been updated to use the new SDK imports from @base44/sdk
          legacySDKImports: process.env.BASE44_LEGACY_SDK_IMPORTS === 'true',
          hmrNotifier: false,
          navigationNotifier: false,
          analyticsTracker: false,
          visualEditAgent: false
        })
      ),
      react(),
    ]
  }
});
