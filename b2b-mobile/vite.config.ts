import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

const mobileDir = fileURLToPath(new URL('.', import.meta.url))
const packageJson = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }

export default defineConfig({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version)
  },
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
