import { defineConfig } from '@vben/vite-config';

export default defineConfig(async () => {
  return {
    application: {},
    vite: {
      resolve: {
        // Workspace packages can resolve separate peer instances. Router
        // injection keys must come from the same instance in production too.
        dedupe: ['vue-router'],
      },
      server: {
        proxy: {
          '/api': {
            changeOrigin: true,
            configure(proxy) {
              // Browser -> Vite is same-origin. This server-to-server hop does
              // not need the browser Origin, which varies with the LAN address.
              proxy.on('proxyReq', (proxyRequest) => {
                proxyRequest.removeHeader('origin');
              });
            },
            target: 'http://127.0.0.1:8080',
            ws: true,
          },
        },
      },
    },
  };
});
