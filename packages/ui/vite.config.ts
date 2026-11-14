import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const veryaPort = process.env.VERYA_PORT || '3111'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/api': `http://localhost:${veryaPort}`,
      '/ws': { target: `ws://localhost:${veryaPort}`, ws: true },
    }
  },
  build: {
    outDir: 'dist',
  }
})
