import { Store } from '@tauri-apps/plugin-store'
import AES from 'crypto-js/aes'
import Utf8 from 'crypto-js/enc-utf8'

const SECURE_PREFIX = 'enc:v1:'
const SECURE_SECRET = 'monarch-edge-console::secure-store-v1'

let storeInstance: Store | null = null

async function getStore() {
  if (!storeInstance) {
    // v2 API: 必须使用 Store.load 返回带资源 id 的实例
    storeInstance = await Store.load('.auth.store')
  }
  return storeInstance
}

function serializeValue(value: unknown, asJson: boolean): string {
  if (asJson) {
    return JSON.stringify(value ?? null)
  }
  if (typeof value === 'string') {
    return value
  }
  return JSON.stringify(value ?? null)
}

function deserializeValue<T = any>(text: string, asJson: boolean): T | string | null {
  if (!asJson) return text
  if (!text) return null
  return JSON.parse(text) as T
}

function encryptText(text: string): string {
  return `${SECURE_PREFIX}${AES.encrypt(text, SECURE_SECRET).toString()}`
}

function decryptText(value: string): string {
  if (!value.startsWith(SECURE_PREFIX)) {
    return value
  }
  const encrypted = value.slice(SECURE_PREFIX.length)
  const decrypted = AES.decrypt(encrypted, SECURE_SECRET).toString(Utf8)
  if (!decrypted) {
    throw new Error('Failed to decrypt secure store value')
  }
  return decrypted
}

// 通用：写入
export async function setItem(key: string, value: unknown, opts?: { asJson?: boolean }) {
  const store = await getStore()
  if (opts?.asJson ?? true) {
    await store.set(key, value ?? null)
  } else {
    await store.set(key, serializeValue(value, false))
  }
  await store.save()
}

// 安全写入：对字符串/JSON 做 AES 加密后再保存
export async function setEncryptedItem(key: string, value: unknown, opts?: { asJson?: boolean }) {
  const store = await getStore()
  const plaintext = serializeValue(value, opts?.asJson ?? true)
  await store.set(key, encryptText(plaintext))
  await store.save()
}

// 通用：读取
export async function getItem<T = any>(key: string, opts?: { asJson?: boolean }): Promise<T | string | null> {
  const store = await getStore()
  const data = await store.get<T | string | null>(key)
  if (data === undefined || data === null) return null
  return data as any
}

// 安全读取：兼容旧明文数据，首次读取后可由调用方重新写回加密态
export async function getEncryptedItem<T = any>(
  key: string,
  opts?: { asJson?: boolean },
): Promise<T | string | null> {
  const store = await getStore()
  const data = await store.get<T | string | null>(key)
  if (data === undefined || data === null) return null
  if (typeof data !== 'string') {
    return data as any
  }

  const decrypted = decryptText(data)
  return deserializeValue<T>(decrypted, opts?.asJson ?? true)
}

// 通用：删除
export async function removeItem(key: string) {
  const store = await getStore()
  await store.delete(key)
  await store.save()
}

