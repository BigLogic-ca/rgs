import esbuild from 'esbuild'
import { copy } from 'esbuild-plugin-copy'
import { copyFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Copy .github files to dist root (except workflow)
const githubFiles = [
  { from: '.github/COPYRIGHT.md', to: 'COPYRIGHT.md' },
  { from: '.github/LICENSE', to: 'LICENSE' },
  { from: '.github/README.md', to: 'README.md' },
  { from: '.github/SECURITY.md', to: 'SECURITY.md' }
]

function copyGithubFiles() {
  githubFiles.forEach(({ from, to }) => {
    const src = join(__dirname, from)
    const dest = join(__dirname, 'dist', to)
    if (existsSync(src)) {
      copyFileSync(src, dest)
      console.log(`  ✅ Copied: ${to}`)
    }
  })
}

const common = {
  bundle: false,
  legalComments: 'none',
  allowOverwrite: true,
  treeShaking: true,
  keepNames: false,
  minify: true,
  sourcemap: false,
  write: true,
  color: true,
  format: "esm",
}

// Build Main Entry
const buildMain = async () => {
  await esbuild.build({
    ...common,
    entryPoints: ['index.ts'],
    outfile: 'dist/index.js',
    plugins: [
      copy({
        assets: [
          { from: './package.json', to: './package.json' },
          { from: './markdown/**/*', to: './markdown' }
        ]
      })
    ]
  })
}

// Build Advanced Entry
const buildAdvanced = async () => {
  await esbuild.build({
    ...common,
    entryPoints: ['advanced.ts'],
    outfile: 'dist/advanced.js',
  })
}

// Run builds and copy .github files
Promise.all([buildMain(), buildAdvanced()])
  .then(() => {
    copyGithubFiles()
    console.log('✅ Build Complete (Main + Advanced + Assets).')
  })
  .catch((error) => {
    console.error('❌ Build Failed:', error)
    process.exit(1)
  })
