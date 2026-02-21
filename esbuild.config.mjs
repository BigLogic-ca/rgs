import esbuild from 'esbuild'
import alias from 'esbuild-plugin-alias'

import { copy } from 'esbuild-plugin-copy'
import { nodeExternalsPlugin } from 'esbuild-node-externals'

// import { sassPlugin } from 'esbuild-sass-plugin'
// import { ScssModulesPlugin } from 'esbuild-scss-modules-plugin'

import pk from './package.json' with { type: 'json' }
import fs from 'node:fs'

///

const
  common = {
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
    globalName: 'dphelper',
    inject: ['./index.js'],
    define: {
      'process.env.NODE_ENV': '"production"'
    }
  },
  files = {
    assets: [
      { from: '.github/COPYRIGHT.md', to: 'COPYRIGHT.md' },
      { from: '.github/LICENSE.md', to: 'LICENSE.md' },
      { from: '.github/README.md', to: 'README.md' },
      { from: '.github/SECURITY.md', to: 'SECURITY.md' },
      { from: '.github/FUNDING.yml', to: 'FUNDING.yml' },
      { from: './package.json', to: './package.json' }
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
