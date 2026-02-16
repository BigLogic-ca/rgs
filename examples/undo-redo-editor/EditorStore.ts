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

// Add Plugin with safe type casting for demonstration
useEditor._addPlugin(undoRedoPlugin({
  limit: 50
}) as any)

export const insertText = (text: string) => {
  const current = useEditor.get('content') || ''
  useEditor.set('content', current + text)
}

// Plugin methods access
export const undo = () => (useEditor.plugins as any).undoRedo?.undo()
export const redo = () => (useEditor.plugins as any).undoRedo?.redo()
