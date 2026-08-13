import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
function versionManifestPlugin(buildVersion: string): Plugin {
  return {
    name: "emit-version-manifest",
    apply: "build",
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "version.json",
        source: JSON.stringify({ version: buildVersion, buildTime: new Date().toISOString() }, null, 2),
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const buildVersion =
    process.env.APP_BUILD_VERSION ||
    (mode === "production" ? `build-${Date.now().toString(36)}` : "dev");

  return {
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
    __APP_BUILD_VERSION__: JSON.stringify(buildVersion),
  },
  plugins: [
    react(), 
    mode === "development" && componentTagger(),
    versionManifestPlugin(buildVersion),
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
  };
});
