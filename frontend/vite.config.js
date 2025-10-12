import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

// https://vitejs.dev/config/
// Use function form to set a different base for dev (serve) vs build
export default defineConfig(({ command }) => {
  const isServe = command === 'serve'
  return {
    // Runtime base: serve from root in dev, use /assets/ in production builds
    base: isServe ? '/' : '/assets/',
    plugins: [react()],
    build: {
      // Emit static assets directly into the outDir root (no nested 'assets/' folder).
      assetsDir: '',
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
      host: '0.0.0.0',
      port: 3000,
      strictPort: true,
      // Only attempt to read the local dev key/cert when running the dev server.
      // Reading them unconditionally at config-parse time causes EACCES when
      // the build process doesn't have permission to open the files.
      https: isServe
        ? (() => {
            try {
              return {
                key: fs.readFileSync('/etc/ssl/localdev/fountain-dev.key'),
                cert: fs.readFileSync('/etc/ssl/localdev/fountain-dev.pem'),
              }
            } catch (err) {
              // Don't throw here; fall back to non-HTTPS dev server and warn.
              // Keep the build from failing if the files are unreadable.
              // eslint-disable-next-line no-console
              console.warn('[vite.config] Could not read local SSL key/cert:', err && err.message ? err.message : err)
              return undefined
            }
          })()
        : undefined,
      proxy: {
        '/api': {
          target: 'http://fountain',
          changeOrigin: true
        }
      }
    }
  }
})