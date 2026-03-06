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
  showTestStores: boolean
}

function getConfig(): RGSExtensionConfig {
  const config = vscode.workspace.getConfiguration('rgs')
  return {
    enableDiagnostics: config.get<boolean>('enableDiagnostics', true),
    enableAutocomplete: config.get<boolean>('enableAutocomplete', true),
    enableHover: config.get<boolean>('enableHover', true),
    enableSnippets: config.get<boolean>('enableSnippets', true),
    showTestStores: config.get<boolean>('showTestStores', true),
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
    documentation: createMarkdownString('## createStore<S>(config?)\n\nCreates an enterprise-grade state management store.'),
    detail: 'createStore<S>(config?: StoreConfig<S>): IStore<S>',
    priority: 100,
  },
  {
    label: 'initState',
    kind: vscode.CompletionItemKind.Function,
    insertText: new vscode.SnippetString('initState${1|<S extends Record<string, unknown> = Record<string, unknown>>|}'),
    documentation: createMarkdownString('## initState<S>(config?)\n\nInitialize a global store instance.'),
    detail: 'initState<S>(config?: StoreConfig<S>): IStore<S>',
    priority: 95,
  },
  {
    label: 'useStore',
    kind: vscode.CompletionItemKind.Function,
    insertText: new vscode.SnippetString('useStore${1|<T = unknown, S extends Record<string, unknown> = Record<string, unknown>>|}'),
    documentation: createMarkdownString('## useStore<T, S>(keyOrSelector, store?)\n\nReactive Hook for state management.'),
    detail: 'useStore<T, S>(keyOrSelector: string | ((state: S) => T), store?: IStore<S>): T | [...]',
    priority: 90,
  },
  {
    label: 'useSyncedState',
    kind: vscode.CompletionItemKind.Function,
    insertText: new vscode.SnippetString('useSyncedState${1|<T = unknown>|}'),
    documentation: createMarkdownString('## useSyncedState<T>(key, store?)\n\nHook for synchronized state with offline support.'),
    detail: 'useSyncedState<T>(key: string, store?: IStore): readonly [...]',
    priority: 85,
  },
  {
    label: 'useSyncStatus',
    kind: vscode.CompletionItemKind.Function,
    insertText: 'useSyncStatus',
    documentation: createMarkdownString('## useSyncStatus()\n\nGet global sync status.'),
    detail: 'useSyncStatus(): SyncState',
    priority: 80,
  },
  {
    label: 'useIsStoreReady',
    kind: vscode.CompletionItemKind.Function,
    insertText: 'useIsStoreReady',
    documentation: createMarkdownString('## useIsStoreReady(store?)\n\nCheck if store has finished hydration.'),
    detail: 'useIsStoreReady(store?: IStore): boolean',
    priority: 75,
  },
  {
    label: 'getStore',
    kind: vscode.CompletionItemKind.Function,
    insertText: 'getStore',
    documentation: createMarkdownString('## getStore()\n\nGet current default store instance.'),
    detail: 'getStore(): IStore<Record<string, unknown>> | null',
    priority: 70,
  },
  {
    label: 'destroyState',
    kind: vscode.CompletionItemKind.Function,
    insertText: 'destroyState',
    documentation: createMarkdownString('## destroyState()\n\nCleanup global state.'),
    detail: 'destroyState(): void',
    priority: 65,
  },
  {
    label: 'triggerSync',
    kind: vscode.CompletionItemKind.Function,
    insertText: 'triggerSync',
    documentation: createMarkdownString('## triggerSync(namespace?)\n\nTrigger manual sync.'),
    detail: 'triggerSync(namespace?: string): Promise<void>',
    priority: 60,
  },
  {
    label: 'StoreConfig',
    kind: vscode.CompletionItemKind.Interface,
    insertText: 'StoreConfig',
    documentation: createMarkdownString('## StoreConfig<S>\n\nStore configuration options.'),
    detail: 'interface StoreConfig<S>',
    priority: 45,
  },
  {
    label: 'IStore',
    kind: vscode.CompletionItemKind.Interface,
    insertText: 'IStore',
    documentation: createMarkdownString('## IStore<S>\n\nMain store interface.'),
    detail: 'interface IStore<S>',
    priority: 44,
  },
  {
    label: 'PersistOptions',
    kind: vscode.CompletionItemKind.Interface,
    insertText: 'PersistOptions',
    documentation: createMarkdownString('## PersistOptions\n\nOptions for persisting state.'),
    detail: 'interface PersistOptions',
    priority: 43,
  },
  {
    label: 'IPlugin',
    kind: vscode.CompletionItemKind.Interface,
    insertText: 'IPlugin',
    documentation: createMarkdownString('## IPlugin<S>\n\nPlugin interface.'),
    detail: 'interface IPlugin<S>',
    priority: 40,
  },
  {
    label: 'gstate',
    kind: vscode.CompletionItemKind.Module,
    insertText: 'gstate',
    documentation: createMarkdownString('## gstate\n\nRGS state management library.'),
    detail: 'RGS State Management Library',
    priority: 30,
  },
]

