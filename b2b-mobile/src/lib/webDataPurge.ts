import { registerPlugin, WebPlugin } from '@capacitor/core'

interface WebDataPurgePlugin {
  purge(): Promise<void>
}

class WebDataPurgeWeb extends WebPlugin implements WebDataPurgePlugin {
  async purge(): Promise<void> {}
}

export const webDataPurge = registerPlugin<WebDataPurgePlugin>('WebDataPurge', {
  web: () => Promise.resolve(new WebDataPurgeWeb())
})
