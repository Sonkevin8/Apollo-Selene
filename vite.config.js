import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
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