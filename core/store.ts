// Lazy Immer loader - only loads when immer: true (default)
// Initialize once at store creation if needed
let _immerProduce: ((state: unknown, fn: (draft: unknown) => void) => unknown) | null = null
let _immerFreeze: (<T>(value: T, deep?: boolean) => T) | null = null

const _ensureImmer = () => {
  if (!_immerProduce) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const immer = require('immer')
      _immerProduce = immer.produce
      _immerFreeze = immer.freeze
    } catch (e) {
      console.error('[gState] Immer not installed. Run: npm install immer')
      throw e
    }
  }
}

import * as Security from "./security"
import type {
  IStore, StoreConfig, PersistOptions, StoreSubscriber,
  ComputedSelector, WatcherCallback, IPlugin, PluginHookName,
  PluginContext, Middleware, CustomStorage, GStatePlugins
} from './types'

/**
 * Enterprise Storage Adapters
 */
export const StorageAdapters = {
  local: (): CustomStorage | null => (typeof window !== "undefined" ? window.localStorage : null),
  session: (): CustomStorage | null => (typeof window !== "undefined" ? window.sessionStorage : null),
  memory: (): CustomStorage => {
    const _m = new Map<string, string>()
    return {
      getItem: (k: string) => _m.get(k) || null,
      setItem: (k: string, v: string) => _m.set(k, v),
      removeItem: (k: string) => _m.delete(k),
      key: (i: number) => Array.from(_m.keys())[i] || null,
      get length() { return _m.size }
    }
  }
}

/**
 * Deep clone using structuredClone (native) with fallback.
 * Handles circular references safely.
 * @param obj - Object to clone
 * @returns Deep cloned object
 */
/**
 * Deep clone using structuredClone (native) with fallback.
 * Handles circular references safely and preserves common types.
 * @param obj - Object to clone
 * @returns Deep cloned object
 */
const deepClone = <T>(obj: T): T => {
  if (obj === null || typeof obj !== 'object') return obj

  // Optimization: use native structuredClone if available
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(obj)
    } catch (_e) {
      // Fallback for non-serializable objects (functions, prototypes, etc.)
    }
  }

  const seen = new WeakMap<object, unknown>()

  const clone = <V>(value: V): V => {
    if (value === null || typeof value !== 'object') return value
    if (typeof value === 'function') return value as unknown as V // Functions cannot be deep cloned easily

    // Check for circular references
    if (seen.has(value as object)) return seen.get(value as object) as V

    if (value instanceof Date) return new Date(value.getTime()) as unknown as V
    if (value instanceof RegExp) return new RegExp(value.source, value.flags) as unknown as V
    if (value instanceof Map) {
      const result = new Map()
      seen.set(value as object, result)
      value.forEach((v, k) => result.set(clone(k), clone(v)))
      return result as unknown as V
    }
    if (value instanceof Set) {
      const result = new Set()
      seen.set(value as object, result)
      value.forEach((v) => result.add(clone(v)))
      return result as unknown as V
    }

    // Handle Plain Objects and Arrays
    const result: any = Array.isArray(value)
      ? []
      : Object.create(Object.getPrototypeOf(value))

    seen.set(value as object, result)

    const keys = [...Object.keys(value as object), ...Object.getOwnPropertySymbols(value as object)]
    for (const key of keys) {
      result[key] = clone((value as any)[key])
    }

    return result as V
  }

  return clone(obj)
}

/**
 * Compares two values for deep equality.
 * @param a - First value
 * @param b - Second value
 * @returns True if values are equal
 */
const isEqual = (a: unknown, b: unknown): boolean => {
  if (a === b) return true
  if (a === null || b === null) return a === b
  if (typeof a !== 'object' || typeof b !== 'object') return a === b
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) if (!isEqual(a[i], b[i])) return false
    return true
  }
  const keysA = Object.keys(a), keysB = Object.keys(b)
  if (keysA.length !== keysB.length) return false
  for (const key of keysA) {
    if (!keysB.includes(key)) return false
    if (!isEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])) return false
  }
  return true
}

/**
 * Creates an enterprise-grade state management store.
 */
