import esbuild from 'esbuild'
import alias from 'esbuild-plugin-alias'

import { copy } from 'esbuild-plugin-copy'
import { nodeExternalsPlugin } from 'esbuild-node-externals'

import pk from './package.json' with { type: 'json' }
import fs from 'node:fs'

///

const common = {
  legalComments: 'none',
  outdir: 'dist',
  logLevel: 'warning',
  bundle: true,
  minify: true,
  keepNames: false,
  treeShaking: true,
  platform: 'browser',
  format: 'esm',
  target: ['es2020'],
  sourcemap: false,
  write: true,
  color: true,
}

const files = {
  assets: [
    { from: 'markdown/**/*', to: 'docs/' },
    { from: '.github/README.md', to: 'docs/README.md' },
    { from: '.github/COPYRIGHT.md', to: 'COPYRIGHT.md' },
    { from: '.github/LICENSE.md', to: 'LICENSE.md' },
    { from: '.github/README.md', to: 'README.md' },
    { from: '.github/SECURITY.md', to: 'SECURITY.md' },
    { from: '.github/FUNDING.yml', to: 'FUNDING.yml' },
    { from: './package.json', to: './package.json' },
  ]
}

// Build minimal core (< 2KB)
const minimalBuild = esbuild.build({
  ...common,
  entryPoints: ['./core/minimal.ts'],
  define: {
    'process.env.NODE_ENV': '"production"'
  }
})

// Build full version
const fullBuild = esbuild.build({
  ...common,
  entryPoints: ['./index.ts'],
  define: {
    'process.env.NODE_ENV': '"production"'
  },
  plugins: [
    nodeExternalsPlugin(),
    copy({ assets: files.assets })
  ]
})

Promise.all([minimalBuild, fullBuild])
  .then(([minimal, full]) => {
    if (!fs.existsSync('./.cache')) fs.mkdirSync('./.cache', { recursive: true })

    // Get sizes
    const minimalSize = fs.statSync('dist/core/minimal.js').size
    const fullSize = fs.statSync('dist/index.js').size

    console.log('=== BUILD COMPLETE ===')
    console.log(`Minimal (core/minimal.js): ${(minimalSize / 1024).toFixed(2)} KB`)
    console.log(`Full (index.js): ${(fullSize / 1024).toFixed(2)} KB`)
  })
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
