import * as _fs from 'node:fs'
import * as _path from 'node:path'

import pk from './package.json'

const charMap: Record<string, string> = {
  '<': '\\u003C',
  // '>': '\\u003E',
  '/': '\\u002F',
  '\\': '\\\\',
  '\b': '\\b',
  '\f': '\\f',
  '\n': '\\n',
  '\r': '\\r',
  '\t': '\\t',
  '\0': '\\0',
  '\u2028': '\\u2028',
  '\u2029': '\\u2029',
  '\u203A': '\\u203A',
  '\uF0D7': '\\uF0D7',
  '\uF0DA': '\\uF0DA',
}

const unsafeCharsPattern = new RegExp(
  `[${Object.keys(charMap).join('').replace(/[-\\^$*+?.()|[\]{}]/g, '\\$&')}]`,
  'g',
)

function escapeUnsafeChars(str: string): string {
  return str.replace(unsafeCharsPattern, (ch) => charMap[ch] ?? ch)
}

// Custom plugin to inject CSS into JS bundle
const injectCss = () => {

  const
    cssPath = _path.resolve('dist/index.css'),
    cjsPath = _path.resolve('dist/index.cjs'),
    jsPath = _path.resolve('dist/index.js')

  if (_fs.existsSync(cssPath)) {
    let cssContent = `${_fs.readFileSync(cssPath, 'utf-8')}`

    // Minify CSS further (basic)
    cssContent = cssContent
      .replace(/^@charset\s+["']UTF-8["'];?\s*/gi, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\s+/g, ' ')
      .replace(/\s*([{}:;,])\s*/g, '$1')
      .trim()

    cssContent = `@layer ${pk.code} {${cssContent}}`

    const
      jsContent = _fs.readFileSync(jsPath, 'utf-8'),
      cjsContent = _fs.readFileSync(cjsPath, 'utf-8')

    // Inject CSS into JS
    const injectCode = `;(()=>{const s=document.createElement("style");s.textContent=${escapeUnsafeChars(JSON.stringify(cssContent))};document.head.appendChild(s)})();`

    // For ESM - inject at the beginning
    const newJsContent = injectCode + jsContent
    _fs.writeFileSync(jsPath, newJsContent)

    // For CJS - inject at the beginning
    const newCjsContent = injectCode + cjsContent
    _fs.writeFileSync(cjsPath, newCjsContent)
  }
}

export default injectCss
