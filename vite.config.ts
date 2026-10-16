import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'logo.jpg'],
        manifest: {
          id: '/',
          name: 'THCS ĐỒNG ĐEN - Quản lý Liên đội',
          short_name: 'Liên đội',
          description: 'Hệ thống quản lý thi đua, nề nếp Liên đội THCS Đồng Đen.',
          theme_color: '#2563eb',
          background_color: '#f8fafc',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/logo.jpg',
              sizes: '192x192',
              type: 'image/jpeg',
              purpose: 'any',
            },
            {
              src: '/logo.jpg',
              sizes: '512x512',
              type: 'image/jpeg',
              purpose: 'any',
            },
            {
              src: '/logo.jpg',
              sizes: '512x512',
              type: 'image/jpeg',
              purpose: 'maskable',
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
