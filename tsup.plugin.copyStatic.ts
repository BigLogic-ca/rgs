import * as fs from 'node:fs'
import * as path from 'node:path'

// Custom plugin to copy static files and fix package.json
const copyStatic = {
  name: 'copy-static',
  buildEnd() {
    const outdir = 'dist'
    const patterns = [
      { from: 'README.md', to: 'README.md' },
      { from: '.github/COPYRIGHT.md', to: 'COPYRIGHT.md' },
      { from: '.github/LICENSE.md', to: 'LICENSE.md' },
      { from: '.github/README.md', to: 'README.md' },
      { from: '.github/SECURITY.md', to: 'SECURITY.md' },
      { from: '.github/FUNDING.yml', to: 'FUNDING.yml' },
      { from: 'types/', to: 'types/' },
      { from: 'package.json', to: 'package.json' },
      // DOCS
      { from: 'README.md', to: 'docs/README.md' },
      { from: 'docs/**/*', to: 'docs/' },
    ]

    patterns.forEach(({ from, to }) => {
      const src = path.resolve(from)
      const dest = path.resolve(outdir, to)

      if (fs.existsSync(src)) {
        const stat = fs.statSync(src)
        if (stat.isDirectory()) {
          fs.cpSync(src, dest, { recursive: true })
          console.debug(`Copied directory: ${from} -> ${to}`)
        } else {
          const destDir = path.dirname(dest)
          if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true })
          }
          fs.copyFileSync(src, dest)
          console.debug(`Copied: ${from} -> ${to}`)
        }
      }
    })

    // Copy and fix package.json with proper exports
    const
      src = path.resolve('package.json'),
      dest = path.resolve(outdir, 'package.json')

    if (fs.existsSync(src)) {
      let pkg = JSON.parse(fs.readFileSync(src, 'utf-8'))

      // Update for multi-format output
      pkg.main = './index.cjs'
      pkg.module = './index.js'
      pkg.types = './index.d.ts'

      // Remove type: module to allow both CJS and ESM
      delete pkg.type

      // Add exports for different formats
      pkg.exports = {
        '.': {
          'import': './index.js',
          'require': './index.cjs',
          'types': './index.d.ts'
        },
        './types/*': './types/*'
      }

      // Keep typings
      pkg.typings = './index.d.ts'

      // Remove scripts and devDependencies from dist
      delete pkg.scripts
      delete pkg.devDependencies
      delete pkg.optionalDependencies
      delete pkg.peerDependencies

      fs.writeFileSync(dest, JSON.stringify(pkg, null, 2))
      console.debug('Copied: package.json -> package.json (fixed exports)')
    }
  }
}

export default copyStatic
