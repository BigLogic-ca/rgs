import esbuild from 'esbuild'
import alias from 'esbuild-plugin-alias'

import { copy } from 'esbuild-plugin-copy'
import { nodeExternalsPlugin } from 'esbuild-node-externals'

// import { sassPlugin } from 'esbuild-sass-plugin'
// import { ScssModulesPlugin } from 'esbuild-scss-modules-plugin'

import pk from './package.json' with { type: 'json' }
import fs from 'node:fs'

///

const common = {
  external: Object.keys(pk.devDependencies),
  entryPoints: ['./index.ts'],
  legalComments: 'none',
  outdir: 'dist',
  logLevel: 'verbose',
  bundle: true,
  minify: true,
  keepNames: false,
  treeShaking: true,
  metafile: true,
  platform: 'node',
  format: 'esm',
  target: ['es2024'],
  sourcemap: true,
  write: true,
  color: true,
  globalName: 'memorio',
  inject: ['./index.js'],
  define: {
    'process.env.NODE_ENV': '"production"'
  }
}

const files = {
  assets: [
    { from: '.github/COPYRIGHT.md', to: 'COPYRIGHT.md' },
    { from: '.github/LICENSE', to: 'LICENSE' },
    { from: '.github/README.md', to: 'README.md' },
    { from: '.github/SECURITY.md', to: 'SECURITY.md' },
    { from: '.github/FUNDING.md', to: 'FUNDING.md' },
    { from: './package.json', to: './package.json' },
    { from: 'types/**/*', to: './types' },
    { from: './index.d.ts', to: './index.d.ts' }
  ]
}

///

const result = esbuild.build(
  {
    ...common,
    plugins: [
      nodeExternalsPlugin(),
      alias(
        {
          '/*': './'
        }
      ),
      copy(
        files
      )
    ],
    // ScssModulesPlugin(
    //   {
    //     inject: true,
    //     minify: true
    //   }
    // ),
    // sassPlugin(
    //   {
    //     type: 'style',
    //     loadPaths: ['./node_modules'],
    //     css: {
    //       preprocessorOptions: {
    //         scss: {
    //           api: 'modern'
    //         }
    //       }
    //     }
    //   }
    // ),
  }
)
  .then(
    (result) => {
      fs.writeFileSync('./.cache/meta.json', JSON.stringify(result.metafile, null, 2))
      console.log('Complete.')
    }
  )
  .catch(
    (error) => {
      console.error(error)
      process.exit(1)
    }
  )

console.log(result)
