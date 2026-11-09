import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.yamansarulman.b2b',
  appName: 'Yamansa Rulman B2B',
  webDir: 'dist',
  backgroundColor: '#0b2a5b',
  ios: {
    includePlugins: [
      '@aparajita/capacitor-secure-storage',
      '@capacitor/app',
      '@capacitor/app-launcher',
      '@capacitor/network',
      '@capacitor/keyboard'
    ]
  },
  plugins: {
    CapacitorUpdater: {
      autoUpdate: false
    }
  },
  android: {
    includePlugins: [
      '@aparajita/capacitor-secure-storage',
      '@capacitor/app',
      '@capacitor/app-launcher',
      '@capacitor/network',
      '@capawesome/capacitor-app-update',
      '@capgo/capacitor-updater'
    ],
    allowMixedContent: false
  }
}

export default config
