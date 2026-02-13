import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { visualizer } from "rollup-plugin-visualizer";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    visualizer({
      open: false, // Set to true to auto-open report after build
      gzipSize: true,
      brotliSize: true,
      filename: "./dist/stats.html",
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Output directory (ready for CDN upload)
    outDir: "dist",
    assetsDir: "assets",
    
    // Asset optimization for CDN
    assetsInlineLimit: 4096, // Inline assets < 4kb as base64
    cssCodeSplit: true, // Split CSS for better caching
    minify: "esbuild", // Fast minification
    
    rollupOptions: {
      output: {
        // Manual chunks for optimal caching (CDN-friendly)
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "ui-vendor": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-select",
            "@radix-ui/react-tabs",
            "@radix-ui/react-tooltip",
          ],
          "query-vendor": ["@tanstack/react-query"],
          "chart-vendor": [
            "recharts",
            "d3-selection",
            "d3-transition",
            "d3-zoom",
          ],
        },
        // Asset naming with hash for cache busting (CDN requirement)
        entryFileNames: "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]",
      },
    },
    
    // Chunk size warnings
    chunkSizeWarningLimit: 1000,
    
    // Disable sourcemaps in production (smaller bundle, faster CDN delivery)
    sourcemap: false,
    
    // Enable reporting for bundle analysis
    reportCompressedSize: true,
    
    // Skip TypeScript type checking during build (use tsc separately)
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    allowedHosts: ["echoic-nonexactingly-sherril.ngrok-free.dev"],
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
