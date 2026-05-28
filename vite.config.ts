import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'Abyss',
        short_name: 'Abyss',
        description: 'Seu hub de entretenimento',
        theme_color: '#111111',
        background_color: '#0d0d0d',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/image\.tmdb\.org\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'tmdb-images', expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 } },
          },
        ],
      },
    }),
  ],
})
