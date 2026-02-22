import { produce as _immerProduce, freeze as _immerFreeze } from 'immer'

import * as Security from "./security"
import * as Persistence from "./persistence"
import * as Plugins from "./plugins"
import { deepClone, isEqual } from './utils'
import { SyncEngine } from './sync'

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
    _maxObjectSize = config?.maxObjectSize ?? 0,
    _maxTotalSize = config?.maxTotalSize ?? 0,
    _encryptionKey = config?.encryptionKey ?? null,
    _validateInput = config?.validateInput ?? true,
    _auditEnabled = config?.auditEnabled ?? true,
    _userId = config?.userId,
    _immer = config?.immer ?? true,
    _persistByDefault = config?.persistByDefault ?? config?.persistence ?? config?.persist ?? false

  if (config?.accessRules) {
    config.accessRules.forEach(rule => Security.addAccessRule(_accessRules, rule.pattern, rule.permissions))
  }

  let
    _isTransaction = false, _pendingEmit = false, _isReady = false, _totalSize = 0,
    _diskTimer: ReturnType<typeof setTimeout> | null = null,
    _snapshot: S | null = null // Cache for stable state snapshot

  let _readyResolver: () => void
  const _readyPromise = new Promise<void>(resolve => { _readyResolver = resolve })

  // --- Context Helpers ---

  const _getPrefix = () => `${_namespace}_`

  const getPersistenceContext = (): Persistence.PersistenceContext => ({
    store: _store, versions: _versions, sizes: _sizes, totalSize: _totalSize,
    storage: _storage, config: config || {}, diskQueue: _diskQueue,
    encryptionKey: _encryptionKey, audit: _audit,
    onError: _onError as unknown as ((error: Error, metadata?: Record<string, unknown>) => void) | undefined,
    silent: _silent, debounceTime: _debounceTime, currentVersion: _currentVersion
  })

  const getPluginContext = (): Plugins.PluginManagerContext<S> => ({
    plugins: _plugins,
    onError: _onError as unknown as ((error: Error, metadata?: Record<string, unknown>) => void) | undefined,
    silent: _silent
  })

  /**
   * Enterprise-grade iterative walker for precise memory estimation.
   * Faster than JSON.stringify and handles circular references accurately.
   */
  const _calculateSize = (val: unknown): number => {
    if (val === null || val === undefined) return 0
    const type = typeof val
    if (type === 'boolean') return 4
    if (type === 'number') return 8
    if (type === 'string') return (val as string).length * 2
    if (type !== 'object') return 0

    let bytes = 0
    const stack: unknown[] = [val]
    const seen = new WeakSet<object>()

    while (stack.length > 0) {
      const value = stack.pop()
      if (typeof value === 'boolean') { bytes += 4 }
      else if (typeof value === 'number') { bytes += 8 }
      else if (typeof value === 'string') { bytes += value.length * 2 }
      else if (typeof value === 'object' && value !== null) {
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

  const _runHook = (name: PluginHookName, context: PluginContext<S>) => {
    Plugins.runHook(getPluginContext(), name, context)
  }

  const _audit = (action: 'set' | 'get' | 'delete' | 'hydrate', key: string, success: boolean, error?: string) => {
    if (_auditEnabled && Security.isAuditActive() && Security.logAudit) {
      Security.logAudit({ timestamp: Date.now(), action, key, userId: _userId, success, error })
    }
  }

  // --- Reactivity ---

  const _updateComputed = (key: string) => {
    const comp = _computed.get(key)
    if (!comp) return

    const depsFound = new Set<string>()
    const getter = <V>(k: string): V | null => {
      depsFound.add(k)
      if (_computed.has(k)) return _computed.get(k)!.lastValue as V
      return instance.get(k) as V | null
    }

    const newValue = comp.selector(getter)

    // Update dependencies
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
      comp.lastValue = (_immer && newValue !== null && typeof newValue === 'object') ? _immerFreeze(deepClone(newValue), true) : newValue
      _versions.set(key, (_versions.get(key) || 0) + 1)
      _emit(key)
    }
  }

  const _emit = (changedKey?: string) => {
    if (changedKey) {
      // 1. Update computed dependent on this key
      if (_computedDeps.has(changedKey)) {
        const dependents = _computedDeps.get(changedKey)!
        for (const dependentKey of dependents) {
          _updateComputed(dependentKey)
        }
      }

      // 2. Notify Watchers
      const watchers = _watchers.get(changedKey)
      if (watchers) {
        const val = instance.get(changedKey)
        for (const w of watchers) {
          try { w(val) }
          catch (e) {
            const error = e instanceof Error ? e : new Error(String(e))
            if (_onError) _onError(error, { operation: 'watcher', key: changedKey })
            else if (!_silent) console.error(`[gState] Watcher error for "${changedKey}":`, e)
          }
        }
      }

      // 3. Notify Key Listeners
      const keyListeners = _keyListeners.get(changedKey)
      if (keyListeners) {
        for (const l of keyListeners) {
          try { l() }
          catch (e) {
            const error = e instanceof Error ? e : new Error(String(e))
            if (_onError) _onError(error, { operation: 'keyListener', key: changedKey })
            else if (!_silent) console.error(`[gState] Listener error for "${changedKey}":`, e)
          }
        }
      }
    }

    if (_isTransaction) { _pendingEmit = true; return }

    // 4. Notify Global Listeners
    for (const l of _listeners) {
      try { l() }
      catch (e) {
        const error = e instanceof Error ? e : new Error(String(e))
        if (_onError) _onError(error, { operation: 'listener' })
        else if (!_silent) console.error(`[gState] Global listener error: `, e)
      }
    }
  }

  const _flushDisk = async () => {
    // We pass current values to the persistence module
    // Note: totalSize update is not handled here as flush doesn't change memory size
    Persistence.flushDisk(getPersistenceContext())
  }

  /**
   * Plugin namespace for safely storing plugin methods.
   */
  const _methodNamespace: Record<string, Record<string, unknown>> = {}

  const instance: IStore<S> = {
    _setSilently: (key: string, value: unknown) => {
      const oldSize = _sizes.get(key) || 0, frozen = (_immer && value !== null && typeof value === 'object') ? _immerFreeze!(deepClone(value), true) : value
      const hasLimits = (_maxObjectSize > 0 || _maxTotalSize > 0) && process.env.NODE_ENV !== 'production'
      const newSize = hasLimits ? _calculateSize(frozen) : 0

      _totalSize = _totalSize - oldSize + newSize
      _sizes.set(key, newSize)
      _store.set(key, frozen); _versions.set(key, (_versions.get(key) || 0) + 1)
      _snapshot = null // Invalidate snapshot
    },
    /**
     * Registers a custom method on the store instance.
     * @param pluginName - Plugin name
     * @param methodName - Method name
     * @param fn - Method function
     */
    _registerMethod: (pluginName: string, methodName: string, fn: (...args: unknown[]) => unknown) => {
      const isUnsafeKey = (key: string): boolean =>
        key === '__proto__' || key === 'constructor' || key === 'prototype'

      if (isUnsafeKey(pluginName) || isUnsafeKey(methodName)) {
        console.warn('[gState] Refusing to register method with unsafe key:', pluginName, methodName)
        return
      }

      if (!_methodNamespace[pluginName]) _methodNamespace[pluginName] = {}
      _methodNamespace[pluginName]![methodName] = fn
    },
    set: (key: string, valOrUp: unknown, options: PersistOptions = {}): boolean => {
      const oldVal = _store.get(key), newVal = _immer && typeof valOrUp === 'function' ? _immerProduce!(oldVal, valOrUp as (draft: unknown) => void) : valOrUp
      if (_validateInput && !Security.validateKey(key)) { if (!_silent) console.warn(`[gState] Invalid key: ${key}`); return false }
      if (!Security.hasPermission(_accessRules, key, 'write', _userId)) { _audit('set', key, false, 'RBAC Denied'); if (!_silent) console.error(`[gState] RBAC Denied for "${key}"`); return false }

      const sani = _validateInput ? Security.sanitizeValue(newVal) : newVal
      const oldSize = _sizes.get(key) || 0
      _runHook('onBeforeSet', { key, value: sani, store: instance, version: _versions.get(key) || 0 })

      const frozen = (_immer && sani !== null && typeof sani === 'object') ? _immerFreeze(deepClone(sani), true) : sani

      if (!isEqual(oldVal, frozen)) {
        const hasLimits = (_maxObjectSize > 0 || _maxTotalSize > 0) && process.env.NODE_ENV !== 'production'
        const finalSize = hasLimits ? _calculateSize(frozen) : 0

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

        _snapshot = null // Invalidate snapshot

        const shouldPersist = options.persist ?? _persistByDefault
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
    compute: <T>(key: string, selector: ComputedSelector<T>): T => {
      try {
        if (!_computed.has(key)) { _computed.set(key, { selector: selector as ComputedSelector<unknown>, lastValue: null, deps: new Set() }); _updateComputed(key) }
        return _computed.get(key)!.lastValue as T
      } catch (e) {
        const error = e instanceof Error ? e : new Error(String(e))
        if (_onError) _onError(error, { operation: 'compute', key })
        else if (!_silent) console.error(`[gState] Compute error for "${key}": `, e)
        return null as unknown as T
      }
    },
    watch: <T>(key: string, callback: WatcherCallback<T>) => {
      if (!_watchers.has(key)) _watchers.set(key, new Set())
      const set = _watchers.get(key)!; set.add(callback as WatcherCallback<unknown>)
      return () => { set.delete(callback as WatcherCallback<unknown>); if (set.size === 0) _watchers.delete(key) }
    },
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
        _snapshot = null // Invalidate snapshot
      }
      _versions.set(key, (_versions.get(key) || 0) + 1)
      if (_storage) _storage.removeItem(`${_getPrefix()}${key}`)

      _audit('delete', key, true)
      _emit(key); return deleted
    },
    delete: (key: string) => instance.remove(key),
    deleteAll: () => {
      Array.from(_store.keys()).forEach(k => instance.remove(k))
      if (_storage) {
        const prefix = _namespace + "_"
        for (let i = 0; i < (_storage.length || 0); i++) {
          const k = _storage.key(i); if (k?.startsWith(prefix)) { _storage.removeItem(k); i-- }
        }
      }
      _totalSize = 0
      _sizes.clear()
      _snapshot = null // Invalidate snapshot
      return true
    },
    list: () => Object.fromEntries(_store.entries()),
    use: (m: Middleware) => { _middlewares.add(m) },
    transaction: (fn: () => void) => {
      _isTransaction = true; _runHook('onTransaction', { store: instance, key: 'START' })
      try { fn() } finally { _isTransaction = false; _runHook('onTransaction', { store: instance, key: 'END' }); if (_pendingEmit) { _pendingEmit = false; _emit() } }
    },
    destroy: () => {
      if (_diskTimer) { clearTimeout(_diskTimer); _diskTimer = null }
      _diskQueue.clear()
      if (typeof window !== 'undefined') window.removeEventListener('beforeunload', _unloadHandler)
      _runHook('onDestroy', { store: instance })
      _listeners.clear(); _keyListeners.clear(); _watchers.clear(); _computed.clear()
      _computedDeps.clear(); _plugins.clear(); _store.clear(); _sizes.clear(); _totalSize = 0
      _accessRules.clear(); _consents.clear(); _versions.clear(); _regexCache.clear(); _middlewares.clear()
    },
    _addPlugin: (p: IPlugin<S>) => {
      Plugins.installPlugin(getPluginContext(), p, instance)
    },
    _removePlugin: (name: string) => { _plugins.delete(name) },
    _subscribe: (cb: StoreSubscriber, key?: string) => {
      if (key) {
        if (!_keyListeners.has(key)) _keyListeners.set(key, new Set())
        const set = _keyListeners.get(key)!; set.add(cb)
        return () => { set.delete(cb); if (set.size === 0) _keyListeners.delete(key) }
      }
      _listeners.add(cb); return () => _listeners.delete(cb)
    },
    _getVersion: (key: string) => _versions.get(key) ?? 0,

    // Enterprise Security & Compliance
    addAccessRule: (pattern, permissions) => Security.addAccessRule(_accessRules, pattern, permissions),
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

    getSnapshot: (): S => {
      if (!_snapshot) {
        _snapshot = Object.fromEntries(_store.entries()) as S
      }
      return _snapshot
    },

    get plugins() { return _methodNamespace as unknown as GStatePlugins },
    get isReady() { return _isReady },
    get namespace() { return _namespace },
    get userId() { return _userId },
    whenReady: () => _readyPromise
  }

  const secMethods = ['addAccessRule', 'recordConsent', 'hasConsent', 'getConsents', 'revokeConsent', 'exportUserData', 'deleteUserData']
  secMethods.forEach(m => {
    const fn = (instance as unknown as Record<string, (...args: unknown[]) => unknown>)[m]
    if (fn) instance._registerMethod('security', m, fn)
  })

  const _unloadHandler = () => { if (_diskQueue.size > 0) _flushDisk() }
  if (typeof window !== 'undefined') window.addEventListener('beforeunload', _unloadHandler)

  if (_storage) {
    Persistence.hydrateStore(
      getPersistenceContext(),
      // We pass the calculateSize function to update memory usage correctly after hydration
      (val) => {
        const hasLimits = (_maxObjectSize > 0 || _maxTotalSize > 0) && process.env.NODE_ENV !== 'production'
        return hasLimits ? _calculateSize(val) : 0
      },
      () => { _isReady = true; _snapshot = null; _readyResolver(); _emit() }
    ).then(() => {
      // Hydration logic handles isReady and emit internally via callback or promise resolution if needed
      // But here we rely on the callback passed to hydrateStore
    })
  } else { _isReady = true; _readyResolver!() }

  // Initialize sync engine if configured
  let _syncEngine: SyncEngine<S> | null = null
  if ((config as StoreConfig<S>)?.sync) {
    _syncEngine = new SyncEngine(instance, (config as StoreConfig<S>).sync!)
    // Register sync methods on the store
    instance._registerMethod('sync', 'flush', () => _syncEngine?.flush())
    instance._registerMethod('sync', 'getState', () => _syncEngine?.getState())
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    instance._registerMethod('sync', 'onStateChange', (cb: any) => _syncEngine?.onStateChange(cb))
  }

  return instance
}
