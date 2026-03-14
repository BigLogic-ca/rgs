import * as _fs from 'node:fs'
import * as _path from 'node:path'

// Custom plugin to copy static files and fix package.json
type CopyPath = { from: string; to: string }

const copyStatic = (paths: CopyPath[]) => {

  const
    outdir = 'dist',
    patterns = [...paths],
    pkgJsonDest = _path.resolve(outdir, 'package.json')

  patterns.forEach(({ from, to }) => {
    const
      src = _path.resolve(from),
      dest = _path.resolve(outdir, to)

    // Skip package.json here; it is handled separately below.
    if (dest === pkgJsonDest) {
      return
    }

    if (_fs.existsSync(src)) {
      const stat = _fs.statSync(src)
      if (stat.isDirectory()) {
        _fs.cpSync(src, dest, { recursive: true })
        console.debug(`Copied directory: ${from} -> ${to}`)
      } else {
        const destDir = _path.dirname(dest)

        if (!_fs.existsSync(destDir))
          _fs.mkdirSync(destDir, { recursive: true })

        _fs.copyFileSync(src, dest)
        console.debug(`Copied: ${from} -> ${to}`)
      }
    }
  })

  // Copy and fix package.json with proper exports
  const
    src = _path.resolve('package.json'),
    dest = pkgJsonDest

  if (_fs.existsSync(src)) {

    const pkg = JSON.parse(_fs.readFileSync(src, 'utf-8'))

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

    _fs.writeFileSync(dest, JSON.stringify(pkg, null, 2))
    console.debug('Copied: package.json -> package.json (fixed exports)')
  }
}

export default copyStatic
