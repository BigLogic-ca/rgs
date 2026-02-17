import { gstate, undoRedoPlugin, type IStore } from '../../index'

export interface EditorState extends Record<string, unknown> {
  content: string
  cursorPosition: number
}

/**
 * Editor Store with History
 * RECOMMENDED FOR: Frontend (FE)
 */
export const useEditor = gstate<EditorState>({
  content: '',
  cursorPosition: 0
})

// Add Plugin
useEditor._addPlugin(undoRedoPlugin({
  limit: 50
}))

export const insertText = (text: string) => {
  useEditor.set('content', (current) => current + text)
}

// Plugin methods access - Type-safe!
export const undo = () => useEditor.plugins.undoRedo.undo()
export const redo = () => useEditor.plugins.undoRedo.redo()
