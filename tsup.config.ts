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
    globalName: (pk as any).code ?? 'index',
    format: ['cjs', 'esm'],
    entry: ['index.ts'],
    platform: "browser",
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
    // TODO -
    // noExternal: [
    //   // Force these to be bundled in so they find React at runtime
    //   'react',
    //   'react-dom'
    // ],
    swc: {
      swcrc: true
    },
    esbuildPlugins: [
      sassPlugin()
    ],
    esbuildOptions(options) {
      options.legalComments = 'none'
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
