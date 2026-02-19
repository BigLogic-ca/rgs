import { ComputedSelector, WatcherCallback, StoreSubscriber } from "./types"
import { isEqual, deepClone } from "./utils"
import { freeze as _immerFreeze } from 'immer'

/**
 * Handles reactivity: computed values, watchers, and listeners.
 */

export interface ReactivityContext {
  computed: Map<string, { selector: ComputedSelector<unknown>, lastValue: unknown, deps: Set<string> }>
  computedDeps: Map<string, Set<string>>
  watchers: Map<string, Set<WatcherCallback<unknown>>>
  listeners: Set<StoreSubscriber>
  keyListeners: Map<string, Set<StoreSubscriber>>
  versions: Map<string, number>

  // Dependencies needed for updates
  storeInstance: unknown // breaking cyclic dependency type issue for now
  immer: boolean
  onError?: (error: Error, metadata?: Record<string, unknown>) => void
  silent: boolean
}

interface BasicStore { get(k: string): unknown }

export const updateComputed = (ctx: ReactivityContext, key: string, emit: (k?: string) => void) => {
  const comp = ctx.computed.get(key)
  if (!comp) return

  const depsFound = new Set<string>()
  const getter = <V>(k: string): V | null => {
    depsFound.add(k)
    // Support computed dependencies
    if (ctx.computed.has(k)) return ctx.computed.get(k)!.lastValue as V
    return (ctx.storeInstance as BasicStore).get(k) as V | null
  }

  const newValue = comp.selector(getter)

  // Cleanup old dependencies
  comp.deps.forEach(d => {
    if (!depsFound.has(d)) {
      const dependents = ctx.computedDeps.get(d)
      if (dependents) { dependents.delete(key); if (dependents.size === 0) ctx.computedDeps.delete(d) }
    }
  })

  // Add new dependencies
  depsFound.forEach(d => {
    if (!comp.deps.has(d)) {
      if (!ctx.computedDeps.has(d)) ctx.computedDeps.set(d, new Set())
      ctx.computedDeps.get(d)!.add(key)
    }
  })
  comp.deps = depsFound

  if (!isEqual(comp.lastValue, newValue)) {
    comp.lastValue = (ctx.immer && newValue !== null && typeof newValue === 'object') ? _immerFreeze(deepClone(newValue), true) : newValue
    ctx.versions.set(key, (ctx.versions.get(key) || 0) + 1)
    emit(key)
  }
}

export const emitChange = (ctx: ReactivityContext, changedKey?: string, isTransaction = false, setPendingEmit?: (v: boolean) => void, emit?: (k?: string) => void) => {
  if (changedKey) {
    // 1. Update computed dependent on this key
    const dependents = ctx.computedDeps.get(changedKey)
    if (dependents && emit) {
      for (const compKey of dependents) {
        updateComputed(ctx, compKey, emit)
      }
    }

    // 2. Notify Watchers
    const watchers = ctx.watchers.get(changedKey)
    if (watchers) {
      const val = (ctx.storeInstance as BasicStore).get(changedKey)
      for (const w of watchers) {
        try { w(val) }
        catch (e) {
          const error = e instanceof Error ? e : new Error(String(e))
          if (ctx.onError) ctx.onError(error, { operation: 'watcher', key: changedKey })
          else if (!ctx.silent) console.error(`[gState] Watcher error for "${changedKey}":`, e)
        }
      }
    }

    // 3. Notify Key Listeners
    const keyListeners = ctx.keyListeners.get(changedKey)
    if (keyListeners) {
      for (const l of keyListeners) {
        try { l() }
        catch (e) {
          const error = e instanceof Error ? e : new Error(String(e))
          if (ctx.onError) ctx.onError(error, { operation: 'keyListener', key: changedKey })
          else if (!ctx.silent) console.error(`[gState] Listener error for "${changedKey}":`, e)
        }
      }
    }
  }

  if (isTransaction) {
    if (setPendingEmit) setPendingEmit(true)
    return
  }

  // 4. Notify Global Listeners
  for (const l of ctx.listeners) {
    try { l() }
    catch (e) {
      const error = e instanceof Error ? e : new Error(String(e))
      if (ctx.onError) ctx.onError(error, { operation: 'listener' })
      else if (!ctx.silent) console.error(`[gState] Global listener error: `, e)
    }
  }
}
