import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'

// ============================================================================
// CONFIGURATION
// ============================================================================

interface RGSExtensionConfig {
  enableDiagnostics: boolean
  enableAutocomplete: boolean
  enableHover: boolean
  enableSnippets: boolean
}

function getConfig(): RGSExtensionConfig {
  const config = vscode.workspace.getConfiguration('rgs')
  return {
    enableDiagnostics: config.get<boolean>('enableDiagnostics', true),
    enableAutocomplete: config.get<boolean>('enableAutocomplete', true),
    enableHover: config.get<boolean>('enableHover', true),
    enableSnippets: config.get<boolean>('enableSnippets', true),
  }
}

// ============================================================================
// COMPLETIONS DATA
// ============================================================================

interface CompletionData {
  label: string
  kind: vscode.CompletionItemKind
  insertText: string | vscode.SnippetString
  documentation: vscode.MarkdownString
  detail: string
  priority: number
}

// Helper to create MarkdownString
function createMarkdownString(value: string): vscode.MarkdownString {
  const md = new vscode.MarkdownString(value)
  md.isTrusted = true
  return md
}

const completionsData: CompletionData[] = [
  {
    label: 'createStore',
    kind: vscode.CompletionItemKind.Function,
    insertText: new vscode.SnippetString('createStore${1|<S extends Record<string, unknown> = Record<string, unknown>>|}'),
    documentation: createMarkdownString(`## createStore<S>(config?)

Creates an enterprise-grade state management store with full type safety.

**Parameters:**
- \`config?\`: StoreConfig<S> - Optional configuration for the store

**Returns:** IStore<S>

**Example:**
\`\`\`typescript
import { createStore } from '@biglogic/rgs'

const store = createStore<MyState>({
  namespace: 'myApp',
  version: 1,
  persistByDefault: true
})
\`\`\``),
    detail: 'createStore<S>(config?: StoreConfig<S>): IStore<S>',
    priority: 100,
  },
  {
    label: 'initState',
    kind: vscode.CompletionItemKind.Function,
    insertText: new vscode.SnippetString('initState${1|<S extends Record<string, unknown> = Record<string, unknown>>|}'),
    documentation: createMarkdownString(`## initState<S>(config?)

Initialize a global store instance. Throws error if store already exists.

**Parameters:**
- \`config?\`: StoreConfig<S> - Optional store configuration

**Returns:** IStore<S>`),
    detail: 'initState<S>(config?: StoreConfig<S>): IStore<S>',
    priority: 95,
  },
  {
    label: 'useStore',
    kind: vscode.CompletionItemKind.Function,
    insertText: new vscode.SnippetString('useStore${1|<T = unknown, S extends Record<string, unknown> = Record<string, unknown>>|}'),
    documentation: createMarkdownString(`## useStore<T, S>(keyOrSelector, store?)

Reactive Hook for state management.

**Two modes:**
1. **String Key**: \`useStore('count')\` → Returns \`[value, setter]\`
2. **Type-Safe Selector**: \`useStore(state => state.count)\` → Returns value (Read-only)`),
    detail: 'useStore<T, S>(keyOrSelector: string | ((state: S) => T), store?: IStore<S>): T | [...]',
    priority: 90,
  },
  {
    label: 'useSyncedState',
    kind: vscode.CompletionItemKind.Function,
    insertText: new vscode.SnippetString('useSyncedState${1|<T = unknown>|}'),
    documentation: createMarkdownString(`## useSyncedState<T>(key, store?)

Hook for synchronized state management with offline-by-default functionality.

**Returns:** \`[value, setter, SyncState]\``),
    detail: 'useSyncedState<T>(key: string, store?: IStore): readonly [...]',
    priority: 85,
  },
  {
    label: 'useSyncStatus',
    kind: vscode.CompletionItemKind.Function,
    insertText: 'useSyncStatus',
    documentation: createMarkdownString(`## useSyncStatus()

Hook to get global sync status across all sync engines.

**Returns:** \`SyncState\` - { isOnline, isSyncing, pendingChanges, conflicts }`),
    detail: 'useSyncStatus(): SyncState',
    priority: 80,
  },
  {
    label: 'useIsStoreReady',
    kind: vscode.CompletionItemKind.Function,
    insertText: 'useIsStoreReady',
    documentation: createMarkdownString(`## useIsStoreReady(store?)

Hook to check if the store has finished hydration.

**Returns:** \`boolean\``),
    detail: 'useIsStoreReady(store?: IStore): boolean',
    priority: 75,
  },
  {
    label: 'getStore',
    kind: vscode.CompletionItemKind.Function,
    insertText: 'getStore',
    documentation: createMarkdownString(`## getStore()

Get the current default store instance.
Returns null if no store has been initialized.`),
    detail: 'getStore(): IStore<Record<string, unknown>> | null',
    priority: 70,
  },
  {
    label: 'destroyState',
    kind: vscode.CompletionItemKind.Function,
    insertText: 'destroyState',
    documentation: createMarkdownString(`## destroyState()

Cleanup the global state. Safe to call multiple times.`),
    detail: 'destroyState(): void',
    priority: 65,
  },
  {
    label: 'triggerSync',
    kind: vscode.CompletionItemKind.Function,
    insertText: 'triggerSync',
    documentation: createMarkdownString(`## triggerSync(namespace?)

Trigger manual sync for a specific namespace.

**Parameters:**
- \`namespace?\`: string - Optional namespace

**Returns:** \`Promise<void>\``),
    detail: 'triggerSync(namespace?: string): Promise<void>',
    priority: 60,
  },
  {
    label: 'StoreConfig',
    kind: vscode.CompletionItemKind.Interface,
    insertText: 'StoreConfig',
    documentation: createMarkdownString(`## StoreConfig<S>

Configuration options for creating a store.

**Properties:**
- \`namespace?\`: string - Unique namespace (default: 'gstate')
- \`version?\`: number - Schema version
- \`silent?\`: boolean - Suppress console warnings
- \`debounceTime?\`: number - Flush delay in ms
- \`storage?\`: CustomStorage - Storage adapter
- \`persistByDefault?\`: boolean - Persist all keys
- \`encryptionKey?\`: EncryptionKey - AES-256-GCM key
- \`auditEnabled?\`: boolean - Enable audit logging
- \`accessRules?\`: AccessRule[] - RBAC rules
- \`sync?\`: SyncConfig - Local-first sync`),
    detail: 'interface StoreConfig<S>',
    priority: 45,
  },
  {
    label: 'IStore',
    kind: vscode.CompletionItemKind.Interface,
    insertText: 'IStore',
    documentation: createMarkdownString(`## IStore<S>

Main store interface with full type safety.

**Methods:**
- \`set(key, value, options?): boolean\`
- \`get(key): T | null\`
- \`compute(key, selector): T\`
- \`watch(key, callback): () => void\`
- \`remove(key): boolean\`
- \`delete(key): boolean\`
- \`deleteAll(): boolean\`
- \`transaction(fn): void\`
- \`destroy(): void\``),
    detail: 'interface IStore<S>',
    priority: 44,
  },
  {
    label: 'PersistOptions',
    kind: vscode.CompletionItemKind.Interface,
    insertText: 'PersistOptions',
    documentation: createMarkdownString(`## PersistOptions

Options for persisting state values.

**Properties:**
- \`persist?\`: boolean - Persist to storage
- \`encrypted?\`: boolean - AES-256-GCM encryption
- \`encoded?\`: boolean - Base64 encoding
- \`ttl?\`: number - Time-to-live in ms`),
    detail: 'interface PersistOptions',
    priority: 43,
  },
  {
    label: 'StateUpdater',
    kind: vscode.CompletionItemKind.TypeParameter,
    insertText: 'StateUpdater',
    documentation: createMarkdownString(`## StateUpdater<T>

Function to update state immutably (used with Immer).

**Type:** \`(draft: T) => void | T\``),
    detail: 'type StateUpdater<T>',
    priority: 42,
  },
  {
    label: 'ComputedSelector',
    kind: vscode.CompletionItemKind.TypeParameter,
    insertText: 'ComputedSelector',
    documentation: createMarkdownString(`## ComputedSelector<T>

Selector function for computed values.

**Type:** \`(get: <V>(key: string) => V | null) => T\``),
    detail: 'type ComputedSelector<T>',
    priority: 41,
  },
  {
    label: 'IPlugin',
    kind: vscode.CompletionItemKind.Interface,
    insertText: 'IPlugin',
    documentation: createMarkdownString(`## IPlugin<S>

Plugin interface for extending store functionality.

**Lifecycle Hooks:**
- \`onInit\`, \`onInstall\`, \`onSet\`, \`onGet\`
- \`onRemove\`, \`onDestroy\`, \`onTransaction\`
- \`onBeforeSet\`, \`onAfterSet\``),
    detail: 'interface IPlugin<S>',
    priority: 40,
  },
  {
    label: 'gstate',
    kind: vscode.CompletionItemKind.Module,
    insertText: 'gstate',
    documentation: createMarkdownString(`## gstate

RGS state management library alias.

\`\`\`typescript
import { createStore, useStore } from 'gstate'
\`\`\``),
    detail: 'RGS State Management Library',
    priority: 30,
  },
  {
    label: 'rgs',
    kind: vscode.CompletionItemKind.Module,
    insertText: 'rgs',
    documentation: createMarkdownString(`## rgs

RGS state management library (same as gstate).`),
    detail: 'RGS State Management Library',
    priority: 29,
  },
]

