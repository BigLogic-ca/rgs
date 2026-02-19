import { IStore, PluginHookName, PluginContext, IPlugin } from "./types"

/**
 * Manages plugins and their lifecycle hooks.
 */

export interface PluginManagerContext<S extends Record<string, unknown>> {
  plugins: Map<string, IPlugin<S>>
  onError?: (error: Error, metadata?: Record<string, unknown>) => void
  silent: boolean
}

export const runHook = <S extends Record<string, unknown>>(
  ctx: PluginManagerContext<S>,
  name: PluginHookName,
  hookContext: PluginContext<S>
) => {
  if (ctx.plugins.size === 0) return
  for (const p of ctx.plugins.values()) {
    const hook = p.hooks?.[name]
    if (hook) {
      try { hook(hookContext) }
      catch (e) {
        const error = e instanceof Error ? e : new Error(String(e))
        if (ctx.onError) ctx.onError(error, { operation: `plugin:${p.name}:${name}`, key: hookContext.key })
        else if (!ctx.silent) console.error(`[gState] Plugin "${p.name}" error:`, e)
      }
    }
  }
}

export const installPlugin = <S extends Record<string, unknown>>(
  ctx: PluginManagerContext<S>,
  plugin: IPlugin<S>,
  storeInstance: IStore<S>
) => {
  try {
    ctx.plugins.set(plugin.name, plugin)
    plugin.hooks?.onInstall?.({ store: storeInstance })
  } catch (e) {
    const error = e instanceof Error ? e : new Error(String(e))
    if (ctx.onError) ctx.onError(error, { operation: 'plugin:install', key: plugin.name })
    else if (!ctx.silent) console.error(`[gState] Failed to install plugin "${plugin.name}": `, e)
  }
}
