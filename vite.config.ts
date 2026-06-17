import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    watch: {
      ignored: [
        "**/backend/vendor/**",
        "**/backend/storage/**",
        "**/backend/bootstrap/cache/**",
        "**/backend/public/uploads/**",
        "**/dist/**",
        "**/.git/**",
      ],
    },
  },
  // Remove console logs and debugger statements in production builds
  esbuild: {
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },
  define: {
    __APP_BUILD_VERSION__: JSON.stringify(process.env.APP_BUILD_VERSION || "dev"),
  },
  plugins: [
    react(), 
    mode === "development" && componentTagger(),
    mode === "production" && VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.ico'],
      manifest: {
        name: 'Cerrajero Pro Express',
        short_name: 'Cerrajero Pro',
        description: 'Sistema completo de gestión para cerrajería',
        theme_color: '#1e40af',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallbackDenylist: [
          /\/php(?:\/|$)/,
          /\/api(?:\/|$)/,
          /\/install(?:\/|$)/,
          /\/up(?:\/|$)/,
        ],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: "es2020",
    cssCodeSplit: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "query": ["@tanstack/react-query"],
          "motion": ["framer-motion"],
          "forms": ["react-hook-form", "@hookform/resolvers", "zod"],
          "radix": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-popover",
            "@radix-ui/react-select",
            "@radix-ui/react-tabs",
            "@radix-ui/react-tooltip",
            "@radix-ui/react-toast",
          ],
          "icons": ["lucide-react"],
        },
      },
    },
    chunkSizeWarningLimit: 800,
  },
}));
