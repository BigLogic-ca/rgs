import type { IPlugin } from '../../core/types'

/**
 * Redux DevTools extension interface
 */
interface DevToolsExtension {
  /** Connects to the DevTools extension */
  connect: (options: { name: string }) => DevToolsInstance
}

/**
 * Redux DevTools instance interface
 */
interface DevToolsInstance {
  /** Initializes the DevTools with initial state */
  init: (state: Record<string, unknown>) => void
  /** Sends an action to the DevTools */
  send: (action: string, state: Record<string, unknown>) => void
}

/**
 * DevTools Plugin: Connects the store to Redux DevTools.
 * @param options Configuration for the extension
 * @returns IPlugin
 */
export const devToolsPlugin = (options?: { name?: string }): IPlugin => {
  const ext = globalThis as unknown
  const global = ext as Record<string, unknown>
  const extension = global.__REDUX_DEVTOOLS_EXTENSION__ as DevToolsExtension | undefined

  if (!extension?.connect) {
    return { name: 'gstate-devtools-noop', hooks: {} }
  }

  /** Reference to the DevTools instance */
  let _devTools: DevToolsInstance | null = null

  return {
    name: 'gstate-devtools',
    hooks: {
      onInstall: ({ store }) => {
        _devTools = extension.connect({ name: options?.name || 'Magnetar Store' })
        _devTools.init(store.list())
      },
      onSet: ({ key, store }) => {
        if (!key || !_devTools) return
        // Send full state to DevTools to enable time-travel/snapshots
        _devTools.send(`SET_${key.toUpperCase()}`, store.list())
      },
      onRemove: ({ key, store }) => {
        if (!key || !_devTools) return
        _devTools.send(`REMOVE_${key.toUpperCase()}`, store.list())
      }
    }
  }
}