// ============================================================================
// HOVER INFORMATION
// ============================================================================

const hoverData: Record<string, { content: string; detail?: string }> = {
  'createStore': {
    content: '## createStore<S>(config?) → IStore<S>\n\nCreates an enterprise-grade state management store.',
    detail: 'function createStore<S>(config?: StoreConfig<S>): IStore<S>',
  },
  'initState': {
    content: '## initState<S>(config?) → IStore<S>\n\nInitialize a global store instance.',
    detail: 'function initState<S>(config?: StoreConfig<S>): IStore<S>',
  },
  'useStore': {
    content: '## useStore<T, S>(keyOrSelector, store?)\n\nReactive Hook for state management.\n- String Key → [value, setter]\n- Selector → value (read-only)',
    detail: 'function useStore<T, S>(keyOrSelector, store?): T | [...]',
  },
  'useSyncedState': {
    content: '## useSyncedState<T>(key, store?)\n\nHook for synchronized state with offline support.',
    detail: 'function useSyncedState<T>(key, store?): [...]',
  },
  'useSyncStatus': {
    content: '## useSyncStatus()\n\nGet global sync status: { isOnline, isSyncing, pendingChanges, conflicts }',
    detail: 'function useSyncStatus(): SyncState',
  },
  'useIsStoreReady': {
    content: '## useIsStoreReady(store?)\n\nCheck if store has finished hydration.',
    detail: 'function useIsStoreReady(store?): boolean',
  },
  'getStore': {
    content: '## getStore()\n\nGet current default store instance.',
    detail: 'function getStore(): IStore | null',
  },
  'destroyState': {
    content: '## destroyState()\n\nCleanup global state.',
    detail: 'function destroyState(): void',
  },
  'triggerSync': {
    content: '## triggerSync(namespace?)\n\nTrigger manual sync.',
    detail: 'function triggerSync(namespace?): Promise<void>',
  },
  'IStore': {
    content: '## IStore<S>\n\nMain store interface.\n\n**Methods:** set, get, compute, watch, remove, delete, deleteAll, list, use, transaction, destroy',
    detail: 'interface IStore<S>',
  },
  'StoreConfig': {
    content: '## StoreConfig<S>\n\nStore configuration options.\n\n**Properties:** namespace, version, silent, debounceTime, storage, migrate, persistByDefault, onError, encryptionKey, auditEnabled',
    detail: 'interface StoreConfig<S>',
  },
  'PersistOptions': {
    content: '## PersistOptions\n\nOptions: persist?, encrypted?, encoded?, ttl?',
    detail: 'interface PersistOptions',
  },
  'StateUpdater': {
    content: '## StateUpdater<T>\n\nFunction to update state immutably with Immer.',
    detail: 'type StateUpdater<T>',
  },
  'ComputedSelector': {
    content: '## ComputedSelector<T>\n\nSelector for computed values: (get) => T',
    detail: 'type ComputedSelector<T>',
  },
  'IPlugin': {
    content: '## IPlugin<S>\n\nPlugin interface with lifecycle hooks.',
    detail: 'interface IPlugin<S>',
  },
}

// ============================================================================
// DIAGNOSTICS
// ============================================================================

interface DiagnosticRule {
  pattern: RegExp
  message: string
  severity: vscode.DiagnosticSeverity
  suggest?: string
}

