import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),

    // [Kriteria 3 - Basic/Skilled/Advance] PWA Setup dengan Workbox
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.ico',
        'icons/apple-touch-icon.png',
        'icons/icon-192x192.png',
        'icons/icon-512x512.png',
      ],

      // [Skilled] Manifest valid agar tombol Install / Add to Home Screen muncul
      manifest: {
        name: 'RootFacts – Vegetable Fun Facts',
        short_name: 'RootFacts',
        description: 'Scan sayuran & dapatkan fun fact unik via TensorFlow.js + Transformers.js',
        theme_color: '#16a34a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: 'icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: 'icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: 'icons/apple-touch-icon.png',
            sizes: '180x180',
            type: 'image/png',
          },
        ],
      },

      // Workbox strategy + runtime caching
      workbox: {
        // [Basic] Precache aset inti (HTML, CSS, JS) — semua build output
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],

        // [Advance] Precache berkas model AI agar deteksi tetap jalan offline
        additionalManifestEntries: [
          { url: '/model/model.json', revision: null },
          { url: '/model/metadata.json', revision: null },
          { url: '/model/weights.bin', revision: null },
        ],

        // Runtime caching untuk model Transformers.js yang diunduh dari HuggingFace CDN
        runtimeCaching: [
          {
            // [Advance] Cache model Transformers.js dari HuggingFace
            urlPattern: /^https:\/\/huggingface\.co\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'hf-model-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 30 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // [Advance] Cache CDN alternatif Transformers.js (cdn-lfs, etc.)
            urlPattern: /^https:\/\/cdn-lfs.*\.huggingface\.co\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'hf-lfs-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 30 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],

        // Izinkan file besar (weights.bin ~2MB)
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10 MB
      },
    }),
  ],

  server: {
    port: 3001,
    host: true,
  },

  build: {
    // TF.js + Transformers.js WASM memang besar — suppress warning yang tidak relevan
    chunkSizeWarningLimit: 25000,
  },
});

