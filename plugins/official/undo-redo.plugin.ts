import type { IPlugin } from '../../core/types'

/**
 * Undo/Redo Plugin: Multi-level history management for the store.
 * Snapshots the entire store state for simple, robust rollbacks.
 * @param options Configuration for history limit
 * @returns IPlugin
 */
export const undoRedoPlugin = <S extends Record<string, unknown>>(options?: { limit?: number }): IPlugin<S> => {
  /** History array storing snapshots of store state */
  let _history: Record<string, unknown>[] = []
  /** Current position in the history array */
  let _cursor = -1
  /** Flag to prevent recording changes during restore operations */
  let _isRestoring = false

  /** Maximum number of history snapshots to keep */
  const _limit = options?.limit || 50

  return {
    name: 'gstate-undo-redo',
    hooks: {
      onInstall: ({ store }) => {
        // Initial Snapshot (Baseline)
        _history.push(store.list())
        _cursor = 0

        // Formally register methods via the core API with explicit plugin name
        store._registerMethod('undoRedo', 'undo', () => {
          if (_cursor > 0) {
            _isRestoring = true
            _cursor--
            const snapshot = _history[_cursor]
            if (!snapshot) return false

            // Restore snapshot using the silent internal API
            Object.entries(snapshot).forEach(([k, v]) => {
              store._setSilently(k, v)
            })

            _isRestoring = false
            return true
          }
          return false
        })

        store._registerMethod('undoRedo', 'redo', () => {
          if (_cursor < _history.length - 1) {
            _isRestoring = true
            _cursor++
            const snapshot = _history[_cursor]
            if (!snapshot) return false

            Object.entries(snapshot).forEach(([k, v]) => {
              store._setSilently(k, v)
            })

            _isRestoring = false
            return true
          }
          return false
        })

        store._registerMethod('undoRedo', 'canUndo', () => _cursor > 0)
        store._registerMethod('undoRedo', 'canRedo', () => _cursor < _history.length - 1)
      },

      onSet: ({ store }) => {
        if (_isRestoring) return

        // Wipe forward history on new manual change
        if (_cursor < _history.length - 1) {
          _history = _history.slice(0, _cursor + 1)
        }

        // Push new snapshot
        _history.push(store.list())

        if (_history.length > _limit) {
          _history.shift()
        } else {
          _cursor++
        }
      }
    }
  }
}