export const createStore = <S extends Record<string, unknown> = Record<string, unknown>>(config?: StoreConfig<S>): IStore<S> => {
  const
    _store = new Map<string, unknown>(),
    _versions = new Map<string, number>(),
    _sizes = new Map<string, number>(), // Internal cache for key sizes
    _listeners = new Set<StoreSubscriber>(),
    _keyListeners = new Map<string, Set<StoreSubscriber>>(),
    _middlewares = new Set<Middleware>(),
    _watchers = new Map<string, Set<WatcherCallback<unknown>>>(),
    _computed = new Map<string, { selector: ComputedSelector<unknown>, lastValue: unknown, deps: Set<string> }>(),
    _computedDeps = new Map<string, Set<string>>(),
    _plugins = new Map<string, IPlugin<S>>(),
    _diskQueue = new Map<string, { value: unknown, options: PersistOptions }>(),
    _regexCache = new Map<string, RegExp>(), // Performance: Cache for RBAC regexes

    // Multi-store isolation for Security
    _accessRules: Security.AccessRulesMap = new Map(),
    _consents: Security.ConsentsMap = new Map(),

    _namespace = config?.namespace || "gstate",
    _silent = config?.silent ?? false,
    _debounceTime = config?.debounceTime ?? 150,
    _currentVersion = config?.version ?? 0,
    _storage = config?.storage || StorageAdapters.local(),
    _onError = config?.onError,
    _maxObjectSize = config?.maxObjectSize ?? (5 * 1024 * 1024),
    _maxTotalSize = config?.maxTotalSize ?? (50 * 1024 * 1024),
    _encryptionKey = config?.encryptionKey ?? null,
    _validateInput = config?.validateInput ?? true,
    _auditEnabled = config?.auditEnabled ?? true,
    _userId = config?.userId,
    _immer = config?.immer ?? true

  // Pre-load Immer if enabled (avoids per-operation overhead)
  if (_immer) {
    _ensureImmer()
  }

  if (config?.accessRules) {
    config.accessRules.forEach(rule => Security.addAccessRule(_accessRules, rule.pattern, rule.permissions))
  }

  let
    _isTransaction = false, _pendingEmit = false, _isReady = false, _totalSize = 0,
    _diskTimer: ReturnType<typeof setTimeout> | null = null

  let _readyResolver: () => void
  const _readyPromise = new Promise<void>(resolve => { _readyResolver = resolve })

  /**
   * Enterprise-grade iterative walker for precise memory estimation.
   * Faster than JSON.stringify and handles circular references accurately.
   * @param val - Value to measure
   * @returns Size in bytes
   */
  const _calculateSize = (val: unknown): number => {
    if (val === null || val === undefined) return 0
    let bytes = 0
    const stack: unknown[] = [val]
    const seen = new WeakSet<object>()

    while (stack.length > 0) {
      const value = stack.pop()
      if (typeof value === 'boolean') {
        bytes += 4
      } else if (typeof value === 'number') {
        bytes += 8
      } else if (typeof value === 'string') {
        bytes += value.length * 2
      } else if (typeof value === 'object' && value !== null) {
        const obj = value as Record<string, unknown>
        if (seen.has(obj)) continue
        seen.add(obj)
        if (Array.isArray(obj)) {
          for (let i = 0; i < obj.length; i++) stack.push(obj[i])
        } else {
          for (const key of Object.keys(obj)) {
            bytes += key.length * 2
            stack.push(obj[key])
          }
        }
      }
    }
    return bytes
  }

  /**
 * Gets the storage key prefix for this namespace.
 * @returns Prefix string
 */
  const _getPrefix = () => `${_namespace}_`

  /**
 * Runs a plugin lifecycle hook.
 * @param name - Hook name to execute
 * @param context - Plugin context
 */
  const _runHook = (name: PluginHookName, context: PluginContext<S>) => {
    _plugins.forEach(p => {
      if (p.hooks?.[name]) {
        try { p.hooks[name]!(context) }
        catch (e) {
          const error = e instanceof Error ? e : new Error(String(e))
          if (_onError) _onError(error, { operation: `plugin:${p.name}:${name}`, key: context.key })
          else if (!_silent) console.error(`[gState] Plugin "${p.name}" error:`, e)
        }
      }
    })
  }

  /**
   * Records an audit log entry if auditing is enabled.
   * Optimized to skip processing if no audit logger is configured.
   */
  const _audit = (action: 'set' | 'get' | 'delete' | 'hydrate', key: string, success: boolean, error?: string) => {
    if (_auditEnabled && Security.isAuditActive() && Security.logAudit) {
      Security.logAudit({ timestamp: Date.now(), action, key, userId: _userId, success, error })
    }
  }

  /**
 * Emits change notifications to subscribers.
 * Handles computed values, watchers, and listeners.
 * @param changedKey - Optional key that changed
 */
  const _emit = (changedKey?: string) => {
    if (changedKey) {
      _computedDeps.get(changedKey)?.forEach(compKey => _updateComputed(compKey))
      _watchers.get(changedKey)?.forEach(w => {
        try { w(instance.get(changedKey)) }
        catch (e) {
          const error = e instanceof Error ? e : new Error(String(e))
          if (_onError) _onError(error, { operation: 'watcher', key: changedKey })
          else if (!_silent) console.error(`[gState] Watcher error for "${changedKey}":`, e)
        }
      })
      _keyListeners.get(changedKey)?.forEach(l => {
        try { l() }
        catch (e) {
          const error = e instanceof Error ? e : new Error(String(e))
          if (_onError) _onError(error, { operation: 'keyListener', key: changedKey })
          else if (!_silent) console.error(`[gState] Listener error for "${changedKey}":`, e)
        }
      })
    }
    if (_isTransaction) { _pendingEmit = true; return }
    _listeners.forEach(l => {
      try { l() }
      catch (e) {
        const error = e instanceof Error ? e : new Error(String(e))
        if (_onError) _onError(error, { operation: 'listener' })
        else if (!_silent) console.error(`[gState] Global listener error:`, e)
      }
    })
  }

  /**
 * Updates a computed value by running its selector.
 * @param key - Computed value key
 */
  const _updateComputed = (key: string) => {
    const comp = _computed.get(key), depsFound = new Set<string>()
    if (!comp) return
    const getter = <V>(k: string): V | null => { depsFound.add(k); return instance.get(k) as V | null }
    const newValue = comp.selector(getter)
    comp.deps.forEach(d => {
      if (!depsFound.has(d)) {
        const dependents = _computedDeps.get(d)
        if (dependents) { dependents.delete(key); if (dependents.size === 0) _computedDeps.delete(d) }
      }
    })
    depsFound.forEach(d => {
      if (!comp.deps.has(d)) {
        if (!_computedDeps.has(d)) _computedDeps.set(d, new Set())
        _computedDeps.get(d)!.add(key)
      }
    })
    comp.deps = depsFound
    if (!isEqual(comp.lastValue, newValue)) {
      comp.lastValue = (_immer && newValue !== null && typeof newValue === 'object') ? _immerFreeze!(deepClone(newValue), true) : newValue
      _versions.set(key, (_versions.get(key) || 0) + 1); _emit(key)
    }
  }

  /**
 * Flushes the disk queue to persistent storage.
 * Handles encryption and encoding.
 */
  const _flushDisk = async () => {
    if (!_storage) return

    // Save entire state under namespace key for simpler loading
    try {
      const stateObj: Record<string, unknown> = {}
      _store.forEach((v, k) => { stateObj[k] = v })

      let dataValue: unknown = stateObj
      const isEncoded = config?.encoded
      if (isEncoded) {
        dataValue = btoa(JSON.stringify(stateObj))
      } else {
        dataValue = JSON.stringify(stateObj)
      }

      _storage.setItem(_getPrefix().replace('_', ''), JSON.stringify({
        v: 1, t: Date.now(), e: null,
        d: dataValue, _sys_v: _currentVersion, _b64: isEncoded ? true : undefined
      }))
      _audit('set', 'FULL_STATE', true)
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e))
      if (_onError) _onError(error, { operation: 'persist', key: 'FULL_STATE' })
      else if (!_silent) console.error(`[gState] Persist failed:`, error)
    }

    const queue = Array.from(_diskQueue.entries()); _diskQueue.clear()
    for (const [key, data] of queue) {
      // Old individual key persistence (kept for backward compatibility)
      try {
        let dataValue: unknown = data.value
        const isEncoded = data.options.encoded || data.options.secure
        if (data.options.encrypted) {
          if (!_encryptionKey) throw new Error(`Encryption key missing for "${key}"`)
          dataValue = await Security.encrypt(data.value, _encryptionKey)
        } else if (isEncoded) {
          dataValue = btoa(JSON.stringify(data.value))
        } else if (typeof data.value === 'object' && data.value !== null) {
          dataValue = JSON.stringify(data.value)
        }

        _storage.setItem(`${_getPrefix()}${key}`, JSON.stringify({
          v: (_versions.get(key) || 1), t: Date.now(), e: data.options.ttl ? Date.now() + data.options.ttl : null,
          d: dataValue, _sys_v: _currentVersion, _enc: data.options.encrypted ? true : undefined, _b64: isEncoded ? true : undefined
        }))
        _audit('set', key, true)
      } catch (e) {
        const error = e instanceof Error ? e : new Error(String(e))
        if (_onError) _onError(error, { operation: 'persist', key })
        else if (!_silent) console.error(`[gState] Persist failed:`, error)
      }
    }
  }

  /**
   * Plugin namespace for safely storing plugin methods.
   * Prevents method name collisions with core store methods.
   */
  const _methodNamespace: Record<string, Record<string, unknown>> = {}

  const instance: IStore<S> = {
    /**
 * Sets a value in the store without triggering listeners or persistence.
 * Internal method for plugin/system use.
 * @param key - Store key
 * @param value - Value to set
 */
    _setSilently: (key: string, value: unknown) => {
      const oldSize = _sizes.get(key) || 0, frozen = (_immer && value !== null && typeof value === 'object') ? _immerFreeze!(deepClone(value), true) : value
      const newSize = _calculateSize(frozen)
      _totalSize = _totalSize - oldSize + newSize
      _sizes.set(key, newSize)
      _store.set(key, frozen); _versions.set(key, (_versions.get(key) || 0) + 1)
    },
    /**
 * Registers a custom method on the store instance.
 * @param name - Method name
 * @param fn - Method function
 */
    _registerMethod: (pluginNameOrName: string, methodNameOrFn: string | ((...args: unknown[]) => unknown), fn?: (...args: unknown[]) => unknown) => {
      // PRO-MODE: Formal signature (pluginName, methodName, fn)
      if (fn !== undefined) {
        const pluginName = pluginNameOrName
        const methodName = methodNameOrFn as string
        if (!_methodNamespace[pluginName]) _methodNamespace[pluginName] = {}
        _methodNamespace[pluginName]![methodName] = fn
        return
      }

      // DEPRECATED/LEGACY: signature (name, fn) - emits warning
      console.warn('[gState] _registerMethod(name, fn) is deprecated. Use _registerMethod(pluginName, methodName, fn) instead.')
      const name = pluginNameOrName
      const methodFn = methodNameOrFn as (...args: unknown[]) => unknown
      if (!_methodNamespace['core']) _methodNamespace['core'] = {}
      _methodNamespace['core']![name] = methodFn
    },
    /**
 * Sets a value in the store.
 * @param key - Store key
 * @param valOrUp - Value or updater function (for Immer)
 * @param options - Persistence options
 * @returns True if value was actually changed
 */
    set: (key: string, valOrUp: unknown, options: PersistOptions = {}): boolean => {
      const oldVal = _store.get(key), newVal = _immer && typeof valOrUp === 'function' ? _immerProduce!(oldVal, valOrUp as (draft: unknown) => void) : valOrUp
      if (_validateInput && !Security.validateKey(key)) { if (!_silent) console.warn(`[gState] Invalid key: ${key}`); return false }
      if (!Security.hasPermission(_accessRules, key, 'write', _userId)) { _audit('set', key, false, 'RBAC Denied'); if (!_silent) console.error(`[gState] RBAC Denied for "${key}"`); return false }

      const sani = _validateInput ? Security.sanitizeValue(newVal) : newVal
      const oldSize = _sizes.get(key) || 0
      _runHook('onBeforeSet', { key, value: sani, store: instance, version: _versions.get(key) || 0 })

      const frozen = (_immer && sani !== null && typeof sani === 'object') ? _immerFreeze!(deepClone(sani), true) : sani

      if (!isEqual(oldVal, frozen)) {
        // Only calculate size if limits are enabled to save traversals
        const finalSize = (_maxObjectSize > 0 || _maxTotalSize > 0) ? _calculateSize(frozen) : 0

        if (_maxObjectSize > 0 && finalSize > _maxObjectSize) {
          const error = new Error(`Object size (${finalSize} bytes) exceeds maxObjectSize (${_maxObjectSize} bytes)`)
          if (_onError) _onError(error, { operation: 'set', key })
          else if (!_silent) console.warn(`[gState] ${error.message} for "${key}"`)
        }

        if (_maxTotalSize > 0) {
          const est = _totalSize - oldSize + finalSize
          if (est > _maxTotalSize) {
            const error = new Error(`Total store size (${est} bytes) exceeds limit (${_maxTotalSize} bytes)`)
            if (_onError) _onError(error, { operation: 'set' })
            else if (!_silent) console.warn(`[gState] ${error.message}`)
          }
        }

        _totalSize = _totalSize - oldSize + finalSize
        _sizes.set(key, finalSize)
        _store.set(key, frozen); _versions.set(key, (_versions.get(key) || 0) + 1)
        // Only persist if explicitly requested via options.persist
        const shouldPersist = options.persist === true
        if (shouldPersist) {
          _diskQueue.set(key, { value: frozen, options: { ...options, persist: shouldPersist, encoded: options.encoded || config?.encoded } }); if (_diskTimer) clearTimeout(_diskTimer); _diskTimer = setTimeout(_flushDisk, _debounceTime)
        }
        _runHook('onSet', { key, value: frozen, store: instance, version: _versions.get(key) })
        _audit('set', key, true)
        _emit(key)
        return true
      }
      return false
    },
    /**
 * Gets a value from the store.
 * @param key - Store key
 * @returns Value or null if not found
 */
    get: <T>(key: string): T | null => {
      if (!Security.hasPermission(_accessRules, key, 'read', _userId)) {
        _audit('get', key, false, 'RBAC Denied')
        return null
      }
      const val = _store.get(key)
      _runHook('onGet', { store: instance, key, value: val })
      _audit('get', key, true)
      return val as T
    },
    /**
 * Creates or retrieves a computed (derived) value.
 * @param key - Computed value key
 * @param selector - Function to compute the value
 * @returns The computed value
 */
    compute: <T>(key: string, selector: ComputedSelector<T>): T => {
      try {
        if (!_computed.has(key)) { _computed.set(key, { selector: selector as ComputedSelector<unknown>, lastValue: null, deps: new Set() }); _updateComputed(key) }
        return _computed.get(key)!.lastValue as T
      } catch (e) {
        const error = e instanceof Error ? e : new Error(String(e))
        if (_onError) _onError(error, { operation: 'compute', key })
        else if (!_silent) console.error(`[gState] Compute error for "${key}":`, e)
        return null as unknown as T
      }
    },
    /**
 * Watches for changes to a specific key.
 * @param key - Key to watch
 * @param callback - Callback function
 * @returns Unsubscribe function
 */
    watch: <T>(key: string, callback: WatcherCallback<T>) => {
      if (!_watchers.has(key)) _watchers.set(key, new Set())
      const set = _watchers.get(key)!; set.add(callback as WatcherCallback<unknown>)
      return () => { set.delete(callback as WatcherCallback<unknown>); if (set.size === 0) _watchers.delete(key) }
    },
    /**
 * Removes a key from the store.
 * @param key - Key to remove
 * @returns True if key was removed
 */
    remove: (key: string): boolean => {
      if (!Security.hasPermission(_accessRules, key, 'delete', _userId)) {
        _audit('delete', key, false, 'RBAC Denied')
        return false
      }
      const old = _store.get(key), deleted = _store.delete(key)
      if (deleted) {
        _totalSize -= (_sizes.get(key) || 0)
        _sizes.delete(key)
        _runHook('onRemove', { store: instance, key, value: old })
      }
      _versions.set(key, (_versions.get(key) || 0) + 1)
      if (_storage) _storage.removeItem(`${_getPrefix()}${key}`)
      _audit('delete', key, true)
      _emit(key); return deleted
    },
    /**
 * Alias for remove.
 * @param key - Key to delete
 */
    delete: (key: string) => instance.remove(key),
    /**
 * Removes all keys from the store and storage.
 * @returns True
 */
    deleteAll: () => {
      Array.from(_store.keys()).forEach(k => instance.remove(k))
      if (_storage) {
        const prefix = _getPrefix()
        for (let i = 0; i < (_storage.length || 0); i++) {
          const k = _storage.key(i); if (k?.startsWith(prefix)) { _storage.removeItem(k); i-- }
        }
      }
      _totalSize = 0
      _sizes.clear()
      return true
    },
    /**
 * Returns all store values as an object.
 * @returns Object with all key-value pairs
 */
    list: () => Object.fromEntries(_store.entries()),
    /**
 * Adds a middleware function to the store.
 * @param m - Middleware function
 */
    use: (m: Middleware) => { _middlewares.add(m) },
    /**
 * Executes multiple operations in a single transaction.
 * Batches listener notifications until all operations complete.
 * @param fn - Transaction function
 */
    transaction: (fn: () => void) => {
      _isTransaction = true; _runHook('onTransaction', { store: instance, key: 'START' })
      try { fn() } finally { _isTransaction = false; _runHook('onTransaction', { store: instance, key: 'END' }); if (_pendingEmit) { _pendingEmit = false; _emit() } }
    },
    /**
 * Destroys the store instance.
 * Removes all listeners, watchers, and clears data.
 */
    destroy: () => {
      if (typeof window !== 'undefined') window.removeEventListener('beforeunload', _unloadHandler)
      _runHook('onDestroy', { store: instance })
      _listeners.clear(); _keyListeners.clear(); _watchers.clear(); _computed.clear()
      _computedDeps.clear(); _plugins.clear(); _store.clear(); _sizes.clear(); _totalSize = 0
      _accessRules.clear(); _consents.clear()
    },
    /**
 * Adds a plugin to the store.
 * @param p - Plugin instance
 */
    _addPlugin: (p: IPlugin<S>) => {
      try {
        _plugins.set(p.name, p)
        p.hooks?.onInstall?.({ store: instance })
      } catch (e) {
        const error = e instanceof Error ? e : new Error(String(e))
        if (_onError) _onError(error, { operation: 'plugin:install', key: p.name })
        else if (!_silent) console.error(`[gState] Failed to install plugin "${p.name}":`, e)
      }
    },
    /**
 * Removes a plugin from the store.
 * @param name - Plugin name to remove
 */
    _removePlugin: (name: string) => { _plugins.delete(name) },
    /**
 * Subscribes to store changes.
 * @param cb - Callback function
 * @param key - Optional key to subscribe to specific key
 * @returns Unsubscribe function
 */
    _subscribe: (cb: StoreSubscriber, key?: string) => {
      if (key) {
        if (!_keyListeners.has(key)) _keyListeners.set(key, new Set())
        const set = _keyListeners.get(key)!; set.add(cb)
        return () => { set.delete(cb); if (set.size === 0) _keyListeners.delete(key) }
      }
      _listeners.add(cb); return () => _listeners.delete(cb)
    },
    /**
 * Gets the version number for a key.
 * @param key - Store key
 * @returns Version number
 */
    _getVersion: (key: string) => _versions.get(key) ?? 0,

    // Enterprise Security & Compliance
    addAccessRule: (pattern, permissions) => Security.addAccessRule(_accessRules, pattern, permissions),
    /**
     * Checks permission using instance-specific regex cache for performance.
     */
    hasPermission: (key, action, userId) => {
      if (_accessRules.size === 0) return true
      for (const [pattern, perms] of _accessRules) {
        let matches: boolean
        if (typeof pattern === 'function') {
          matches = pattern(key, userId)
        } else {
          try {
            let re = _regexCache.get(pattern)
            if (!re) { re = new RegExp(pattern); _regexCache.set(pattern, re) }
            matches = re.test(key)
          } catch { continue }
        }
        if (matches) return perms.includes(action) || perms.includes('admin')
      }
      return false
    },
    recordConsent: (userId, purpose, granted) => Security.recordConsent(_consents, userId, purpose, granted),
    hasConsent: (userId, purpose) => Security.hasConsent(_consents, userId, purpose),
    getConsents: (userId) => Security.getConsents(_consents, userId),
    revokeConsent: (userId, purpose) => Security.revokeConsent(_consents, userId, purpose),
    exportUserData: (userId) => Security.exportUserData(_consents, userId),
    deleteUserData: (userId) => Security.deleteUserData(_consents, userId),

    /**
 * Returns the plugin methods namespace.
 * Provides safe access to plugin methods via store.plugins.undoRedo.undo()
 */
    get plugins() { return _methodNamespace as unknown as GStatePlugins },
    get isReady() { return _isReady },
    whenReady: () => _readyPromise
  }

  // Register security methods under 'security' namespace too for consistency
  const secMethods = ['addAccessRule', 'recordConsent', 'hasConsent', 'getConsents', 'revokeConsent', 'exportUserData', 'deleteUserData']
  secMethods.forEach(m => {
    const fn = (instance as unknown as Record<string, (...args: unknown[]) => unknown>)[m]
    if (fn) instance._registerMethod('security', m, fn)
  })

  const _unloadHandler = () => { if (_diskQueue.size > 0) _flushDisk() }
  if (typeof window !== 'undefined') window.addEventListener('beforeunload', _unloadHandler)

  if (_storage) {
    /**
 * Hydrates the store from persistent storage.
 * Loads persisted values, handles encryption/decryption, and runs migrations.
 */
    const hydrate = async () => {
      try {
        const persisted: Record<string, unknown> = {}, prefix = _getPrefix()
        let savedV = 0
        for (let i = 0; i < (_storage.length || 0); i++) {
          const k = _storage.key(i)
          if (!k || !k.startsWith(prefix)) continue
          const raw = _storage.getItem(k)
          if (!raw) continue
          try {
            const meta = JSON.parse(raw), key = k.substring(prefix.length)

            // Version fallback for older stores where _sys_v was v
            savedV = Math.max(savedV, meta._sys_v !== undefined ? meta._sys_v : (meta.v || 0))

            if (meta.e && Date.now() > meta.e) { _storage.removeItem(k); i--; continue }
            let d = meta.d
            if (meta._enc && _encryptionKey) {
              d = await Security.decrypt(d, _encryptionKey)
            } else if (typeof d === "string") {
              if (meta._b64) { try { d = JSON.parse(atob(d)) } catch (_e) { } }
              else if (d.startsWith("{") || d.startsWith("[")) { try { d = JSON.parse(d) } catch (_e) { } }
            }
            persisted[key] = d; _audit('hydrate', key, true)
          } catch (err) {
            _audit('hydrate', k, false, String(err))
            const error = err instanceof Error ? err : new Error(String(err))
            if (_onError) _onError(error, { operation: 'hydration', key: k })
            else if (!_silent) console.error(`[gState] Hydration failed for "${k}":`, err)
          }
        }
        const final = (savedV < _currentVersion && config?.migrate) ? config.migrate(persisted, savedV) : persisted
        Object.entries(final).forEach(([k, v]) => {
          const frozen = (_immer && v !== null && typeof v === 'object') ? _immerFreeze!(deepClone(v as object), true) : v
          const size = _calculateSize(frozen)
          const oldSize = _sizes.get(k) || 0
          _totalSize = _totalSize - oldSize + size
          _sizes.set(k, size)
          _store.set(k, frozen); _versions.set(k, 1)
        })
        _isReady = true; _readyResolver(); _emit()
      } catch (e) {
        _isReady = true; _readyResolver()
        const error = e instanceof Error ? e : new Error(String(e))
        if (_onError) _onError(error, { operation: 'hydration' })
        else if (!_silent) console.error(`[gState] Hydration failed:`, error)
      }
    }
    hydrate()
  } else { _isReady = true; _readyResolver!() }
  return instance
}
