const vscode = require('vscode')

function activate(context) {
  // Decorator for rgs and gState
  const rgsDecoration = vscode.window.createTextEditorDecorationType({
    light: { color: '#00FF00' },
    dark: { color: '#00FF00' }
  })

  // Check if position is in a comment
  function isInComment(document, position) {
    const line = document.lineAt(position.line).text
    const textUntilPosition = line.substring(0, position.character)

    // Single line comment //
    const singleCommentIndex = textUntilPosition.lastIndexOf('//')
    if (singleCommentIndex !== -1) {
      const beforeComment = textUntilPosition.substring(0, singleCommentIndex)
      const hasStringBefore = beforeComment.includes('"') || beforeComment.includes("'")
      if (!hasStringBefore) return true
    }

    // Multi-line comment /* */
    const text = document.getText()
    const offset = document.offsetAt(position)

    let lastBlockStart = -1
    for (let i = offset - 1; i >= 1; i--) {
      if (text[i - 1] === '/' && text[i] === '*') {
        lastBlockStart = i - 1
        break
      }
      if (text[i - 1] === '*' && text[i] === '/') break
    }

    let lastBlockEnd = -1
    for (let i = offset - 1; i >= 1; i--) {
      if (text[i - 1] === '*' && text[i] === '/') {
        lastBlockEnd = i - 1
        break
      }
      if (text[i - 1] === '/' && text[i] === '*') break
    }

    return lastBlockStart > lastBlockEnd
  }

  const applyDecorations = () => {
    const editor = vscode.window.activeTextEditor
    if (!editor) return

    const document = editor.document
    const text = document.getText()

    // Find rgs and gState
    const regex = /\b(rgs|gState)\b/g
    const decorations = []
    let match
    while ((match = regex.exec(text)) !== null) {
      const startPos = document.positionAt(match.index)

      // Skip if in comment
      if (isInComment(document, startPos)) continue

      const endPos = document.positionAt(match.index + match[0].length)
      decorations.push(new vscode.Range(startPos, endPos))
    }

    editor.setDecorations(rgsDecoration, decorations)
  }

  vscode.workspace.onDidChangeTextDocument(() => applyDecorations())
  vscode.window.onDidChangeActiveTextEditor(() => applyDecorations())
  applyDecorations()
}

exports.activate = activate
