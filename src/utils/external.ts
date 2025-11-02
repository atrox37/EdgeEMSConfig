import { openUrl } from '@tauri-apps/plugin-opener'

export async function openExternal(url: string) {
  await openUrl(url)
}


