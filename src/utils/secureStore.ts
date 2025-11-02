import { Stronghold } from '@tauri-apps/plugin-stronghold'

const SNAPSHOT_PATH = 'app' // use app default snapshot path managed by plugin
const SNAPSHOT_PASSWORD = 'pcmanagement' // consider moving to a safer input or OS keyring
const CLIENT_NAME = 'auth'

let storePromise: Promise<import('@tauri-apps/plugin-stronghold').Store> | null = null

async function getStore() {
  if (!storePromise) {
    storePromise = (async () => {
      const sh = await Stronghold.load(SNAPSHOT_PATH, SNAPSHOT_PASSWORD)
      const client = await sh.createClient(CLIENT_NAME)
      return client.getStore()
    })()
  }
  return storePromise
}

const VAULT_TOKEN = 'access_token'
const VAULT_REFRESH = 'refresh_token'

export async function setTokens(token: string, refreshToken?: string) {
  const store = await getStore()
  const enc = new TextEncoder()
  await store.insert(VAULT_TOKEN, Array.from(enc.encode(token)))
  if (refreshToken) {
    await store.insert(VAULT_REFRESH, Array.from(enc.encode(refreshToken)))
  }
}

export async function getToken(): Promise<string | null> {
  const store = await getStore()
  const data = await store.get(VAULT_TOKEN)
  return data ? new TextDecoder().decode(Uint8Array.from(data)) : null
}

export async function getRefreshToken(): Promise<string | null> {
  const store = await getStore()
  const data = await store.get(VAULT_REFRESH)
  return data ? new TextDecoder().decode(Uint8Array.from(data)) : null
}

export async function clearTokens() {
  const store = await getStore()
  await store.remove(VAULT_TOKEN)
  await store.remove(VAULT_REFRESH)
}