const diagnosticRules: DiagnosticRule[] = [
  {
    pattern: /store\.set\s*\(\s*['"`][\w:]+['"`]\s*,\s*undefined/,
    message: 'RGS: Setting undefined value - consider using remove() instead',
    severity: vscode.DiagnosticSeverity.Warning,
    suggest: 'Use store.remove(key) to delete a key',
  },
  {
    pattern: /store\.get\s*\(\s*['"`][\w:]+['"`]\s*\)\s*===\s*undefined/,
    message: 'RGS: Use optional chaining or null check: store.get(key) ?? defaultValue',
    severity: vscode.DiagnosticSeverity.Hint,
  },
  {
    pattern: /createStore\s*\(\s*\{[^}]*namespace:\s*['"`]?\s*['"`]?\s*\}/,
    message: 'RGS: Store namespace is required for multiple stores',
    severity: vscode.DiagnosticSeverity.Information,
  },
  {
    pattern: /initState\s*\(\s*\{[^}]*namespace:\s*undefined\s*\}/,
    message: 'RGS: initState with undefined namespace will return existing store',
    severity: vscode.DiagnosticSeverity.Warning,
  },
  {
    pattern: /useStore\s*\(\s*['"`]/,
    message: 'RGS: String keys lose type safety. Consider using selectors: useStore(state => state.key)',
    severity: vscode.DiagnosticSeverity.Information,
    suggest: 'useStore(state => state.keyName)',
  },
  {
    pattern: /store\.compute\s*\(\s*['"`][\w]+['"`]\s*,\s*async/,
    message: 'RGS: compute() does not support async functions directly. Use watch() for async.',
    severity: vscode.DiagnosticSeverity.Error,
    suggest: 'Use store.watch(key, async (val) => {...}) instead',
  },
  {
    pattern: /addAccessRule\s*\(\s*['"`][^'"]*\*[^'"]*['"`]\s*,/,
    message: 'RGS: Wildcard patterns in access rules should use regex format: "user:.*"',
    severity: vscode.DiagnosticSeverity.Hint,
  },
  {
    pattern: /set\s*\(\s*['"`]__proto__['"`]/,
    message: 'RGS: Cannot set __proto__ key - security risk',
    severity: vscode.DiagnosticSeverity.Error,
  },
  {
    pattern: /set\s*\(\s*['"`]constructor['"`]/,
    message: 'RGS: Cannot set constructor key - security risk',
    severity: vscode.DiagnosticSeverity.Error,
  },
  {
    pattern: /set\s*\(\s*['"`]prototype['"`]/,
    message: 'RGS: Cannot set prototype key - security risk',
    severity: vscode.DiagnosticSeverity.Error,
  },
]

// ============================================================================
// RGS STATE EXPLORER - DATA TYPES
// ============================================================================

interface StoreInfo {
  name: string
  filePath: string
  line: number
  type: 'createStore' | 'initState' | 'gstate'
  config: {
    namespace?: string
    persistByDefault?: boolean
    encryptionKey?: string
    auditEnabled?: boolean
    accessRules?: Array<{ pattern: string; allow: string[] }>
    sync?: boolean
  }
  keys: string[]
  plugins: string[]
}

interface StateUsage {
  key: string
  filePath: string
  line: number
  type: 'useStore' | 'useSyncedState'
}

interface PluginInfo {
  name: string
  filePath: string
  line: number
}

interface Violation {
  message: string
  severity: 'error' | 'warning' | 'info'
  filePath: string
  line: number
}

interface WorkspaceAnalysis {
  stores: StoreInfo[]
  states: StateUsage[]
  plugins: PluginInfo[]
  violations: Violation[]
  timestamp: Date
}

// ============================================================================
// RGS WELCOME VIEW
// ============================================================================

class RGSWelcomeProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<vscode.TreeItem | undefined | void>()
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event

  private analysis: WorkspaceAnalysis | null = null

  setAnalysis(analysis: WorkspaceAnalysis): void {
    this.analysis = analysis
    this._onDidChangeTreeData.fire()
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element
  }

  getChildren(): vscode.TreeItem[] {
    const items: vscode.TreeItem[] = []

    // Header
    const header = new vscode.TreeItem('⚡ RGS (Argis)', vscode.TreeItemCollapsibleState.None)
    header.contextValue = 'header'
    items.push(header)

    // ========================================================================
    // SECTION 1: Stores List (gstate stores in the project)
    // ========================================================================
    const storesHeader = new vscode.TreeItem('📦 Stores', vscode.TreeItemCollapsibleState.Expanded)
    storesHeader.contextValue = 'sectionHeader'
    items.push(storesHeader)

    if (this.analysis && this.analysis.stores.length > 0) {
      // Show all stores
      for (const store of this.analysis.stores) {
        const storeItem = new vscode.TreeItem(
          store.name,
          vscode.TreeItemCollapsibleState.None
        )
        storeItem.contextValue = 'store'
        storeItem.resourceUri = vscode.Uri.file(store.filePath)
        storeItem.description = store.config.namespace || 'default'
        storeItem.tooltip = `${store.filePath}:${store.line}`
        items.push(storeItem)
      }
    } else {
      const noStores = new vscode.TreeItem('No stores found', vscode.TreeItemCollapsibleState.None)
      noStores.contextValue = 'empty'
      noStores.description = 'Run Analyze Workspace'
      items.push(noStores)
    }

    // ========================================================================
    // SECTION 2: Empty (reserved for future use)
    // ========================================================================
    const section2Header = new vscode.TreeItem('🔧 Tools', vscode.TreeItemCollapsibleState.Expanded)
    section2Header.contextValue = 'sectionHeader'
    items.push(section2Header)

    const analyzeAction = new vscode.TreeItem('Analyze Workspace', vscode.TreeItemCollapsibleState.None)
    analyzeAction.command = { command: 'rgs.analyzeWorkspace', title: 'Analyze Workspace' }
    analyzeAction.contextValue = 'action'
    items.push(analyzeAction)

    // ========================================================================
    // SECTION 3: Copyright & Links
    // ========================================================================
    const section3Header = new vscode.TreeItem('📚 Resources', vscode.TreeItemCollapsibleState.Expanded)
    section3Header.contextValue = 'sectionHeader'
    items.push(section3Header)

    const docsAction = new vscode.TreeItem('📖 Documentation', vscode.TreeItemCollapsibleState.None)
    docsAction.command = { command: 'vscode.open', title: 'Open Docs', arguments: ['https://biglogic.ai/rgs/docs'] }
    docsAction.contextValue = 'link'
    items.push(docsAction)

    const guideAction = new vscode.TreeItem('🚀 Getting Started', vscode.TreeItemCollapsibleState.None)
    guideAction.command = { command: 'vscode.open', title: 'Open Guide', arguments: ['https://biglogic.ai/rgs/docs/getting-started'] }
    guideAction.contextValue = 'link'
    items.push(guideAction)

    const githubAction = new vscode.TreeItem('🐙 GitHub', vscode.TreeItemCollapsibleState.None)
    githubAction.command = { command: 'vscode.open', title: 'Open GitHub', arguments: ['https://github.com/BigLogic-ca/rgs'] }
    githubAction.contextValue = 'link'
    items.push(githubAction)

    // Copyright footer
    const copyright = new vscode.TreeItem('© 2024 BigLogic. MIT License', vscode.TreeItemCollapsibleState.None)
    copyright.contextValue = 'footer'
    copyright.description = 'v3.8.2'
    items.push(copyright)

    return items
  }
}

// ============================================================================
// RGS WELCOME WEBVIEW
// ============================================================================

class RGSWelcomeWebview {
  static show(context: vscode.ExtensionContext): void {
    const panel = vscode.window.createWebviewPanel(
      'rgsWelcome',
      'RGS Welcome',
      vscode.ViewColumn.One,
      { enableScripts: true, retainContextWhenHidden: true }
    )

    panel.webview.html = this.getHtml()
  }

  private static getHtml(): string {
    return `<!DOCTYPE html>
<html>
<head>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 0;
      margin: 0;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: #fff;
      min-height: 100vh;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    .logo {
      text-align: center;
      margin-bottom: 40px;
    }
    .logo svg {
      width: 80px;
      height: 80px;
    }
    h1 {
      font-size: 2.5em;
      margin: 20px 0 10px;
      background: linear-gradient(90deg, #00d4ff, #7b2ff7);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .subtitle {
      font-size: 1.2em;
      color: #8892b0;
      margin-bottom: 40px;
    }
    .features {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin: 40px 0;
    }
    .feature {
      background: rgba(255,255,255,0.05);
      border-radius: 12px;
      padding: 20px;
      border: 1px solid rgba(255,255,255,0.1);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .feature:hover {
      transform: translateY(-5px);
      box-shadow: 0 10px 30px rgba(0,212,255,0.2);
    }
    .feature h3 {
      color: #00d4ff;
      margin: 0 0 10px;
      font-size: 1.1em;
    }
    .feature p {
      color: #8892b0;
      font-size: 0.9em;
      margin: 0;
      line-height: 1.5;
    }
    .actions {
      display: flex;
      gap: 15px;
      justify-content: center;
      margin-top: 40px;
      flex-wrap: wrap;
    }
    .btn {
      padding: 12px 30px;
      border-radius: 8px;
      font-size: 1em;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      text-decoration: none;
      display: inline-block;
    }
    .btn-primary {
      background: linear-gradient(90deg, #00d4ff, #7b2ff7);
      color: #fff;
      border: none;
    }
    .btn-primary:hover {
      transform: scale(1.05);
      box-shadow: 0 5px 20px rgba(0,212,255,0.4);
    }
    .btn-secondary {
      background: transparent;
      color: #00d4ff;
      border: 2px solid #00d4ff;
    }
    .btn-secondary:hover {
      background: rgba(0,212,255,0.1);
    }
    .version {
      text-align: center;
      margin-top: 60px;
      color: #4a5568;
      font-size: 0.85em;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <svg viewBox="0 0 24 24" fill="none" stroke="#00d4ff" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 6v6l4 2"/>
        <circle cx="12" cy="12" r="2" fill="#00d4ff"/>
      </svg>
    </div>

    <h1>RGS (Argis)</h1>
    <p class="subtitle">Reactive Global State Management for React</p>

    <div class="features">
      <div class="feature">
        <h3>One-Line State</h3>
        <p>Create type-safe stores with a single line of code. No boilerplate required.</p>
      </div>
      <div class="feature">
        <h3>Built-in Security</h3>
        <p>AES-256 encryption, RBAC, and GDPR compliance out of the box.</p>
      </div>
      <div class="feature">
        <h3>Offline-First</h3>
        <p>Local-first sync with automatic cloud synchronization when online.</p>
      </div>
      <div class="feature">
        <h3>Plugin System</h3>
        <p>Extensible with undo/redo, persistence, DevTools, and more.</p>
      </div>
    </div>

    <div class="actions">
      <button class="btn btn-primary" onclick="vscode.postMessage({command:'analyze'})">
        Analyze Workspace
      </button>
      <a class="btn btn-secondary" href="https://github.com/BigLogic-ca/rgs" target="_blank">
        View Documentation
      </a>
    </div>

    <p class="version">Version 3.8.2 | MIT License</p>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
  </script>
</body>
</html>`
  }
}

// ============================================================================
// RGS STATE EXPLORER - TREE VIEW
// ============================================================================

class RGSTreeItem extends vscode.TreeItem {
  children?: RGSTreeItem[]
  storeInfo?: StoreInfo
  stateUsage?: StateUsage
  pluginInfo?: PluginInfo

  constructor(
    public label: string,
    public collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly itemType: 'store' | 'state' | 'plugin' | 'folder' | 'violation'
  ) {
    super(label, collapsibleState)
    this.contextValue = itemType
  }
}

class RGSStateExplorerProvider implements vscode.TreeDataProvider<RGSTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<RGSTreeItem | undefined | void>()
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event

  public analysis: WorkspaceAnalysis | null = null

  setAnalysis(analysis: WorkspaceAnalysis): void {
    this.analysis = analysis
    this._onDidChangeTreeData.fire()
  }

  getTreeItem(element: RGSTreeItem): vscode.TreeItem {
    return element
  }

  getChildren(element?: RGSTreeItem): RGSTreeItem[] {
    if (!this.analysis) {
      return [new RGSTreeItem('Run "RGS: Analyze Workspace" to scan', vscode.TreeItemCollapsibleState.None, 'folder')]
    }

    if (!element) {
      // Root level - show categories
      const items: RGSTreeItem[] = []

      // Stores folder
      if (this.analysis.stores.length > 0) {
        const storesFolder = new RGSTreeItem(
          `Stores (${this.analysis.stores.length})`,
          vscode.TreeItemCollapsibleState.Expanded,
          'folder'
        )
        storesFolder.children = this.analysis.stores.map(store => {
          const item = new RGSTreeItem(
            store.name,
            vscode.TreeItemCollapsibleState.Collapsed,
            'store'
          )
          item.storeInfo = store
          item.description = store.type
          item.resourceUri = vscode.Uri.file(store.filePath)
          return item
        })
        items.push(storesFolder)
      }

      // States folder
      if (this.analysis.states.length > 0) {
        const statesFolder = new RGSTreeItem(
          `State Usages (${this.analysis.states.length})`,
          vscode.TreeItemCollapsibleState.Expanded,
          'folder'
        )
        statesFolder.children = this.analysis.states.map(state => {
          const item = new RGSTreeItem(
            state.key,
            vscode.TreeItemCollapsibleState.None,
            'state'
          )
          item.stateUsage = state
          item.description = state.type
          item.resourceUri = vscode.Uri.file(state.filePath)
          return item
        })
        items.push(statesFolder)
      }

      // Plugins folder
      if (this.analysis.plugins.length > 0) {
        const pluginsFolder = new RGSTreeItem(
          `Plugins (${this.analysis.plugins.length})`,
          vscode.TreeItemCollapsibleState.Expanded,
          'folder'
        )
        pluginsFolder.children = this.analysis.plugins.map(plugin => {
          const item = new RGSTreeItem(
            plugin.name,
            vscode.TreeItemCollapsibleState.None,
            'plugin'
          )
          item.pluginInfo = plugin
          item.resourceUri = vscode.Uri.file(plugin.filePath)
          return item
        })
        items.push(pluginsFolder)
      }

      // Violations folder
      if (this.analysis.violations.length > 0) {
        const violationsFolder = new RGSTreeItem(
          `Issues (${this.analysis.violations.length})`,
          vscode.TreeItemCollapsibleState.Expanded,
          'folder'
        )
        violationsFolder.children = this.analysis.violations.map(violation => {
          const item = new RGSTreeItem(
            violation.message,
            vscode.TreeItemCollapsibleState.None,
            'violation'
          )
          item.resourceUri = vscode.Uri.file(violation.filePath)
          item.contextValue = 'violation:' + violation.severity
          return item
        })
        items.push(violationsFolder)
      }

      return items
    }

    if (element.itemType === 'store' && element.storeInfo) {
      // Store details children
      const children: RGSTreeItem[] = []

      // Configuration
      const config = element.storeInfo.config
      if (config.namespace || config.persistByDefault || config.encryptionKey || config.auditEnabled) {
        const configItem = new RGSTreeItem(
          'Configuration',
          vscode.TreeItemCollapsibleState.Expanded,
          'folder'
        )
        const configChildren: RGSTreeItem[] = []
        if (config.namespace) configChildren.push(new RGSTreeItem('namespace: ' + config.namespace, vscode.TreeItemCollapsibleState.None, 'folder'))
        if (config.persistByDefault !== undefined) configChildren.push(new RGSTreeItem('persistByDefault: ' + config.persistByDefault, vscode.TreeItemCollapsibleState.None, 'folder'))
        if (config.encryptionKey) configChildren.push(new RGSTreeItem('encryption: enabled', vscode.TreeItemCollapsibleState.None, 'folder'))
        if (config.auditEnabled) configChildren.push(new RGSTreeItem('auditEnabled: ' + config.auditEnabled, vscode.TreeItemCollapsibleState.None, 'folder'))
        if (config.accessRules && config.accessRules.length > 0) configChildren.push(new RGSTreeItem('accessRules: ' + config.accessRules.length + ' rules', vscode.TreeItemCollapsibleState.None, 'folder'))
        if (config.sync) configChildren.push(new RGSTreeItem('sync: enabled', vscode.TreeItemCollapsibleState.None, 'folder'))
        configItem.children = configChildren
        children.push(configItem)
      }

      // Keys
      if (element.storeInfo.keys.length > 0) {
        const keysItem = new RGSTreeItem(
          'Keys (' + element.storeInfo.keys.length + ')',
          vscode.TreeItemCollapsibleState.Expanded,
          'folder'
        )
        keysItem.children = element.storeInfo.keys.map(key =>
          new RGSTreeItem(key, vscode.TreeItemCollapsibleState.None, 'folder')
        )
        children.push(keysItem)
      }

      // Plugins
      if (element.storeInfo.plugins.length > 0) {
        const pluginsItem = new RGSTreeItem(
          'Plugins (' + element.storeInfo.plugins.length + ')',
          vscode.TreeItemCollapsibleState.Expanded,
          'folder'
        )
        pluginsItem.children = element.storeInfo.plugins.map(plugin =>
          new RGSTreeItem(plugin, vscode.TreeItemCollapsibleState.None, 'folder')
        )
        children.push(pluginsItem)
      }

      // File location
      const locationItem = new RGSTreeItem(
        'File: ' + path.basename(element.storeInfo.filePath) + ':' + element.storeInfo.line,
        vscode.TreeItemCollapsibleState.None,
        'folder'
      )
      children.push(locationItem)

      return children
    }

    return element.children || []
  }
}

// ============================================================================
// RGS STATE EXPLORER - ANALYZER
// ============================================================================

class WorkspaceAnalyzer {
  async analyze(workspaceFolder: vscode.WorkspaceFolder): Promise<WorkspaceAnalysis> {
    const stores: StoreInfo[] = []
    const states: StateUsage[] = []
    const plugins: PluginInfo[] = []
    const violations: Violation[] = []

    const files = await this.findTypeScriptFiles(workspaceFolder.uri.fsPath)

    for (const filePath of files) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8')

        // Find store creations: createStore(), initState()
        const storePattern = /(?:const|let|var)\s+(\w+)\s*=\s*(createStore|initState)\s*[<(]/g
        let match: RegExpExecArray | null
        while ((match = storePattern.exec(content)) !== null) {
          const varName = match[1]
          const funcType = match[2] as 'createStore' | 'initState'
          const lineNumber = content.substring(0, match.index).split('\n').length

          // Extract configuration
          const config = this.extractStoreConfig(content, match.index)

          // Find keys used with this store
          const keys = this.findStoreKeys(content, varName)

          // Find plugins
          const filePlugins = this.findPlugins(content)

          stores.push({
            name: varName,
            filePath,
            line: lineNumber,
            type: funcType,
            config,
            keys,
            plugins: filePlugins
          })
        }

        // Find state usages: useStore(), useSyncedState()
        const statePattern = /useStore\s*<[^>]*>\s*\(\s*(?:['"`]([^'"`]+)['"`]|state\s*=>\s*state\.(\w+))/g
        while ((match = statePattern.exec(content)) !== null) {
          const key = match[1] || match[2]
          if (key) {
            const lineNumber = content.substring(0, match.index).split('\n').length
            states.push({
              key,
              filePath,
              line: lineNumber,
              type: 'useStore'
            })
          }
        }

        // useSyncedState
        const syncedStatePattern = /useSyncedState\s*<[^>]*>\s*\(\s*['"`]([^'"`]+)['"`]/g
        while ((match = syncedStatePattern.exec(content)) !== null) {
          const key = match[1]
          if (key) {
            const lineNumber = content.substring(0, match.index).split('\n').length
            states.push({
              key,
              filePath,
              line: lineNumber,
              type: 'useSyncedState'
            })
          }
        }

        // Find plugins: _addPlugin()
        const pluginPattern = /_addPlugin\s*\(\s*['"`]([^'"`]+)['"`]/g
        while ((match = pluginPattern.exec(content)) !== null) {
          const lineNumber = content.substring(0, match.index).split('\n').length
          plugins.push({
            name: match[1],
            filePath,
            line: lineNumber
          })
        }

        // Check for violations
        const fileViolations = this.checkViolations(content, filePath)
        violations.push(...fileViolations)

      } catch (error) {
        console.error('Error analyzing file ' + filePath + ':', error)
      }
    }

    return {
      stores,
      states,
      plugins,
      violations,
      timestamp: new Date()
    }
  }

  private async findTypeScriptFiles(dirPath: string): Promise<string[]> {
    const files: string[] = []
    const excludeDirs = ['node_modules', '.git', 'dist', 'build', 'coverage', '.vscode']

    const items = fs.readdirSync(dirPath)
    for (const item of items) {
      if (excludeDirs.includes(item)) continue

      const fullPath = path.join(dirPath, item)
      const stat = fs.statSync(fullPath)

      if (stat.isDirectory()) {
        const subFiles = await this.findTypeScriptFiles(fullPath)
        files.push(...subFiles)
      } else if (/\.(ts|tsx|js|jsx)$/.test(item) && !item.endsWith('.d.ts')) {
        files.push(fullPath)
      }
    }

    return files
  }

  private extractStoreConfig(content: string, matchIndex: number): StoreInfo['config'] {
    const config: StoreInfo['config'] = {}

    const afterMatch = content.substring(matchIndex)

    // Look for namespace
    const namespaceMatch = afterMatch.match(/namespace:\s*['"`]([^'"`]+)['"`]/)
    if (namespaceMatch) config.namespace = namespaceMatch[1]

    // Look for persistByDefault
    const persistMatch = afterMatch.match(/persistByDefault:\s*(true|false)/)
    if (persistMatch) config.persistByDefault = persistMatch[1] === 'true'

    // Look for encryptionKey
    const encryptMatch = afterMatch.match(/encryptionKey:/)
    if (encryptMatch) config.encryptionKey = 'provided'

    // Look for auditEnabled
    const auditMatch = afterMatch.match(/auditEnabled:\s*(true|false)/)
    if (auditMatch) config.auditEnabled = auditMatch[1] === 'true'

    // Look for accessRules
    const accessRulesMatch = afterMatch.match(/accessRules:\s*\[/)
    if (accessRulesMatch) {
      config.accessRules = []
    }

    // Look for sync
    const syncMatch = afterMatch.match(/sync:\s*\{/)
    if (syncMatch) config.sync = true

    return config
  }

  private findStoreKeys(content: string, storeName: string): string[] {
    const foundKeys: Set<string> = new Set()

    // Look for store.get('key') and store.set('key', ...)
    const escapedName = storeName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const getSetPattern = new RegExp(escapedName + '\\.\\w+\\s*\\(\\s*[\'"`]([^\'"`]+)[\'"`]', 'g')
    let match: RegExpExecArray | null
    while ((match = getSetPattern.exec(content)) !== null) {
      const key = match[1]
      if (key && !key.includes('__proto__') && !key.includes('constructor')) {
        foundKeys.add(key)
      }
    }

    return Array.from(foundKeys)
  }

  private findPlugins(content: string): string[] {
    const plugins: string[] = []

    // Look for .use() or .install() calls on stores
    const pluginPattern = /\.use\s*\(\s*(\w+(?:\.\w+)?)/g
    let match: RegExpExecArray | null
    while ((match = pluginPattern.exec(content)) !== null) {
      plugins.push(match[1])
    }

    return plugins
  }

  private checkViolations(content: string, filePath: string): Violation[] {
    const violations: Violation[] = []

    // Check for missing namespace in multi-store projects
    const storeCount = (content.match(/(createStore|initState)\s*\(/g) || []).length
    const hasNoNamespace = content.includes('createStore') && !content.includes('namespace:')

    if (storeCount > 1 && hasNoNamespace) {
      const lineMatch = content.match(/createStore\s*\(/)?.[0]
      if (lineMatch) {
        const lineNum = content.substring(0, content.indexOf(lineMatch)).split('\n').length
        violations.push({
          message: 'Multiple stores without namespace - may cause conflicts',
          severity: 'warning',
          filePath,
          line: lineNum
        })
      }
    }

    // Check for insecure keys
    const insecureKeys = ['__proto__', 'constructor', 'prototype']
    for (const key of insecureKeys) {
      const pattern = new RegExp('set\\s*\\(\\s*[\'"`]' + key + '[\'"`]', 'g')
      if (pattern.test(content)) {
        const match = content.match(pattern)
        const lineNum = match ? content.substring(0, content.indexOf(match[0])).split('\n').length : 1
        violations.push({
          message: 'Security: Cannot set ' + key + ' - security risk',
          severity: 'error',
          filePath,
          line: lineNum
        })
      }
    }

    // Check for missing encryption on sensitive data
    const sensitivePatterns = ['password', 'token', 'secret', 'key', 'credential']
    for (const pattern of sensitivePatterns) {
      const keyPattern = new RegExp('set\\s*\\(\\s*[\'"`][^\'"`]*' + pattern + '[^\'"`]*[\'"`]', 'i')
      if (keyPattern.test(content) && !content.includes('encrypted:')) {
        const match = keyPattern.exec(content)
        if (match) {
          const lineNum = content.substring(0, match.index).split('\n').length
          violations.push({
            message: 'Sensitive key \'' + pattern + '\' should be encrypted',
            severity: 'warning',
            filePath,
            line: lineNum
          })
        }
      }
    }

    return violations
  }
}

// ============================================================================
// RGS STATE EXPLORER - DETAIL VIEW
// ============================================================================

class StoreDetailView {
  static register(context: vscode.ExtensionContext, treeProvider: RGSStateExplorerProvider): void {
    // Create WebView Panel for store details
    const showStoreDetails = async () => {
      if (!treeProvider.analysis?.stores?.length) {
        vscode.window.showInformationMessage('Run "RGS: Analyze Workspace" first')
        return
      }

      const storeNames = treeProvider.analysis.stores.map((s: StoreInfo) => s.name)
      const selected = await vscode.window.showQuickPick(storeNames, {
        placeHolder: 'Select a store to view details'
      })

      if (!selected) return

      const store = treeProvider.analysis.stores.find((s: StoreInfo) => s.name === selected)
      if (!store) return

      const panel = vscode.window.createWebviewPanel(
        'rgsStoreDetails',
        'Store: ' + store.name,
        vscode.ViewColumn.One,
        { enableScripts: true }
      )

      const html = this.generateDetailHtml(store, treeProvider.analysis)
      panel.webview.html = html
    }

    context.subscriptions.push(
      vscode.commands.registerCommand('rgs.showStoreDetails', showStoreDetails)
    )
  }

  private static generateDetailHtml(store: StoreInfo, analysis: WorkspaceAnalysis): string {
    const config = store.config
    const relatedStates = analysis.states.filter((s: StateUsage) =>
      store.keys.includes(s.key)
    )

    return `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; }
    h1 { color: #0078d4; border-bottom: 2px solid #0078d4; padding-bottom: 10px; }
    h2 { color: #333; margin-top: 20px; }
    .section { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 10px 0; }
    .config-item { display: flex; padding: 5px 0; }
    .config-label { font-weight: bold; width: 150px; }
    .config-value { color: #0078d4; }
    .key-badge { background: #0078d4; color: white; padding: 3px 8px; border-radius: 3px; margin: 2px; display: inline-block; font-size: 12px; }
    .plugin-badge { background: #107c10; color: white; padding: 3px 8px; border-radius: 3px; margin: 2px; display: inline-block; font-size: 12px; }
    .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 10px; border-radius: 5px; margin: 10px 0; }
    .error { background: #f8d7da; border: 1px solid #f5c6cb; padding: 10px; border-radius: 5px; margin: 10px 0; }
    .info { background: #d1ecf1; border: 1px solid #bee5eb; padding: 10px; border-radius: 5px; margin: 10px 0; }
    .meta { color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <h1>Store: ${store.name}</h1>
  <p class="meta">File: ${store.filePath}:${store.line}</p>

  <div class="section">
    <h2>Configuration</h2>
    <div class="config-item">
      <span class="config-label">Type:</span>
      <span class="config-value">${store.type}</span>
    </div>
    <div class="config-item">
      <span class="config-label">Namespace:</span>
      <span class="config-value">${config.namespace || 'default'}</span>
    </div>
    <div class="config-item">
      <span class="config-label">Persist by Default:</span>
      <span class="config-value">${config.persistByDefault !== undefined ? config.persistByDefault : 'false'}</span>
    </div>
    <div class="config-item">
      <span class="config-label">Encryption:</span>
      <span class="config-value">${config.encryptionKey ? 'Enabled' : 'Not configured'}</span>
    </div>
    <div class="config-item">
      <span class="config-label">Audit Logging:</span>
      <span class="config-value">${config.auditEnabled ? 'Enabled' : 'Disabled'}</span>
    </div>
    <div class="config-item">
      <span class="config-label">Sync:</span>
      <span class="config-value">${config.sync ? 'Enabled' : 'Disabled'}</span>
    </div>
    <div class="config-item">
      <span class="config-label">Access Rules:</span>
      <span class="config-value">${config.accessRules?.length || 0} rules defined</span>
    </div>
  </div>

  <div class="section">
    <h2>Keys (${store.keys.length})</h2>
    ${store.keys.length > 0
        ? store.keys.map((k: string) => '<span class="key-badge">' + k + '</span>').join(' ')
        : '<p>No keys detected</p>'}
  </div>

  <div class="section">
    <h2>Plugins (${store.plugins.length})</h2>
    ${store.plugins.length > 0
        ? store.plugins.map((p: string) => '<span class="plugin-badge">' + p + '</span>').join(' ')
        : '<p>No plugins detected</p>'}
  </div>

  <div class="section">
    <h2>State Usages</h2>
    <p>Listeners/Subscriptions: ${relatedStates.length}</p>
    ${relatedStates.length > 0
        ? relatedStates.map((s: StateUsage) => `
        <div class="info">
          Key: ${s.key} (${s.type})<br>
          <span class="meta">${path.basename(s.filePath)}:${s.line}</span>
        </div>
      `).join('')
        : '<p>No usages detected</p>'}
  </div>
</body>
</html>`
  }
}

// ============================================================================
// EXTENSION ACTIVATION
// ============================================================================

export function activate(context: vscode.ExtensionContext): void {
  console.log('RGS IntelliSense extension activated')

  const config = getConfig()
  const analyzer = new WorkspaceAnalyzer()
  const treeProvider = new RGSStateExplorerProvider()
  const welcomeProvider = new RGSWelcomeProvider()

  // Register Welcome View (Activity Bar)
  const welcomeView = vscode.window.createTreeView('rgsWelcome', {
    treeDataProvider: welcomeProvider,
    showCollapseAll: false
  })
  context.subscriptions.push(welcomeView)

  // Handle welcome view store item clicks - navigate to code
  welcomeView.onDidChangeSelection(async (e) => {
    const selected = e.selection[0]
    if (!selected) return

    // Handle store item click - go to definition
    if (selected.contextValue === 'store' && selected.resourceUri) {
      try {
        const doc = await vscode.workspace.openTextDocument(selected.resourceUri)
        const editor = await vscode.window.showTextDocument(doc)
        // Parse line from tooltip (format: "filepath:line")
        const tooltip = selected.tooltip as string
        const lineMatch = tooltip.match(/:(\d+)$/)
        const line = lineMatch ? parseInt(lineMatch[1], 10) : 1
        const pos = new vscode.Position(line - 1, 0)
        editor.selection = new vscode.Selection(pos, pos)
        editor.revealRange(new vscode.Range(pos, pos))
      } catch (err) {
        console.error('Error opening store file:', err)
      }
    }
  })

  // Register Tree View (Explorer)
  const treeView = vscode.window.createTreeView('rgsStateExplorer', {
    treeDataProvider: treeProvider,
    showCollapseAll: true
  })

  context.subscriptions.push(treeView)

  // Register Welcome command
  context.subscriptions.push(
    vscode.commands.registerCommand('rgs.welcome', () => {
      RGSWelcomeWebview.show(context)
    })
  )

  // Handle tree item selection
  treeView.onDidChangeSelection(async (e) => {
    const selected = e.selection[0]
    if (!selected) return

    // Handle store item click - go to definition
    if (selected.storeInfo) {
      const doc = await vscode.workspace.openTextDocument(selected.storeInfo.filePath)
      const editor = await vscode.window.showTextDocument(doc)
      const pos = new vscode.Position(selected.storeInfo.line - 1, 0)
      editor.selection = new vscode.Selection(pos, pos)
      editor.revealRange(new vscode.Range(pos, pos))
    }

    // Handle state item click
    if (selected.stateUsage) {
      const doc = await vscode.workspace.openTextDocument(selected.stateUsage.filePath)
      const editor = await vscode.window.showTextDocument(doc)
      const pos = new vscode.Position(selected.stateUsage.line - 1, 0)
      editor.selection = new vscode.Selection(pos, pos)
      editor.revealRange(new vscode.Range(pos, pos))
    }

    // Handle plugin item click
    if (selected.pluginInfo) {
      const doc = await vscode.workspace.openTextDocument(selected.pluginInfo.filePath)
      const editor = await vscode.window.showTextDocument(doc)
      const pos = new vscode.Position(selected.pluginInfo.line - 1, 0)
      editor.selection = new vscode.Selection(pos, pos)
      editor.revealRange(new vscode.Range(pos, pos))
    }

    // Handle violation item click
    if (selected.contextValue && selected.contextValue.startsWith('violation:')) {
      const violations = treeProvider.analysis?.violations || []
      const violation = violations.find((v: Violation) => v.message === selected.label)
      if (violation) {
        const doc = await vscode.workspace.openTextDocument(violation.filePath)
        const editor = await vscode.window.showTextDocument(doc)
        const pos = new vscode.Position(violation.line - 1, 0)
        editor.selection = new vscode.Selection(pos, pos)
        editor.revealRange(new vscode.Range(pos, pos))
      }
    }
  })

  // Register "RGS: Analyze Workspace" command
  const analyzeWorkspace = async () => {
    const workspaceFolders = vscode.workspace.workspaceFolders
    if (!workspaceFolders || workspaceFolders.length === 0) {
      vscode.window.showWarningMessage('No workspace folder found')
      return
    }

    vscode.window.showInformationMessage('Analyzing workspace for RGS stores...')

    try {
      const analysis = await analyzer.analyze(workspaceFolders[0])
      treeProvider.setAnalysis(analysis)

      const warningCount = analysis.violations.filter((v: Violation) => v.severity === 'warning').length
      const errorCount = analysis.violations.filter((v: Violation) => v.severity === 'error').length

      let summary = 'Analysis Complete!\n\nStores: ' + analysis.stores.length + '\nState Usages: ' + analysis.states.length + '\nPlugins: ' + analysis.plugins.length + '\nIssues: ' + analysis.violations.length

      if (analysis.violations.length > 0) {
        summary += '\n' + warningCount + ' warnings, ' + errorCount + ' errors'
      } else {
        summary += '\nNo issues found'
      }

      vscode.window.showInformationMessage(summary)

      // Also show in output channel
      const outputChannel = vscode.window.createOutputChannel('RGS State Explorer')
      outputChannel.appendLine(summary)
      outputChannel.show()

    } catch (error) {
      vscode.window.showErrorMessage('Analysis failed: ' + error)
    }
  }

  context.subscriptions.push(
    vscode.commands.registerCommand('rgs.analyzeWorkspace', analyzeWorkspace)
  )

  // Register "RGS: Show Store Details" command
  StoreDetailView.register(context, treeProvider)

  // Register "RGS: Go to Store Definition" command
  const goToStoreDefinition = async () => {
    if (!treeProvider.analysis?.stores?.length) {
      vscode.window.showInformationMessage('Run "RGS: Analyze Workspace" first')
      return
    }

    const storeNames = treeProvider.analysis.stores.map((s: StoreInfo) => s.name)
    const selected = await vscode.window.showQuickPick(storeNames, {
      placeHolder: 'Select a store to navigate to'
    })

    if (!selected) return

    const store = treeProvider.analysis.stores.find((s: StoreInfo) => s.name === selected)
    if (!store) return

    const doc = await vscode.workspace.openTextDocument(store.filePath)
    const editor = await vscode.window.showTextDocument(doc)
    const pos = new vscode.Position(store.line - 1, 0)
    editor.selection = new vscode.Selection(pos, pos)
    editor.revealRange(new vscode.Range(pos, pos))
  }

  context.subscriptions.push(
    vscode.commands.registerCommand('rgs.goToStoreDefinition', goToStoreDefinition)
  )

  // Register completion provider
  if (config.enableAutocomplete) {
    const completionProvider = vscode.languages.registerCompletionItemProvider(
      ['typescript', 'typescriptreact', 'javascript', 'javascriptreact'],
      {
        provideCompletionItems(
          document: vscode.TextDocument,
          position: vscode.Position,
          _token: vscode.CancellationToken,
          _context: vscode.CompletionContext
        ): vscode.CompletionItem[] {
          const line = document.lineAt(position.line).text
          const beforeCursor = line.substring(0, position.character)

          // Check if we're in an import statement or using RGS
          const isRGSContext =
            /import\s+.*from\s+['"]@biglogic\/rgs['"]/.test(beforeCursor) ||
            /import\s+.*from\s+['"]gstate['"]/.test(beforeCursor) ||
            /import\s+.*from\s+['"]rgs['"]/.test(beforeCursor) ||
            /createStore|initState|useStore|IStore|StoreConfig/g.test(beforeCursor)

          if (!isRGSContext) {
            return []
          }

          const completionItems: vscode.CompletionItem[] = completionsData.map(item => {
            const completion = new vscode.CompletionItem(item.label, item.kind)
            completion.insertText = item.insertText
            completion.documentation = item.documentation
            completion.detail = item.detail
            completion.sortText = String(1000 - item.priority).padStart(4, '0')
            return completion
          })

          return completionItems
        },
      },
      ...['.', '(', ',']
    )
    context.subscriptions.push(completionProvider)
  }

  // Register hover provider
  if (config.enableHover) {
    const hoverProvider = vscode.languages.registerHoverProvider(
      ['typescript', 'typescriptreact', 'javascript', 'javascriptreact'],
      {
        provideHover(
          document: vscode.TextDocument,
          position: vscode.Position,
          _token: vscode.CancellationToken
        ): vscode.ProviderResult<vscode.Hover> {
          const wordRange = document.getWordRangeAtPosition(position)
          if (!wordRange) return null

          const word = document.getText(wordRange)
          const hoverInfo = hoverData[word]

          if (!hoverInfo) return null

          const line = document.lineAt(position.line).text
          const isRGSContext =
            /import\s+.*from\s+['"]@biglogic\/rgs['"]/.test(line) ||
            /import\s+.*from\s+['"]gstate['"]/.test(line) ||
            /import\s+.*from\s+['"]rgs['"]/.test(line) ||
            /createStore|initState|useStore|StoreConfig|IStore/g.test(line)

          if (!isRGSContext) return null

          const md = new vscode.MarkdownString(hoverInfo.content)
          md.isTrusted = true

          return new vscode.Hover(md, wordRange)
        },
      }
    )
    context.subscriptions.push(hoverProvider)
  }

  // Register diagnostics
  if (config.enableDiagnostics) {
    const diagnosticCollection = vscode.languages.createDiagnosticCollection('rgs')

    // Run diagnostics on document change
    const runDiagnostics = (document: vscode.TextDocument): void => {
      if (document.languageId !== 'typescript' &&
        document.languageId !== 'typescriptreact' &&
        document.languageId !== 'javascript' &&
        document.languageId !== 'javascriptreact') {
        return
      }

      const text = document.getText()
      const diagnostics: vscode.Diagnostic[] = []

      for (const rule of diagnosticRules) {
        const matches = text.matchAll(rule.pattern)
        for (const match of matches) {
          const index = match.index || 0
          const startPos = document.positionAt(index)
          const endPos = document.positionAt(index + match[0].length)

          const range = new vscode.Range(startPos, endPos)
          const diagnostic = new vscode.Diagnostic(range, rule.message, rule.severity)

          if (rule.suggest) {
            diagnostic.code = rule.suggest
          }

          diagnostics.push(diagnostic)
        }
      }

      diagnosticCollection.set(document.uri, diagnostics)
    }

    // Initial scan and watch for changes
    vscode.workspace.textDocuments.forEach(runDiagnostics)

    context.subscriptions.push(
      vscode.workspace.onDidChangeTextDocument((event: vscode.TextDocumentChangeEvent) => {
        runDiagnostics(event.document)
      })
    )

    context.subscriptions.push(
      vscode.workspace.onDidOpenTextDocument((document: vscode.TextDocument) => {
        runDiagnostics(document)
      })
    )
  }

  // Register Go to Definition
  const definitionProvider = vscode.languages.registerDefinitionProvider(
    ['typescript', 'typescriptreact', 'javascript', 'javascriptreact'],
    {
      provideDefinition(
        document: vscode.TextDocument,
        position: vscode.Position,
        _token: vscode.CancellationToken
      ): vscode.ProviderResult<vscode.Location> {
        const wordRange = document.getWordRangeAtPosition(position)
        if (!wordRange) return null

        const word = document.getText(wordRange)

        // Look for store variable declarations
        const text = document.getText()
        const lines = text.split('\n')

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i]

          // Match: const store = createStore(...) or const myStore = initState(...)
          const match = line.match(/(?:const|let|var)\s+(\w+)\s*=\s*(createStore|initState)/)
          if (match && match[1] === word) {
            const startPos = new vscode.Position(i, 0)
            const endPos = new vscode.Position(i, line.length)
            return new vscode.Location(document.uri, new vscode.Range(startPos, endPos))
          }
        }

        return null
      },
    }
  )
  context.subscriptions.push(definitionProvider)

  // Register Code Actions (quick fixes)
  const codeActionsProvider = vscode.languages.registerCodeActionsProvider(
    ['typescript', 'typescriptreact', 'javascript', 'javascriptreact'],
    {
      provideCodeActions(
        document: vscode.TextDocument,
        range: vscode.Range,
        context: vscode.CodeActionContext
      ): vscode.ProviderResult<vscode.CodeAction[]> {
        const actions: vscode.CodeAction[] = []

        for (const diagnostic of context.diagnostics) {
          if (diagnostic.message.includes('RGS:') && diagnostic.code) {
            const fix = new vscode.CodeAction(
              'Apply suggestion: ' + diagnostic.code,
              vscode.CodeActionKind.QuickFix
            )
            fix.edit = new vscode.WorkspaceEdit()
            actions.push(fix)
          }
        }

        return actions
      },
    }
  )
  context.subscriptions.push(codeActionsProvider)

  // Register RGS-specific decorator (highlighting)
  const rgsDecoration = vscode.window.createTextEditorDecorationType({
    light: { color: '#0078d4', fontWeight: 'bold' },
    dark: { color: '#4fc1ff', fontWeight: 'bold' },
  })

  const applyDecorations = (): void => {
    const editor = vscode.window.activeTextEditor
    if (!editor) return

    const document = editor.document
    const text = document.getText()

    // Find RGS API calls
    const apiRegex = /\b(createStore|initState|useStore|useSyncedState|getStore|destroyState|triggerSync|addAccessRule)\b/g
    const decorations: vscode.DecorationOptions[] = []

    let match: RegExpExecArray | null
    while ((match = apiRegex.exec(text)) !== null) {
      const startPos = document.positionAt(match.index)
      const endPos = document.positionAt(match.index + match[0].length)

      // Check if in comment
      const line = document.lineAt(startPos.line).text
      const lineBeforeCursor = line.substring(0, startPos.character)
      if (lineBeforeCursor.includes('//') || lineBeforeCursor.includes('/*')) continue

      decorations.push({
        range: new vscode.Range(startPos, endPos),
      })
    }

    editor.setDecorations(rgsDecoration, decorations)
  }

  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument(() => applyDecorations()),
    vscode.window.onDidChangeActiveTextEditor(() => applyDecorations())
  )

  // Initial decoration
  if (vscode.window.activeTextEditor) {
    applyDecorations()
  }

  console.log('RGS IntelliSense extension fully loaded')
}

export function deactivate(): void {
  console.log('RGS IntelliSense extension deactivated')
}