// ============================================================================
// HOVER INFORMATION
// ============================================================================

const hoverData: Record<string, { content: string; detail?: string }> = {
  'createStore': { content: '## createStore<S>(config?) → IStore<S>\n\nCreates a store.', detail: 'function createStore' },
  'initState': { content: '## initState<S>(config?) → IStore<S>\n\nInitialize global store.', detail: 'function initState' },
  'useStore': { content: '## useStore<T, S>(keyOrSelector, store?)\n\nReactive Hook.', detail: 'function useStore' },
  'useSyncedState': { content: '## useSyncedState<T>(key, store?)\n\nSync Hook.', detail: 'function useSyncedState' },
  'IStore': { content: '## IStore<S>\n\nMain store interface.', detail: 'interface IStore' },
  'StoreConfig': { content: '## StoreConfig<S>\n\nConfig options.', detail: 'interface StoreConfig' },
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
  },
  {
    pattern: /createStore\s*\(\s*\{[^}]*namespace:\s*['"`]?\s*['"`]?\s*\}/,
    message: 'RGS: Store namespace is required for multiple stores',
    severity: vscode.DiagnosticSeverity.Information,
  },
  {
    pattern: /useStore\s*\(\s*['"`]/,
    message: 'RGS: String keys lose type safety. Use selectors.',
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
  type: string
  config: Record<string, unknown>
  keys: string[]
  plugins: string[]
  category: 'project' | 'test'
  testFramework?: 'jest' | 'playwright' | undefined
  testFile?: string
  security: {
    encoded: boolean
    rbac: boolean
    namespace?: string
  }
  stateProperties: StatePropertyInfo[]
}

interface StatePropertyInfo {
  key: string
  type: string
  defaultValue: string
  isPersisted: boolean
  isEncrypted: boolean
  isReadonly: boolean
  line: number
  filePath: string
}

interface StateUsage {
  key: string
  filePath: string
  line: number
  type: string
}

// ============================================================================
// RGS STATE PROPERTIES - TREE VIEW
// ============================================================================

class StatePropertyTreeItem extends vscode.TreeItem {
  propertyInfo?: StatePropertyInfo

  constructor(
    override label: string,
    override collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly itemType: string
  ) {
    super(label, collapsibleState)
    this.contextValue = itemType
  }
}

class RGSStatePropertiesProvider implements vscode.TreeDataProvider<StatePropertyTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<StatePropertyTreeItem | undefined | void>()
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event

  private currentStore: StoreInfo | null = null

  setStore(store: StoreInfo | null): void {
    this.currentStore = store
    this._onDidChangeTreeData.fire()
  }

  getTreeItem(element: StatePropertyTreeItem): vscode.TreeItem {
    return element
  }

  getChildren(element?: StatePropertyTreeItem): StatePropertyTreeItem[] {
    if (!this.currentStore) {
      const items: StatePropertyTreeItem[] = []
      const hint = new StatePropertyTreeItem('Select a store in State Explorer', vscode.TreeItemCollapsibleState.None, 'hint')
      hint.description = 'Click on a store to view its properties'
      items.push(hint)
      return items
    }

    if (element) {
      if (element.propertyInfo) {
        const props = element.propertyInfo
        const children: StatePropertyTreeItem[] = []

        const typeItem = new StatePropertyTreeItem(`Type: ${props.type}`, vscode.TreeItemCollapsibleState.None, 'detail')
        children.push(typeItem)

        const defaultItem = new StatePropertyTreeItem(`Default: ${props.defaultValue}`, vscode.TreeItemCollapsibleState.None, 'detail')
        children.push(defaultItem)

        const attrs: string[] = []
        if (props.isPersisted) attrs.push('Persisted')
        if (props.isEncrypted) attrs.push('Encrypted')
        if (props.isReadonly) attrs.push('Readonly')

        if (attrs.length > 0) {
          const attrsItem = new StatePropertyTreeItem(`Attributes: ${attrs.join(', ')}`, vscode.TreeItemCollapsibleState.None, 'detail')
          children.push(attrsItem)
        }

        return children
      }
      return []
    }

    const items: StatePropertyTreeItem[] = []

    const header = new StatePropertyTreeItem(
      `Store: ${this.currentStore.name}`,
      vscode.TreeItemCollapsibleState.None,
      'header'
    )
    header.description = `${this.currentStore.stateProperties.length} properties`
    items.push(header)

    if (this.currentStore.stateProperties.length > 0) {
      for (const prop of this.currentStore.stateProperties) {
        const propItem = new StatePropertyTreeItem(
          prop.key,
          vscode.TreeItemCollapsibleState.Collapsed,
          'property'
        )
        propItem.propertyInfo = prop
        propItem.description = prop.type

        let icon = ''
        if (prop.isEncrypted) icon += '🔒 '
        if (prop.isPersisted) icon += '💾 '
        if (prop.isReadonly) icon += '📖 '
        if (icon) propItem.label = icon + prop.key

        propItem.command = {
          command: 'rgs.goToPropertyDefinition',
          title: 'Go to Property Definition',
          arguments: [prop]
        }

        items.push(propItem)
      }
    } else {
      const noProps = new StatePropertyTreeItem(
        'No state properties found',
        vscode.TreeItemCollapsibleState.None,
        'hint'
      )
      noProps.description = 'State properties will be extracted from initial state'
      items.push(noProps)
    }

    return items
  }
}

interface PluginInfo {
  name: string
  filePath: string
  line: number
}

interface Violation {
  message: string
  severity: string
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

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element
  }

  getChildren(): vscode.TreeItem[] {
    const items: vscode.TreeItem[] = []

    const header = new vscode.TreeItem('⚡ RGS (Argis)', vscode.TreeItemCollapsibleState.None)
    header.contextValue = 'header'
    items.push(header)

    const info = new vscode.TreeItem('State Management for React', vscode.TreeItemCollapsibleState.None)
    info.contextValue = 'info'
    items.push(info)

    const analyzeAction = new vscode.TreeItem('📊 Analyze Workspace', vscode.TreeItemCollapsibleState.None)
    analyzeAction.command = { command: 'rgs.analyzeWorkspace', title: 'Analyze Workspace' }
    analyzeAction.contextValue = 'action'
    items.push(analyzeAction)

    const version = new vscode.TreeItem('v3.8.2 | MIT License', vscode.TreeItemCollapsibleState.None)
    version.contextValue = 'footer'
    items.push(version)

    return items
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
    override label: string,
    override collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly itemType: string
  ) {
    super(label, collapsibleState)
    this.contextValue = itemType
  }
}

class RGSStateExplorerProvider implements vscode.TreeDataProvider<RGSTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<RGSTreeItem | undefined | void>()
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event

  public analysis: WorkspaceAnalysis | null = null
  private config: RGSExtensionConfig = getConfig()

  setAnalysis(analysis: WorkspaceAnalysis): void {
    this.analysis = analysis
    this.config = getConfig()
    this._onDidChangeTreeData.fire()
  }

  refreshConfig(): void {
    this.config = getConfig()
    this._onDidChangeTreeData.fire()
  }

  getTreeItem(element: RGSTreeItem): vscode.TreeItem {
    return element
  }

  getChildren(element?: RGSTreeItem): RGSTreeItem[] {
    if (!this.analysis) {
      const items: RGSTreeItem[] = []
      const hint = new RGSTreeItem('Run "RGS: Analyze Workspace"', vscode.TreeItemCollapsibleState.None, 'hint')
      hint.description = 'Click the button above'
      items.push(hint)
      return items
    }

    if (!element) {
      const items: RGSTreeItem[] = []

      const projectStores = this.analysis.stores.filter(s => s.category === 'project')
      const testStores = this.config.showTestStores
        ? this.analysis.stores.filter(s => s.category === 'test')
        : []

      if (projectStores.length > 0) {
        const storesFolder = new RGSTreeItem(
          '📁 Project Stores (' + projectStores.length + ')',
          vscode.TreeItemCollapsibleState.Expanded,
          'folder-project'
        )
        storesFolder.children = projectStores.map(store => {
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

      if (testStores.length > 0) {
        const testFolder = new RGSTreeItem(
          '🧪 Test Stores (' + testStores.length + ')',
          vscode.TreeItemCollapsibleState.Expanded,
          'folder-test'
        )
        testFolder.children = testStores.map(store => {
          const item = new RGSTreeItem(
            store.name,
            vscode.TreeItemCollapsibleState.Collapsed,
            'store-test'
          )
          item.storeInfo = store
          const frameworkLabel = store.testFramework === 'jest' ? 'Jest' : store.testFramework === 'playwright' ? 'Playwright' : ''
          item.description = store.type + (frameworkLabel ? ` | ${frameworkLabel}` : '')
          if (store.testFile) {
            item.description += ` | ${store.testFile}`
          }
          item.resourceUri = vscode.Uri.file(store.filePath)
          return item
        })
        items.push(testFolder)
      }

      if (this.analysis.violations.length > 0) {
        const violationsFolder = new RGSTreeItem(
          '⚠️ Issues (' + this.analysis.violations.length + ')',
          vscode.TreeItemCollapsibleState.Expanded,
          'folder'
        )
        violationsFolder.children = this.analysis.violations.map(v => {
          const item = new RGSTreeItem(
            v.message,
            vscode.TreeItemCollapsibleState.None,
            'violation'
          )
          item.resourceUri = vscode.Uri.file(v.filePath)
          item.contextValue = 'violation:' + v.severity
          return item
        })
        items.push(violationsFolder)
      }

      return items
    }

    if ((element.itemType === 'store' || element.itemType === 'store-test') && element.storeInfo) {
      const children: RGSTreeItem[] = []
      const store = element.storeInfo

      const detailsFolder = new RGSTreeItem(
        '📋 Details',
        vscode.TreeItemCollapsibleState.Expanded,
        'folder-details'
      )

      const detailsChildren: RGSTreeItem[] = []

      const nameItem = new RGSTreeItem(`Name: ${store.name}`, vscode.TreeItemCollapsibleState.None, 'detail')
      detailsChildren.push(nameItem)

      const typeItem = new RGSTreeItem(`Type: ${store.type}`, vscode.TreeItemCollapsibleState.None, 'detail')
      detailsChildren.push(typeItem)

      if (store.category === 'test' && store.testFramework) {
        const frameworkLabel = store.testFramework === 'jest' ? 'Jest' : 'Playwright'
        const testFwItem = new RGSTreeItem(`Test Framework: ${frameworkLabel}`, vscode.TreeItemCollapsibleState.None, 'detail')
        detailsChildren.push(testFwItem)

        if (store.testFile) {
          const testFileItem = new RGSTreeItem(`Test File: ${store.testFile}`, vscode.TreeItemCollapsibleState.None, 'detail')
          detailsChildren.push(testFileItem)
        }
      }

      if (store.plugins.length > 0) {
        const pluginsItem = new RGSTreeItem(
          `Plugins (${store.plugins.length})`,
          vscode.TreeItemCollapsibleState.Expanded,
          'folder'
        )
        pluginsItem.children = store.plugins.map(p =>
          new RGSTreeItem(p, vscode.TreeItemCollapsibleState.None, 'plugin')
        )
        detailsChildren.push(pluginsItem)
      }

      const securityItems: string[] = []
      if (store.security.encoded) securityItems.push('Encoded')
      if (store.security.rbac) securityItems.push('RBAC')
      if (store.security.namespace) securityItems.push(`Namespace: ${store.security.namespace}`)

      if (securityItems.length > 0) {
        const securityFolder = new RGSTreeItem(
          '🔒 Security',
          vscode.TreeItemCollapsibleState.Expanded,
          'folder'
        )
        securityFolder.children = securityItems.map(s =>
          new RGSTreeItem(s, vscode.TreeItemCollapsibleState.None, 'security')
        )
        detailsChildren.push(securityFolder)
      }

      detailsFolder.children = detailsChildren
      children.push(detailsFolder)

      if (store.keys.length > 0) {
        const keysItem = new RGSTreeItem(
          'Keys (' + store.keys.length + ')',
          vscode.TreeItemCollapsibleState.Expanded,
          'folder'
        )
        keysItem.children = store.keys.map(key =>
          new RGSTreeItem(key, vscode.TreeItemCollapsibleState.None, 'key')
        )
        children.push(keysItem)
      }

      const locationItem = new RGSTreeItem(
        '📁 ' + store.filePath + ':' + store.line,
        vscode.TreeItemCollapsibleState.None,
        'location'
      )
      children.push(locationItem)

      return children
    }

    return element.children || []
  }
}

// ============================================================================
// ANALYZER
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

        const isTestFile = filePath.includes('/tests/') || filePath.includes('\\tests\\')
        const isJestTest = filePath.includes('/tests/jest/') || filePath.includes('\\tests\\jest\\')
        const isPlaywrightTest = filePath.includes('/tests/playwright/') || filePath.includes('\\tests\\playwright\\')

        let testFramework: 'jest' | 'playwright' | undefined = undefined
        if (isJestTest) testFramework = 'jest'
        else if (isPlaywrightTest) testFramework = 'playwright'

        const storePattern = /(?:const|let|var)\s+(\w+)\s*=\s*(createStore|initState)\s*[<(]/g
        let match: RegExpExecArray | null
        while ((match = storePattern.exec(content)) !== null) {
          const varName = match[1]
          const funcType = match[2]
          if (varName && funcType) {
            const lineNumber = content.substring(0, match.index).split('\n').length
            const security = this.extractSecurityInfo(content, match.index)
            const storePlugins = this.extractPluginsForStore(content)
            const stateProperties = this.extractStateProperties(content, match.index, filePath)

            stores.push({
              name: varName,
              filePath: filePath,
              line: lineNumber,
              type: funcType,
              config: {},
              keys: [],
              plugins: storePlugins,
              category: isTestFile ? 'test' : 'project',
              testFramework,
              testFile: isTestFile ? this.findTestFileName(filePath) : undefined,
              security,
              stateProperties
            })
          }
        }

        const statePattern = /useStore\s*\(\s*['"`]([^'"`]+)['"`]/g
        while ((match = statePattern.exec(content)) !== null) {
          const key = match[1]
          if (key) {
            const lineNumber = content.substring(0, match.index).split('\n').length
            states.push({ key, filePath, line: lineNumber, type: 'useStore' })
          }
        }

        const syncedPattern = /useSyncedState\s*\(\s*['"`]([^'"`]+)['"`]/g
        while ((match = syncedPattern.exec(content)) !== null) {
          const key = match[1]
          if (key) {
            const lineNumber = content.substring(0, match.index).split('\n').length
            states.push({ key, filePath, line: lineNumber, type: 'useSyncedState' })
          }
        }

        const pluginPattern = /_addPlugin\s*\(\s*['"`]([^'"`]+)['"`]/g
        while ((match = pluginPattern.exec(content)) !== null) {
          if (match[1]) {
            const lineNumber = content.substring(0, match.index).split('\n').length
            plugins.push({ name: match[1], filePath, line: lineNumber })
          }
        }

        const insecureKeys = ['__proto__', 'constructor', 'prototype']
        for (const key of insecureKeys) {
          const pattern = new RegExp('set\\s*\\(\\s*[\'"`]' + key + '[\'"`]')
          if (pattern.test(content)) {
            const m = content.match(pattern)
            if (m) {
              const lineNum = content.substring(0, content.indexOf(m[0])).split('\n').length
              violations.push({
                message: 'Security: Cannot set ' + key,
                severity: 'error',
                filePath,
                line: lineNum
              })
            }
          }
        }

      } catch (error) {
        console.error('Error analyzing ' + filePath, error)
      }
    }

    return { stores, states, plugins, violations, timestamp: new Date() }
  }

  private extractSecurityInfo(content: string, storeStartIndex: number): { encoded: boolean; rbac: boolean; namespace?: string } {
    const searchRange = content.substring(storeStartIndex, storeStartIndex + 2000)

    const encoded = /encoded:\s*true/.test(searchRange) || /encode:\s*true/.test(searchRange)
    const rbac = /rbac:\s*true/.test(searchRange) || /rbacEnabled:\s*true/.test(searchRange)

    const namespaceMatch = searchRange.match(/namespace:\s*['"`]([^'"`]+)['"`]/)
    const namespace = namespaceMatch ? namespaceMatch[1] : undefined

    return { encoded, rbac, namespace }
  }

  private extractPluginsForStore(content: string): string[] {
    const plugins: string[] = []

    const pluginPattern = /_addPlugin\s*\(\s*['"`]([^'"`]+)['"`]/g
    let match: RegExpExecArray | null

    while ((match = pluginPattern.exec(content)) !== null) {
      if (match[1]) {
        plugins.push(match[1])
      }
    }

    return plugins
  }

  private extractStateProperties(content: string, storeStartIndex: number, filePath: string): StatePropertyInfo[] {
    const properties: StatePropertyInfo[] = []

    const searchRange = content.substring(storeStartIndex, storeStartIndex + 3000)

    const stateMatch = searchRange.match(/state:\s*\{([^}]+)\}/s)
    if (!stateMatch || !stateMatch[1]) return properties

    const stateContent = stateMatch[1]
    const lines = stateContent.split('\n')

    for (const line of lines) {
      const propMatch = line.match(/^\s*(\w+)\s*:\s*(.+?),?\s*$/)
      if (propMatch && propMatch[1]) {
        const key = propMatch[1]
        const value = propMatch[2]?.trim() ?? ''

        let type = 'unknown'
        let defaultValue = value
        let isPersisted = false
        let isEncrypted = false
        let isReadonly = false

        const persistMatch = line.match(/persist:\s*true/)
        if (persistMatch) isPersisted = true

        const encryptedMatch = line.match(/encrypted:\s*true/)
        if (encryptedMatch) isEncrypted = true

        const readonlyMatch = line.match(/readonly:\s*true/)
        if (readonlyMatch) isReadonly = true

        if (value === 'null' || value === 'undefined') {
          type = 'null'
        } else if (value === 'true' || value === 'false') {
          type = 'boolean'
        } else if (/^['"`].*['"`]$/.test(value)) {
          type = 'string'
        } else if (/^\d+(\.\d+)?$/.test(value)) {
          type = 'number'
        } else if (value.startsWith('[') || value.startsWith('{')) {
          type = value.startsWith('[') ? 'array' : 'object'
        } else if (value.includes('=>')) {
          type = 'function'
        } else if (/^[A-Z]/.test(value) && !value.includes(' ')) {
          type = 'class'
        }

        const keyIndex = content.indexOf(key, storeStartIndex)
        const lineNumber = keyIndex >= 0 ? content.substring(0, keyIndex).split('\n').length : 1

        properties.push({
          key,
          type,
          defaultValue: defaultValue.replace(/,$/, ''),
          isPersisted,
          isEncrypted,
          isReadonly,
          line: lineNumber,
          filePath
        })
      }
    }

    return properties
  }

  private findTestFileName(filePath: string): string {
    const parts = filePath.split(/[/\\]/)
    const testsIndex = parts.findIndex(p => p === 'tests')
    if (testsIndex >= 0 && testsIndex < parts.length - 1) {
      return parts[parts.length - 1] ?? path.basename(filePath)
    }
    return path.basename(filePath)
  }

  private async findTypeScriptFiles(dirPath: string): Promise<string[]> {
    const files: string[] = []
    const excludeDirs = ['node_modules', '.git', 'dist', 'build', 'coverage', '.vscode']

    try {
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
    } catch {
      // Ignore errors
    }

    return files
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
  const statePropertiesProvider = new RGSStatePropertiesProvider()

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(() => {
      treeProvider.refreshConfig()
    })
  )

  let welcomeView: vscode.TreeView<vscode.TreeItem> | undefined
  let treeView: vscode.TreeView<RGSTreeItem> | undefined
  let statePropertiesView: vscode.TreeView<StatePropertyTreeItem> | undefined

  const getWelcomeView = (): vscode.TreeView<vscode.TreeItem> => {
    if (!welcomeView) {
      welcomeView = vscode.window.createTreeView('rgsWelcome', {
        treeDataProvider: welcomeProvider,
        showCollapseAll: false
      })
      context.subscriptions.push(welcomeView)
    }
    return welcomeView
  }

  const getTreeView = async (): Promise<vscode.TreeView<RGSTreeItem>> => {
    if (!treeView) {
      treeView = vscode.window.createTreeView('rgsStateExplorer', {
        treeDataProvider: treeProvider,
        showCollapseAll: true
      })
      context.subscriptions.push(treeView)

      if (!treeProvider.analysis && vscode.workspace.workspaceFolders?.length) {
        try {
          const folder = vscode.workspace.workspaceFolders[0]
          if (folder) {
            const analysis = await analyzer.analyze(folder)
            treeProvider.setAnalysis(analysis)
          }
        } catch (e) {
          console.error('Auto-analysis failed:', e)
        }
      }

      treeView.onDidChangeSelection(async (e) => {
        const selected = e.selection[0]
        if (!selected) return

        if (selected.storeInfo) {
          const doc = await vscode.workspace.openTextDocument(selected.storeInfo.filePath)
          const editor = await vscode.window.showTextDocument(doc)
          const pos = new vscode.Position(selected.storeInfo.line - 1, 0)
          editor.selection = new vscode.Selection(pos, pos)
          editor.revealRange(new vscode.Range(pos, pos))
        }

        if (selected.contextValue?.startsWith('violation:')) {
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

        if (selected.storeInfo) {
          statePropertiesProvider.setStore(selected.storeInfo)
          getStatePropertiesView()
        }
      })
    }
    return treeView
  }

  const getStatePropertiesView = (): vscode.TreeView<StatePropertyTreeItem> => {
    if (!statePropertiesView) {
      statePropertiesView = vscode.window.createTreeView('rgsStateProperties', {
        treeDataProvider: statePropertiesProvider,
        showCollapseAll: true
      })
      context.subscriptions.push(statePropertiesView)
    }
    return statePropertiesView
  }

  context.subscriptions.push(
    vscode.commands.registerCommand('rgs.welcome', () => {
      getWelcomeView()
    })
  )

  context.subscriptions.push(
    vscode.commands.registerCommand('rgs.analyzeWorkspace', async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders
      if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showWarningMessage('No workspace folder found')
        return
      }

      vscode.window.showInformationMessage('Analyzing workspace...')

      try {
        const folder = workspaceFolders[0]
        if (!folder) {
          vscode.window.showWarningMessage('No workspace folder found')
          return
        }

        const analysis = await analyzer.analyze(folder)
        treeProvider.setAnalysis(analysis)

        await getTreeView()

        const storeCount = analysis.stores.length
        const issueCount = analysis.violations.length
        vscode.window.showInformationMessage(
          'Analysis complete: ' + storeCount + ' stores, ' + issueCount + ' issues'
        )

      } catch (error) {
        vscode.window.showErrorMessage('Analysis failed: ' + error)
      }
    })
  )

  context.subscriptions.push(
    vscode.commands.registerCommand('rgs.showStoreDetails', async () => {
      if (!treeProvider.analysis?.stores?.length) {
        vscode.window.showInformationMessage('Run "RGS: Analyze Workspace" first')
        return
      }

      const storeNames = treeProvider.analysis.stores.map((s: StoreInfo) => s.name)
      const selected = await vscode.window.showQuickPick(storeNames, {
        placeHolder: 'Select a store'
      })

      if (!selected) return

      const store = treeProvider.analysis.stores.find((s: StoreInfo) => s.name === selected)
      if (!store) return

      vscode.window.showInformationMessage(
        'Store: ' + store.name + ' | File: ' + path.basename(store.filePath) + ':' + store.line
      )
    })
  )

  context.subscriptions.push(
    vscode.commands.registerCommand('rgs.goToStoreDefinition', async () => {
      if (!treeProvider.analysis?.stores?.length) {
        vscode.window.showInformationMessage('Run "RGS: Analyze Workspace" first')
        return
      }

      const storeNames = treeProvider.analysis.stores.map((s: StoreInfo) => s.name)
      const selected = await vscode.window.showQuickPick(storeNames, {
        placeHolder: 'Select a store'
      })

      if (!selected) return

      const store = treeProvider.analysis.stores.find((s: StoreInfo) => s.name === selected)
      if (!store) return

      const doc = await vscode.workspace.openTextDocument(store.filePath)
      const editor = await vscode.window.showTextDocument(doc)
      const pos = new vscode.Position(store.line - 1, 0)
      editor.selection = new vscode.Selection(pos, pos)
      editor.revealRange(new vscode.Range(pos, pos))
    })
  )

  context.subscriptions.push(
    vscode.commands.registerCommand('rgs.goToPropertyDefinition', async (property: StatePropertyInfo) => {
      if (!property) {
        vscode.window.showInformationMessage('No property selected')
        return
      }

      try {
        const doc = await vscode.workspace.openTextDocument(property.filePath)
        const editor = await vscode.window.showTextDocument(doc)
        const pos = new vscode.Position(property.line - 1, 0)
        editor.selection = new vscode.Selection(pos, pos)
        editor.revealRange(new vscode.Range(pos, pos))
      } catch (error) {
        vscode.window.showErrorMessage('Failed to open file: ' + property.filePath)
      }
    })
  )

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

          const isRGSContext =
            /import\s+.*from\s+['"]@biglogic\/rgs['"]/.test(beforeCursor) ||
            /import\s+.*from\s+['"]gstate['"]/.test(beforeCursor) ||
            /createStore|initState|useStore|IStore|StoreConfig/g.test(beforeCursor)

          if (!isRGSContext) return []

          return completionsData.map(item => {
            const completion = new vscode.CompletionItem(item.label, item.kind)
            completion.insertText = item.insertText
            completion.documentation = item.documentation
            completion.detail = item.detail
            completion.sortText = String(1000 - item.priority).padStart(4, '0')
            return completion
          })
        },
      },
      ...['.', '(', ',']
    )
    context.subscriptions.push(completionProvider)
  }

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

  if (config.enableDiagnostics) {
    const diagnosticCollection = vscode.languages.createDiagnosticCollection('rgs')

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

          const diagnostic = new vscode.Diagnostic(
            new vscode.Range(startPos, endPos),
            rule.message,
            rule.severity
          )

          if (rule.suggest) {
            diagnostic.code = rule.suggest
          }

          diagnostics.push(diagnostic)
        }
      }

      diagnosticCollection.set(document.uri, diagnostics)
    }

    vscode.workspace.textDocuments.forEach(runDiagnostics)

    context.subscriptions.push(
      vscode.workspace.onDidChangeTextDocument((event) => {
        runDiagnostics(event.document)
      })
    )

    context.subscriptions.push(
      vscode.workspace.onDidOpenTextDocument((document) => {
        runDiagnostics(document)
      })
    )
  }

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
        const text = document.getText()
        const lines = text.split('\n')

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i]
          if (!line) continue
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

  const rgsDecoration = vscode.window.createTextEditorDecorationType({
    light: { color: '#0078d4', fontWeight: 'bold' },
    dark: { color: '#4fc1ff', fontWeight: 'bold' },
  })

  const applyDecorations = (): void => {
    const editor = vscode.window.activeTextEditor
    if (!editor) return

    const document = editor.document
    const text = document.getText()
    const apiRegex = /\b(createStore|initState|useStore|useSyncedState|getStore|destroyState)\b/g
    const decorations: vscode.DecorationOptions[] = []

    let match: RegExpExecArray | null
    while ((match = apiRegex.exec(text)) !== null) {
      const startPos = document.positionAt(match.index)
      const endPos = document.positionAt(match.index + match[0].length)

      const line = document.lineAt(startPos.line).text
      const lineBeforeCursor = line.substring(0, startPos.character)
      if (lineBeforeCursor.includes('//') || lineBeforeCursor.includes('/*')) continue

      decorations.push({ range: new vscode.Range(startPos, endPos) })
    }

    editor.setDecorations(rgsDecoration, decorations)
  }

  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument(() => applyDecorations()),
    vscode.window.onDidChangeActiveTextEditor(() => applyDecorations())
  )

  if (vscode.window.activeTextEditor) {
    applyDecorations()
  }

  console.log('RGS IntelliSense extension loaded')
}

export function deactivate(): void {
  console.log('RGS IntelliSense extension deactivated')
}
