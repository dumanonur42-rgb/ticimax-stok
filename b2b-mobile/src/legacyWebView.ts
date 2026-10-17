import { AppLauncher } from '@capacitor/app-launcher'

const playStoreUrl = 'https://play.google.com/store/apps/details?id=com.google.android.webview'
const marketUrl = 'market://details?id=com.google.android.webview'

const button = document.getElementById('legacy-webview-update-button')
if (button) button.addEventListener('click', () => {
  void AppLauncher.openUrl({ url: marketUrl }).catch(() =>
    AppLauncher.openUrl({ url: playStoreUrl }).catch(() => {
      window.location.href = playStoreUrl
    })
  )
})
