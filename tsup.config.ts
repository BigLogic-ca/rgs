import { defineConfig, type Options } from 'tsup'
import { sassPlugin } from 'esbuild-sass-plugin'
import copyStatic from './tsup.plugin.copyStatic'
import pk from "./package.json"

export default defineConfig(
  {
    plugins: [
      copyStatic
    ] as Options['plugins'],
    globalName: pk.code,
    format: ['cjs', 'esm'],
    entry: ['index.ts', 'core/minimal.ts', 'core/advanced.ts'],
    platform: 'browser',
    target: "es2024",
    outDir: 'dist',
    keepNames: false,
    skipNodeModulesBundle: true,
    minifyWhitespace: true,
    legacyOutput: false,
    injectStyle: true,
    splitting: false,
    sourcemap: false,
    treeshake: true,
    minify: 'terser',
    bundle: true,
    clean: true,
    dts: false,
    external: [
      // ...Object.keys(pk.dependencies),
      ...Object.keys(pk.devDependencies),
      ...Object.keys(pk.peerDependencies),
      ...Object.keys(pk.peerDependenciesMeta)
    ],
    noExternal: [
      "immer"
    ],
    swc: {
      swcrc: true
    },
    esbuildPlugins: [
      sassPlugin()
    ],
    esbuildOptions(options) {
      options.legalComments = 'none'
      // options.minify = true
    },
    terserOptions: {
      compress: {
        drop_console: true, // Removes console.log statements
        drop_debugger: true // Removes debugger statements
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
      console.debug("Compilation: OK")
    }
  }
)
