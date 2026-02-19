import { StorageAdapters } from "./store"
import * as Security from "./security"
import { deepClone } from "./utils"
import type { StoreConfig, PersistOptions } from "./types"
import { produce as _immerProduce, freeze as _immerFreeze } from 'immer'

/**
 * Enterprise-grade persistence layer for RGS store.
 * Handles serialization, encryption, and storage adapter abstraction.
 */

// Helper to get prefix
const _getPrefix = (namespace: string) => `${namespace}_`

export interface PersistenceContext {
  store: Map<string, unknown>
  versions: Map<string, number>
  sizes: Map<string, number>
  totalSize: number
  storage: ReturnType<typeof StorageAdapters.local>
  config: StoreConfig<Record<string, unknown>>
  diskQueue: Map<string, { value: unknown, options: PersistOptions }>
  encryptionKey: Security.EncryptionKey | null
  audit: (action: 'set' | 'get' | 'delete' | 'hydrate', key: string, success: boolean, error?: string) => void
  onError?: (error: Error, metadata?: Record<string, unknown>) => void
  silent: boolean
  debounceTime: number
  currentVersion: number
}


/**
 * Flushes the disk queue to persistent storage.
 */
export const flushDisk = async (ctx: PersistenceContext) => {
  if (!ctx.storage) return

  const { store, config, diskQueue, storage, encryptionKey, audit, onError, silent, currentVersion } = ctx
  const prefix = _getPrefix(config.namespace || 'gstate')

  // Save entire state under namespace key for simpler loading if needed by some adapters
  // This logic seems redundant if we save individual keys, but was in original store. keeping for compatibility.
  try {
    const stateObj: Record<string, unknown> = {}
    store.forEach((v, k) => { stateObj[k] = v })

    let dataValue: unknown
    const isEncoded = config?.encoded
    if (isEncoded) {
      dataValue = btoa(JSON.stringify(stateObj))
    } else {
      dataValue = JSON.stringify(stateObj)
    }

    storage.setItem(prefix.replace('_', ''), JSON.stringify({
      v: 1, t: Date.now(), e: null,
      d: dataValue, _sys_v: currentVersion, _b64: isEncoded ? true : undefined
    }))
    audit('set', 'FULL_STATE', true)
  } catch (e) {
    const error = e instanceof Error ? e : new Error(String(e))
    if (onError) onError(error, { operation: 'persist', key: 'FULL_STATE' })
    else if (!silent) console.error(`[gState] Persist failed: `, error)
  }

  const queue = Array.from(diskQueue.entries()); diskQueue.clear()
  for (const [key, data] of queue) {
    try {
      let dataValue: unknown = data.value
      const isEncoded = data.options.encoded || data.options.secure
      if (data.options.encrypted) {
        if (!encryptionKey) throw new Error(`Encryption key missing for "${key}"`)
        dataValue = await Security.encrypt(data.value, encryptionKey)
      } else if (isEncoded) {
        dataValue = btoa(JSON.stringify(data.value))
      } else if (typeof data.value === 'object' && data.value !== null) {
        dataValue = JSON.stringify(data.value)
      }

      storage.setItem(`${prefix}${key}`, JSON.stringify({
        v: (ctx.versions.get(key) || 1), t: Date.now(), e: data.options.ttl ? Date.now() + data.options.ttl : null,
        d: dataValue, _sys_v: currentVersion, _enc: data.options.encrypted ? true : undefined, _b64: isEncoded ? true : undefined
      }))
      audit('set', key, true)
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e))
      if (onError) onError(error, { operation: 'persist', key })
      else if (!silent) console.error(`[gState] Persist failed: `, error)
    }
  }
}

/**
 * Hydrates the store from persistent storage.
 */
export const hydrateStore = async (
  ctx: PersistenceContext,
  calculateSize: (val: unknown) => number,
  emit: () => void
): Promise<void> => {
  const { storage, config, encryptionKey, audit, onError, silent, currentVersion, store, sizes, versions } = ctx
  const prefix = _getPrefix(config.namespace || 'gstate')
  const immer = config.immer ?? true

  if (!storage) return

  try {
    const persisted: Record<string, unknown> = {}
    let savedV = 0
    for (let i = 0; i < (storage.length || 0); i++) {
      const k = storage.key(i)
      if (!k || !k.startsWith(prefix)) continue
      const raw = storage.getItem(k)
      if (!raw) continue
      try {
        const meta = JSON.parse(raw), key = k.substring(prefix.length)

        // Version fallback for older stores where _sys_v was v
        savedV = Math.max(savedV, meta._sys_v !== undefined ? meta._sys_v : (meta.v || 0))

        if (meta.e && Date.now() > meta.e) { storage.removeItem(k); i--; continue }
        let d = meta.d
        if (meta._enc && encryptionKey) {
          d = await Security.decrypt(d, encryptionKey)
        } else if (typeof d === "string") {
          if (meta._b64) { try { d = JSON.parse(atob(d)) } catch (_e) { } }
          else if (d.startsWith("{") || d.startsWith("[")) { try { d = JSON.parse(d) } catch (_e) { } }
        }
        persisted[key] = d; audit('hydrate', key, true)
      } catch (err) {
        audit('hydrate', k, false, String(err))
        const error = err instanceof Error ? err : new Error(String(err))
        if (onError) onError(error, { operation: 'hydration', key: k })
        else if (!silent) console.error(`[gState] Hydration failed for "${k}": `, err)
      }
    }
    const final = (savedV < currentVersion && config.migrate) ? config.migrate(persisted, savedV) : persisted

    Object.entries(final).forEach(([k, v]) => {
      // Re-freeze loaded state if immer is enabled
      const frozen = (immer && v !== null && typeof v === 'object') ? _immerFreeze(deepClone(v as object), true) : v

      const size = calculateSize(frozen)
      const oldSize = sizes.get(k) || 0
      ctx.totalSize = ctx.totalSize - oldSize + size
      sizes.set(k, size)
      store.set(k, frozen); versions.set(k, 1)
    })
    emit()
  } catch (e) {
    const error = e instanceof Error ? e : new Error(String(e))
    if (onError) onError(error, { operation: 'hydration' })
    else if (!silent) console.error(`[gState] Hydration failed: `, error)
  }
}
