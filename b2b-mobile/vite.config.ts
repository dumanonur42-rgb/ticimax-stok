import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

const mobileDir = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@shared': fileURLToPath(new URL('../b2b-app/src/shared', import.meta.url)),
      '@desktopConfig': fileURLToPath(new URL('../b2b-app/src/main/cloud/config.ts', import.meta.url)),
      '@desktopDatabase': fileURLToPath(new URL('../b2b-app/src/main/cloud/database.types.ts', import.meta.url))
    }
  },
  server: {
    fs: {
      allow: [mobileDir, fileURLToPath(new URL('../b2b-app/src/shared', import.meta.url)), fileURLToPath(new URL('../b2b-app/src/main/cloud', import.meta.url))]
    }
  }
})
