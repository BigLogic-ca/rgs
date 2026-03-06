import * as fs from 'node:fs'
import * as path from 'node:path'

const charMap: Record<string, string> = {
  '<': '\\u003C',
  '>': '\\u003E',
  '/': '\\u002F',
  '\\': '\\\\',
  '\b': '\\b',
  '\f': '\\f',
  '\n': '\\n',
  '\r': '\\r',
  '\t': '\\t',
  '\0': '\\0',
  '\u2028': '\\u2028',
  '\u2029': '\\u2029'
}

function escapeUnsafeChars(str: string): string {
  return str.replace(/[<>/\\\b\f\n\r\t\0\u2028\u2029]/g, (x) => charMap[x] || x)
}

// Custom plugin to inject CSS into JS bundle
const injectCss = {
  name: 'inject-css',
  buildEnd() {
    const
      cssPath = path.resolve('dist/index.css'),
      jsPath = path.resolve('dist/index.js'),
      cjsPath = path.resolve('dist/index.cjs')

    if (fs.existsSync(cssPath)) {
      let cssContent = fs.readFileSync(cssPath, 'utf-8')

      // Minify CSS further (basic)
      cssContent = cssContent
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\s+/g, ' ')
        .replace(/\s*([{}:;,])\s*/g, '$1')
        .trim()

      const
        jsContent = fs.readFileSync(jsPath, 'utf-8'),
        cjsContent = fs.readFileSync(cjsPath, 'utf-8')

      // Inject CSS into JS
      const injectCode = `;(()=>{const s=document.createElement("style");s.textContent=${escapeUnsafeChars(JSON.stringify(cssContent))};document.head.appendChild(s)})();`

      // For ESM - inject at the beginning
      const newJsContent = injectCode + jsContent
      fs.writeFileSync(jsPath, newJsContent)

      // For CJS - inject at the beginning
      const newCjsContent = injectCode + cjsContent
      fs.writeFileSync(cjsPath, newCjsContent)
    }
  }
}

export default injectCss
