/**
 * Argis (RGS) - React Globo State - Advanced Engine
 * For additional features beyond the core.
 */

// Async Engine
export { createAsyncStore } from "./async"

// Storage Adapters
export { StorageAdapters } from "./store"

// Communication Plugins (Opt-in)
export { syncPlugin as SyncPlugin } from "../plugins/official/sync.plugin"
export { analyticsPlugin as AnalyticsPlugin } from "../plugins/official/analytics.plugin"

// Advanced Types
export type { AsyncState, Middleware, IPlugin, PluginContext } from "./types"
