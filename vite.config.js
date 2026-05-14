import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    // Bundle analyzer only runs on production build — keeps `vite` dev startup light
    ...(command === 'build'
      ? [visualizer({ filename: 'dist/stats.html', open: false, gzipSize: true })]
      : []),
  ],
  build: {
    rollupOptions: {
      output: {
        // manualChunks must be a function in Rolldown (Vite 8+)
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'react-vendor';
          }
          if (id.includes('node_modules/@supabase')) {
            return 'supabase';
          }
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
  server: {
    port: 5173,
    strictPort: false,
  },
}))
