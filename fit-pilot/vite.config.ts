import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  server: {
    port: 5174,
    proxy: {
      // This MUST exactly match the prefix in your fetch() call
      '/api-anthropic': {
        target: 'https://api.anthropic.com',
        changeOrigin: true,
        // CRITICAL FIX: Forces the Vite node server proxy agent 
        // to handle and resolve 302s internally rather than passing them to the browser
        followRedirects: true, 
        // This strips '/api-anthropic' out before sending it to Anthropic
        rewrite: (path) => path.replace(/^\/api-anthropic/, ''),
      },
    },
  },
  envPrefix: ['VITE_'],
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
