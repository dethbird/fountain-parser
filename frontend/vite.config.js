import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../public/assets',
    emptyOutDir: true,
    manifest: true,
    rollupOptions: {
      // Make the preview worker an explicit entry so Rollup emits it as a standalone bundle
      input: {
        main: path.resolve(__dirname, 'src/main.jsx'),
        previewWorker: path.resolve(__dirname, 'src/workers/previewWorker.js')
      },
      output: {
        // include entry name to avoid collisions when there are multiple entries
        entryFileNames: '[name]-[hash].js',
        chunkFileNames: 'chunk-[hash].js',
        assetFileNames: 'asset-[hash].[ext]'
      }
    }
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://fountain',
        changeOrigin: true
      }
    }
  }
})