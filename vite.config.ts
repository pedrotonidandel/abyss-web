import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8')) as { version: string }

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    // Node.js built-in polyfills required by WebTorrent (Buffer, process, stream, crypto, etc.)
    nodePolyfills({
      include: ['buffer', 'process', 'stream', 'util', 'events', 'path', 'os', 'crypto'],
      globals: { Buffer: true, global: true, process: true },
    }),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'icon-512-maskable.png'],
      manifest: {
        name: 'Abyss',
        short_name: 'Abyss',
        description: 'Seu hub de entretenimento',
        theme_color: '#111720',
        background_color: '#111720',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
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
  resolve: {
    alias: {
      // Use WebTorrent's pre-built browser bundle instead of bundling from source.
      // The source tree pulls in Node.js-only deps (bittorrent-dht, MSE/RC4 native crypto, etc.)
      // that can't be compiled for browser. The dist bundle is already resolved for browser/WebRTC use.
      'webtorrent': resolve(__dirname, 'node_modules/webtorrent/dist/webtorrent.min.js'),
    },
  },
})
