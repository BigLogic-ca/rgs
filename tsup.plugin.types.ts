import * as _fs from 'node:fs'
import * as _path from 'node:path'

import _pk from "./package.json"

const types = () => {

  const
    builtToolsDir = './dist/tools',
    srcToolsDir = './tools'

  if (_fs.existsSync(srcToolsDir)) {
    const tools = _fs.readdirSync(srcToolsDir, { withFileTypes: true })
    for (const t of tools) {
      if (t.isDirectory()) {
        const srcFile = _path.join(srcToolsDir, t.name, 'interface.d.ts')
        if (_fs.existsSync(srcFile)) {
          const destDir = _path.join(builtToolsDir, t.name)
          if (!_fs.existsSync(destDir)) _fs.mkdirSync(destDir, { recursive: true })
          _fs.copyFileSync(srcFile, _path.join(destDir, 'interface.d.ts'))
        }
      }
    }
  }

  // Patch dist/index.d.ts to reference [_pk.code].d.ts
  // (tsc strips /// <reference> from .ts files when emitting .d.ts)
  const distIndexDts = './dist/index.d.ts'
  try {
    const content = _fs.readFileSync(distIndexDts, 'utf8')
    const ref = `/// <reference path="./${_pk.code}.d.ts" />\n`
    if (!content.startsWith(ref)) {
      _fs.writeFileSync(distIndexDts, ref + content, 'utf8')
      console.debug(`-----> Patched dist/index.d.ts with ${_pk.code}.d.ts reference.`)
    }
  } catch {
    // File doesn't exist or can't be read - skip patching
  }

  return

}

export default types
