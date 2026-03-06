import * as _fs from 'node:fs'
import * as _path from 'node:path'

import _pk from "./package.json"

const Types = {

  name: 'create-types',
  buildEnd() {
    // // Copy tools interface.d.ts files
    // const
    //   builtToolsDir = './dist/tools',
    //   srcToolsDir = './tools'

    // if (fs.existsSync(srcToolsDir)) {
    //   const tools = fs.readdirSync(srcToolsDir, { withFileTypes: true })
    //   for (const t of tools) {
    //     if (t.isDirectory()) {
    //       const srcFile = path.join(srcToolsDir, t.name, 'interface.d.ts')
    //       if (fs.existsSync(srcFile)) {
    //         const destDir = path.join(builtToolsDir, t.name)
    //         if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true })
    //         fs.copyFileSync(srcFile, path.join(destDir, 'interface.d.ts'))
    //       }
    //     }
    //   }
    // }

    // // Patch dist/types/index.d.ts to reference [pk.name].d.ts
    // // (tsc strips /// <reference> from .ts files when emitting .d.ts)
    // const distIndexDts = './dist/index.d.ts'
    // if (fs.existsSync(distIndexDts)) {
    //   const content = fs.readFileSync(distIndexDts, 'utf8')
    //   const ref = `/// <reference path="./${pk.name}.d.ts" />\n`
    //   if (!content.startsWith(ref)) {
    //     fs.writeFileSync(distIndexDts, ref + content, 'utf8')
    //     console.debug(`-----> Patched dist/types/index.d.ts with ${pk.name}.d.ts reference.`)
    //   }
    // }

    return

  }

}

export default Types
