import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('@tabler/icons-react')) {
              return 'icons'
            }
            if (id.includes('react-router-dom')) {
              return 'router'
            }
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react'
            }
            if (id.includes('maplibre-gl') || id.includes('react-map-gl') || id.includes('@vis.gl')) {
              return 'maps'
            }
            if (id.includes('date-fns')) {
              return 'date'
            }
            return 'vendor'
          }
        }
      }
    }
  }
})