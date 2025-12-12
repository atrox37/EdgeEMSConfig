import { Store } from '@tauri-apps/plugin-store'
let storeInstance: Store | null = null
async function getStore() {
  if (!storeInstance) {
    // v2 API: 必须使用 Store.load 返回带资源 id 的实例
    storeInstance = await Store.load('.auth.store')
  }
  return storeInstance
}

function encodeValue(value: unknown, asJson: boolean): number[] {
  const enc = new TextEncoder()
  if (asJson) {
    const json = JSON.stringify(value ?? null)
    return Array.from(enc.encode(json))
  }
  if (typeof value === 'string') {
    return Array.from(enc.encode(value))
  }
  // 兜底：按 JSON 存
  const json = JSON.stringify(value ?? null)
  return Array.from(enc.encode(json))
}

function decodeValue<T = any>(bytes: number[], asJson: boolean): T | string | null {
  if (!bytes) return null
  try {
    const text = new TextDecoder().decode(Uint8Array.from(bytes))
    if (asJson) {
      return (text ? JSON.parse(text) : null) as T
    }
    return text
  } catch {
    return null
  }
}

// 通用：写入
export async function setItem(key: string, value: unknown, opts?: { asJson?: boolean }) {
  const store = await getStore()
  if (opts?.asJson ?? true) {
    await store.set(key, value ?? null)
  } else {
    const text = typeof value === 'string' ? value : String(value ?? '')
    await store.set(key, text)
  }
  await store.save()
}

// 通用：读取
export async function getItem<T = any>(key: string, opts?: { asJson?: boolean }): Promise<T | string | null> {
  const store = await getStore()
  const data = await store.get<T | string | null>(key)
  if (data === undefined) return null
  return (data as any) ?? null
}

// 通用：删除
export async function removeItem(key: string) {
  const store = await getStore()
  await store.delete(key)
  await store.save()
}


