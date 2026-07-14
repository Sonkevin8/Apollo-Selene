import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/clerk': {
        target: 'https://clerk.apollo-selene.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/clerk/, ''),
      },
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      onwarn(warning, defaultHandler) {
        const isReactRouterDirectiveWarning =
          warning.code === 'MODULE_LEVEL_DIRECTIVE' &&
          /node_modules[\\/](react-router|react-router-dom)[\\/]/.test(warning.id || '');

        if (isReactRouterDirectiveWarning) {
          return;
        }

        defaultHandler(warning);
      },
    },
  },
});