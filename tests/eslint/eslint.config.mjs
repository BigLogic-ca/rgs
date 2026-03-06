import eslint from '@eslint/js'
import tseslint from "typescript-eslint"
import reactPlugin from "eslint-plugin-react"
import reactHooksPlugin from "eslint-plugin-react-hooks"
import globals from "globals"

export default tseslint.config(
  {
    // env: {
    //   browser: true,
    //   node: true,
    //   commonjs: true
    // },
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended
    ],
    files: ["**/*.ts", "**/*.tsx"],
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
    },
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
        a51: "readonly",
        state: "readonly",
        store: "readonly",
        cache: "readonly",
        dphelper: "readonly",
        $: "readonly",
        jQuery: "readonly",
      },
      parser: tseslint.parser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        tsconfigRootDir: process.cwd(),
        project: ["./tsconfig.json"],
      },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react/display-name": "off",
      "react/prop-types": "off",
      "react-hooks/rules-of-hooks": "off",
      "react-hooks/exhaustive-deps": "off",
      "react-hooks/preserve-manual-memoization": "off",
      "react-hooks/immutability": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_", "caughtErrorsIgnorePattern": "^_" }],
      "@typescript-eslint/no-this-alias": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-unused-expressions": "off",
      "no-console": ["warn", {
        allow: ["group", "groupCollapsed", "groupEnd", "warn", "error", "info", "debug"]
      }],
      "no-empty": "off",
      "no-undef": "off",
      "no-var": "off",
      "prefer-const": "off",
      "no-prototype-builtins": "off",
      "react/jsx-no-undef": "off",
      "react/no-unescaped-entities": "off",
      "react/jsx-no-target-blank": "off",
      "react/jsx-key": "off",
    },
    settings: {
      react: {
        version: "18.0",
      },
    },
  },
  {
    ignores: ["dist/", "node_modules/", "tests/", "jest.config.ts", "esbuild.config.mjs", ".cache/", ".dev/", ".vscode/", "examples/", "plugins/", "vscode-extension/", "public/", "archive/", ".private/", ".backup/", "*old", "*OLD/", "*OLD", "types/", "servers/", "src/pages/nodes/.OLD/", "tsup.config.ts", "tsup.plugin.*.ts"]
  }
)
