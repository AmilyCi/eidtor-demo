import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 8081,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/onlyoffice': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/onlyoffice/, '')
      },
      '/web-apps': {
        target: 'http://localhost:8080',
        changeOrigin: true
      },
      '/examples': {
        target: 'http://localhost:8080',
        changeOrigin: true
      },
      '/cache': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  }
})
