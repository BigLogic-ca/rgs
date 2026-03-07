import { defineConfig } from 'tsup'
import { sassPlugin } from 'esbuild-sass-plugin'

import { include, plug } from './tsup.setup'

import copyStatic from './tsup.plugin.copyStatic'
import injectCss from './tsup.plugin.injectCss'
import types from './tsup.plugin.types'

import pk from "./package.json"

///

export default defineConfig(
  {
    //! minifyWhitespace: true,
    //! minifyIdentifiers: true,
    //! minifySyntax: true,
    //! minify: true,
    globalName: pk.code,
    format: ['cjs', 'esm'],
    entry: ['index.ts'],
    platform: "node",
    target: "es2024",
    outDir: 'dist',
    minify: 'terser',
    legacyOutput: false,
    injectStyle: true,
    keepNames: false,
    splitting: false,
    sourcemap: false,
    treeshake: true,
    bundle: true,
    clean: true,
    dts: false,
    external: [
      ...Object.keys(pk.devDependencies),
    ],
    //! noExternal: [],
    //! inject: [],
    swc: {
      swcrc: true
    },
    esbuildPlugins: [
      sassPlugin()
    ],
    esbuildOptions(options) {
      options.legalComments = 'none'
      //! options.minify = true
      //! options.alias = {
      //!   'react': require.resolve('react'),
      //!   'react-dom': require.resolve('react-dom'),
      //! }
    },
    terserOptions: {
      mangle: true,
      format: {
        beautify: true,
        comments: false
      },
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    loader: {
      '.ts': 'ts',
      '.tsx': 'tsx',
      '.js': 'js',
      '.jsx': 'jsx',
      '.css': 'css'
    },
    async onSuccess() {
      if (plug.copyStatic) await copyStatic(include)
      if (plug.injectCss) await injectCss()
      if (plug.types) await types()
      console.debug("Compilation: OK")
    }
  }
)
