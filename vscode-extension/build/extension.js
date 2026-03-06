"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
function getConfig() {
    const config = vscode.workspace.getConfiguration('rgs');
    return {
        enableDiagnostics: config.get('enableDiagnostics', true),
        enableAutocomplete: config.get('enableAutocomplete', true),
        enableHover: config.get('enableHover', true),
        enableSnippets: config.get('enableSnippets', true),
        showTestStores: config.get('showTestStores', true),
    };
}
function createMarkdownString(value) {
    const md = new vscode.MarkdownString(value);
    md.isTrusted = true;
    return md;
}
const completionsData = [
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
];
// ============================================================================
// HOVER INFORMATION
// ============================================================================
const hoverData = {
    'createStore': { content: '## createStore<S>(config?) → IStore<S>\n\nCreates a store.', detail: 'function createStore' },
    'initState': { content: '## initState<S>(config?) → IStore<S>\n\nInitialize global store.', detail: 'function initState' },
    'useStore': { content: '## useStore<T, S>(keyOrSelector, store?)\n\nReactive Hook.', detail: 'function useStore' },
    'useSyncedState': { content: '## useSyncedState<T>(key, store?)\n\nSync Hook.', detail: 'function useSyncedState' },
    'IStore': { content: '## IStore<S>\n\nMain store interface.', detail: 'interface IStore' },
    'StoreConfig': { content: '## StoreConfig<S>\n\nConfig options.', detail: 'interface StoreConfig' },
};
const diagnosticRules = [
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
];
// ============================================================================
// RGS STATE PROPERTIES - TREE VIEW
// ============================================================================
class StatePropertyTreeItem extends vscode.TreeItem {
    constructor(label, collapsibleState, itemType) {
        super(label, collapsibleState);
        this.label = label;
        this.collapsibleState = collapsibleState;
        this.itemType = itemType;
        this.contextValue = itemType;
    }
}
class RGSStatePropertiesProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.currentStore = null;
    }
    setStore(store) {
        this.currentStore = store;
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if (!this.currentStore) {
            const items = [];
            const hint = new StatePropertyTreeItem('Select a store in State Explorer', vscode.TreeItemCollapsibleState.None, 'hint');
            hint.description = 'Click on a store to view its properties';
            items.push(hint);
            return items;
        }
        if (element) {
            // Show property details when expanded
            if (element.propertyInfo) {
                const props = element.propertyInfo;
                const children = [];
                // Type
                const typeItem = new StatePropertyTreeItem(`Type: ${props.type}`, vscode.TreeItemCollapsibleState.None, 'detail');
                children.push(typeItem);
                // Default value
                const defaultItem = new StatePropertyTreeItem(`Default: ${props.defaultValue}`, vscode.TreeItemCollapsibleState.None, 'detail');
                children.push(defaultItem);
                // Attributes
                const attrs = [];
                if (props.isPersisted)
                    attrs.push('Persisted');
                if (props.isEncrypted)
                    attrs.push('Encrypted');
                if (props.isReadonly)
                    attrs.push('Readonly');
                if (attrs.length > 0) {
                    const attrsItem = new StatePropertyTreeItem(`Attributes: ${attrs.join(', ')}`, vscode.TreeItemCollapsibleState.None, 'detail');
                    children.push(attrsItem);
                }
                return children;
            }
            return [];
        }
        // Root level - show store name and properties
        const items = [];
        // Store header
        const header = new StatePropertyTreeItem(`Store: ${this.currentStore.name}`, vscode.TreeItemCollapsibleState.None, 'header');
        header.description = `${this.currentStore.stateProperties.length} properties`;
        items.push(header);
        // Properties
        if (this.currentStore.stateProperties.length > 0) {
            for (const prop of this.currentStore.stateProperties) {
                const propItem = new StatePropertyTreeItem(prop.key, vscode.TreeItemCollapsibleState.Collapsed, 'property');
                propItem.propertyInfo = prop;
                propItem.description = prop.type;
                // Add icons based on attributes
                let icon = '';
                if (prop.isEncrypted)
                    icon += '🔒 ';
                if (prop.isPersisted)
                    icon += '💾 ';
                if (prop.isReadonly)
                    icon += '📖 ';
                if (icon)
                    propItem.label = icon + prop.key;
                // Make clickable to go to definition
                propItem.command = {
                    command: 'rgs.goToPropertyDefinition',
                    title: 'Go to Property Definition',
                    arguments: [prop]
                };
                items.push(propItem);
            }
        }
        else {
            const noProps = new StatePropertyTreeItem('No state properties found', vscode.TreeItemCollapsibleState.None, 'hint');
            noProps.description = 'State properties will be extracted from initial state';
            items.push(noProps);
        }
        return items;
    }
}
// ============================================================================
// RGS WELCOME VIEW
// ============================================================================
class RGSWelcomeProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    }
    getTreeItem(element) {
        return element;
    }
    getChildren() {
        const items = [];
        // Header
        const header = new vscode.TreeItem('⚡ RGS (Argis)', vscode.TreeItemCollapsibleState.None);
        header.contextValue = 'header';
        items.push(header);
        // Info
        const info = new vscode.TreeItem('State Management for React', vscode.TreeItemCollapsibleState.None);
        info.contextValue = 'info';
        items.push(info);
        // Action
        const analyzeAction = new vscode.TreeItem('📊 Analyze Workspace', vscode.TreeItemCollapsibleState.None);
        analyzeAction.command = { command: 'rgs.analyzeWorkspace', title: 'Analyze Workspace' };
        analyzeAction.contextValue = 'action';
        items.push(analyzeAction);
        // Version
        const version = new vscode.TreeItem('v3.8.2 | MIT License', vscode.TreeItemCollapsibleState.None);
        version.contextValue = 'footer';
        items.push(version);
        return items;
    }
}
// ============================================================================
// RGS STATE EXPLORER - TREE VIEW
// ============================================================================
class RGSTreeItem extends vscode.TreeItem {
    constructor(label, collapsibleState, itemType) {
        super(label, collapsibleState);
        this.label = label;
        this.collapsibleState = collapsibleState;
        this.itemType = itemType;
        this.contextValue = itemType;
    }
}
class RGSStateExplorerProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.analysis = null;
        this.config = getConfig();
    }
    setAnalysis(analysis) {
        this.analysis = analysis;
        this.config = getConfig();
        this._onDidChangeTreeData.fire();
    }
    refreshConfig() {
        this.config = getConfig();
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if (!this.analysis) {
            const items = [];
            const hint = new RGSTreeItem('Run "RGS: Analyze Workspace"', vscode.TreeItemCollapsibleState.None, 'hint');
            hint.description = 'Click the button above';
            items.push(hint);
            return items;
        }
        if (!element) {
            const items = [];
            // Filter stores based on configuration
            const projectStores = this.analysis.stores.filter(s => s.category === 'project');
            const testStores = this.config.showTestStores
                ? this.analysis.stores.filter(s => s.category === 'test')
                : [];
            // Project Stores
            if (projectStores.length > 0) {
                const storesFolder = new RGSTreeItem('📁 Project Stores (' + projectStores.length + ')', vscode.TreeItemCollapsibleState.Expanded, 'folder-project');
                storesFolder.children = projectStores.map(store => {
                    const item = new RGSTreeItem(store.name, vscode.TreeItemCollapsibleState.Collapsed, 'store');
                    item.storeInfo = store;
                    item.description = store.type;
                    item.resourceUri = vscode.Uri.file(store.filePath);
                    return item;
                });
                items.push(storesFolder);
            }
            // Test Stores (if enabled)
            if (testStores.length > 0) {
                const testFolder = new RGSTreeItem('🧪 Test Stores (' + testStores.length + ')', vscode.TreeItemCollapsibleState.Expanded, 'folder-test');
                testFolder.children = testStores.map(store => {
                    const item = new RGSTreeItem(store.name, vscode.TreeItemCollapsibleState.Collapsed, 'store-test');
                    item.storeInfo = store;
                    // Show test framework in description
                    const frameworkLabel = store.testFramework === 'jest' ? 'Jest' : store.testFramework === 'playwright' ? 'Playwright' : '';
                    item.description = store.type + (frameworkLabel ? ` | ${frameworkLabel}` : '');
                    if (store.testFile) {
                        item.description += ` | ${store.testFile}`;
                    }
                    item.resourceUri = vscode.Uri.file(store.filePath);
                    return item;
                });
                items.push(testFolder);
            }
            // Violations
            if (this.analysis.violations.length > 0) {
                const violationsFolder = new RGSTreeItem('⚠️ Issues (' + this.analysis.violations.length + ')', vscode.TreeItemCollapsibleState.Expanded, 'folder');
                violationsFolder.children = this.analysis.violations.map(v => {
                    const item = new RGSTreeItem(v.message, vscode.TreeItemCollapsibleState.None, 'violation');
                    item.resourceUri = vscode.Uri.file(v.filePath);
                    item.contextValue = 'violation:' + v.severity;
                    return item;
                });
                items.push(violationsFolder);
            }
            return items;
        }
        if ((element.itemType === 'store' || element.itemType === 'store-test') && element.storeInfo) {
            const children = [];
            const store = element.storeInfo;
            // Store Details Section
            const detailsFolder = new RGSTreeItem('📋 Details', vscode.TreeItemCollapsibleState.Expanded, 'folder-details');
            const detailsChildren = [];
            // Name
            const nameItem = new RGSTreeItem(`Name: ${store.name}`, vscode.TreeItemCollapsibleState.None, 'detail');
            detailsChildren.push(nameItem);
            // Type
            const typeItem = new RGSTreeItem(`Type: ${store.type}`, vscode.TreeItemCollapsibleState.None, 'detail');
            detailsChildren.push(typeItem);
            // Test Framework (if applicable)
            if (store.category === 'test' && store.testFramework) {
                const frameworkLabel = store.testFramework === 'jest' ? 'Jest' : 'Playwright';
                const testFwItem = new RGSTreeItem(`Test Framework: ${frameworkLabel}`, vscode.TreeItemCollapsibleState.None, 'detail');
                detailsChildren.push(testFwItem);
                if (store.testFile) {
                    const testFileItem = new RGSTreeItem(`Test File: ${store.testFile}`, vscode.TreeItemCollapsibleState.None, 'detail');
                    detailsChildren.push(testFileItem);
                }
            }
            // Plugins
            if (store.plugins.length > 0) {
                const pluginsItem = new RGSTreeItem(`Plugins (${store.plugins.length})`, vscode.TreeItemCollapsibleState.Expanded, 'folder');
                pluginsItem.children = store.plugins.map(p => new RGSTreeItem(p, vscode.TreeItemCollapsibleState.None, 'plugin'));
                detailsChildren.push(pluginsItem);
            }
            // Security
            const securityItems = [];
            if (store.security.encoded)
                securityItems.push('Encoded');
            if (store.security.rbac)
                securityItems.push('RBAC');
            if (store.security.namespace)
                securityItems.push(`Namespace: ${store.security.namespace}`);
            if (securityItems.length > 0) {
                const securityFolder = new RGSTreeItem('🔒 Security', vscode.TreeItemCollapsibleState.Expanded, 'folder');
                securityFolder.children = securityItems.map(s => new RGSTreeItem(s, vscode.TreeItemCollapsibleState.None, 'security'));
                detailsChildren.push(securityFolder);
            }
            detailsFolder.children = detailsChildren;
            children.push(detailsFolder);
            // Keys
            if (store.keys.length > 0) {
                const keysItem = new RGSTreeItem('Keys (' + store.keys.length + ')', vscode.TreeItemCollapsibleState.Expanded, 'folder');
                keysItem.children = store.keys.map(key => new RGSTreeItem(key, vscode.TreeItemCollapsibleState.None, 'key'));
                children.push(keysItem);
            }
            // File location
            const locationItem = new RGSTreeItem('📁 ' + store.filePath + ':' + store.line, vscode.TreeItemCollapsibleState.None, 'location');
            children.push(locationItem);
            return children;
        }
        return element.children || [];
    }
}
// ============================================================================
// ANALYZER
// ============================================================================
class WorkspaceAnalyzer {
    async analyze(workspaceFolder) {
        const stores = [];
        const states = [];
        const plugins = [];
        const violations = [];
        const files = await this.findTypeScriptFiles(workspaceFolder.uri.fsPath);
        for (const filePath of files) {
            try {
                const content = fs.readFileSync(filePath, 'utf-8');
                // Determine store category based on file path
                const isTestFile = filePath.includes('/tests/') || filePath.includes('\\tests\\');
                const isJestTest = filePath.includes('/tests/jest/') || filePath.includes('\\tests\\jest\\');
                const isPlaywrightTest = filePath.includes('/tests/playwright/') || filePath.includes('\\tests\\playwright\\');
                // Determine test framework
                let testFramework = undefined;
                if (isJestTest)
                    testFramework = 'jest';
                else if (isPlaywrightTest)
                    testFramework = 'playwright';
                // Find store creations
                const storePattern = /(?:const|let|var)\s+(\w+)\s*=\s*(createStore|initState)\s*[<(]/g;
                let match;
                while ((match = storePattern.exec(content)) !== null) {
                    const varName = match[1];
                    const funcType = match[2];
                    const lineNumber = content.substring(0, match.index).split('\n').length;
                    // Extract store configuration for security details
                    const security = this.extractSecurityInfo(content, match.index);
                    // Extract plugins used in this store
                    const storePlugins = this.extractPluginsForStore(content, varName);
                    // Extract state properties from initial state config
                    const stateProperties = this.extractStateProperties(content, match.index, filePath);
                    stores.push({
                        name: varName,
                        filePath,
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
                    });
                }
                // Find state usages
                const statePattern = /useStore\s*\(\s*['"`]([^'"`]+)['"`]/g;
                while ((match = statePattern.exec(content)) !== null) {
                    const key = match[1];
                    if (key) {
                        const lineNumber = content.substring(0, match.index).split('\n').length;
                        states.push({ key, filePath, line: lineNumber, type: 'useStore' });
                    }
                }
                // useSyncedState
                const syncedPattern = /useSyncedState\s*\(\s*['"`]([^'"`]+)['"`]/g;
                while ((match = syncedPattern.exec(content)) !== null) {
                    const key = match[1];
                    if (key) {
                        const lineNumber = content.substring(0, match.index).split('\n').length;
                        states.push({ key, filePath, line: lineNumber, type: 'useSyncedState' });
                    }
                }
                // Find plugins
                const pluginPattern = /_addPlugin\s*\(\s*['"`]([^'"`]+)['"`]/g;
                while ((match = pluginPattern.exec(content)) !== null) {
                    const lineNumber = content.substring(0, match.index).split('\n').length;
                    plugins.push({ name: match[1], filePath, line: lineNumber });
                }
                // Check violations
                const insecureKeys = ['__proto__', 'constructor', 'prototype'];
                for (const key of insecureKeys) {
                    const pattern = new RegExp('set\\s*\\(\\s*[\'"`]' + key + '[\'"`]');
                    if (pattern.test(content)) {
                        const m = content.match(pattern);
                        if (m) {
                            const lineNum = content.substring(0, content.indexOf(m[0])).split('\n').length;
                            violations.push({
                                message: 'Security: Cannot set ' + key,
                                severity: 'error',
                                filePath,
                                line: lineNum
                            });
                        }
                    }
                }
            }
            catch (error) {
                console.error('Error analyzing ' + filePath, error);
            }
        }
        return { stores, states, plugins, violations, timestamp: new Date() };
    }
    extractSecurityInfo(content, storeStartIndex) {
        // Look for security-related config in the store creation
        const searchRange = content.substring(storeStartIndex, storeStartIndex + 2000);
        const encoded = /encoded:\s*true/.test(searchRange) || /encode:\s*true/.test(searchRange);
        const rbac = /rbac:\s*true/.test(searchRange) || /rbacEnabled:\s*true/.test(searchRange);
        // Extract namespace
        const namespaceMatch = searchRange.match(/namespace:\s*['"`]([^'"`]+)['"`]/);
        const namespace = namespaceMatch ? namespaceMatch[1] : undefined;
        return { encoded, rbac, namespace };
    }
    extractPluginsForStore(content, storeName) {
        const plugins = [];
        // Find _addPlugin calls after store creation
        const pluginPattern = /_addPlugin\s*\(\s*['"`]([^'"`]+)['"`]/g;
        let match;
        while ((match = pluginPattern.exec(content)) !== null) {
            plugins.push(match[1]);
        }
        return plugins;
    }
    extractStateProperties(content, storeStartIndex, filePath) {
        const properties = [];
        // Find the store configuration object after createStore or initState
        const searchRange = content.substring(storeStartIndex, storeStartIndex + 3000);
        // Look for state property definitions like:
        // state: { key: value } or state: { key: type }
        // We'll extract keys and their initial values
        // Match state: { ... } pattern
        const stateMatch = searchRange.match(/state:\s*\{([^}]+)\}/s);
        if (!stateMatch)
            return properties;
        const stateContent = stateMatch[1];
        const lines = stateContent.split('\n');
        for (const line of lines) {
            // Match key: value patterns
            const propMatch = line.match(/^\s*(\w+)\s*:\s*(.+?),?\s*$/);
            if (propMatch) {
                const key = propMatch[1];
                const value = propMatch[2].trim();
                // Detect type from value
                let type = 'unknown';
                let defaultValue = value;
                let isPersisted = false;
                let isEncrypted = false;
                let isReadonly = false;
                // Check for persist options after the value (may be on same or next line)
                const persistMatch = line.match(/persist:\s*true/);
                if (persistMatch)
                    isPersisted = true;
                const encryptedMatch = line.match(/encrypted:\s*true/);
                if (encryptedMatch)
                    isEncrypted = true;
                const readonlyMatch = line.match(/readonly:\s*true/);
                if (readonlyMatch)
                    isReadonly = true;
                // Infer type from value
                if (value === 'null' || value === 'undefined') {
                    type = 'null';
                }
                else if (value === 'true' || value === 'false') {
                    type = 'boolean';
                }
                else if (/^['"`].*['"`]$/.test(value)) {
                    type = 'string';
                }
                else if (/^\d+(\.\d+)?$/.test(value)) {
                    type = 'number';
                }
                else if (value.startsWith('[') || value.startsWith('{')) {
                    type = value.startsWith('[') ? 'array' : 'object';
                }
                else if (value.includes('=>')) {
                    type = 'function';
                }
                else if (/^[A-Z]/.test(value) && !value.includes(' ')) {
                    type = 'class';
                }
                // Find line number in original content
                const keyIndex = content.indexOf(key, storeStartIndex);
                const lineNumber = keyIndex > 0 ? content.substring(0, keyIndex).split('\n').length : 1;
                properties.push({
                    key,
                    type,
                    defaultValue: defaultValue.replace(/,$/, ''),
                    isPersisted,
                    isEncrypted,
                    isReadonly,
                    line: lineNumber,
                    filePath
                });
            }
        }
        return properties;
    }
    findTestFileName(filePath) {
        // Extract the test file name from the path
        const parts = filePath.split(/[/\\]/);
        const testsIndex = parts.findIndex(p => p === 'tests');
        if (testsIndex >= 0 && testsIndex < parts.length - 1) {
            return parts[parts.length - 1];
        }
        return path.basename(filePath);
    }
    async findTypeScriptFiles(dirPath) {
        const files = [];
        const excludeDirs = ['node_modules', '.git', 'dist', 'build', 'coverage', '.vscode'];
        try {
            const items = fs.readdirSync(dirPath);
            for (const item of items) {
                if (excludeDirs.includes(item))
                    continue;
                const fullPath = path.join(dirPath, item);
                const stat = fs.statSync(fullPath);
                if (stat.isDirectory()) {
                    const subFiles = await this.findTypeScriptFiles(fullPath);
                    files.push(...subFiles);
                }
                else if (/\.(ts|tsx|js|jsx)$/.test(item) && !item.endsWith('.d.ts')) {
                    files.push(fullPath);
                }
            }
        }
        catch {
            // Ignore errors
        }
        return files;
    }
}
// ============================================================================
// EXTENSION ACTIVATION
// ============================================================================
function activate(context) {
    console.log('RGS IntelliSense extension activated');
    const config = getConfig();
    const analyzer = new WorkspaceAnalyzer();
    const treeProvider = new RGSStateExplorerProvider();
    const welcomeProvider = new RGSWelcomeProvider();
    const statePropertiesProvider = new RGSStatePropertiesProvider();
    // Listen for configuration changes
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(() => {
        treeProvider.refreshConfig();
    }));
    // Create views lazily only when needed
    let welcomeView;
    let treeView;
    let statePropertiesView;
    const getWelcomeView = () => {
        if (!welcomeView) {
            welcomeView = vscode.window.createTreeView('rgsWelcome', {
                treeDataProvider: welcomeProvider,
                showCollapseAll: false
            });
            context.subscriptions.push(welcomeView);
        }
        return welcomeView;
    };
    const getTreeView = async () => {
        if (!treeView) {
            treeView = vscode.window.createTreeView('rgsStateExplorer', {
                treeDataProvider: treeProvider,
                showCollapseAll: true
            });
            context.subscriptions.push(treeView);
            // Auto-analyze on first view open
            if (!treeProvider.analysis && vscode.workspace.workspaceFolders?.length) {
                try {
                    const analysis = await analyzer.analyze(vscode.workspace.workspaceFolders[0]);
                    treeProvider.setAnalysis(analysis);
                }
                catch (e) {
                    console.error('Auto-analysis failed:', e);
                }
            }
            // Handle selection
            treeView.onDidChangeSelection(async (e) => {
                const selected = e.selection[0];
                if (!selected)
                    return;
                if (selected.storeInfo) {
                    const doc = await vscode.workspace.openTextDocument(selected.storeInfo.filePath);
                    const editor = await vscode.window.showTextDocument(doc);
                    const pos = new vscode.Position(selected.storeInfo.line - 1, 0);
                    editor.selection = new vscode.Selection(pos, pos);
                    editor.revealRange(new vscode.Range(pos, pos));
                }
                if (selected.contextValue?.startsWith('violation:')) {
                    const violations = treeProvider.analysis?.violations || [];
                    const violation = violations.find((v) => v.message === selected.label);
                    if (violation) {
                        const doc = await vscode.workspace.openTextDocument(violation.filePath);
                        const editor = await vscode.window.showTextDocument(doc);
                        const pos = new vscode.Position(violation.line - 1, 0);
                        editor.selection = new vscode.Selection(pos, pos);
                        editor.revealRange(new vscode.Range(pos, pos));
                    }
                }
                // Update State Properties view when store is selected
                if (selected.storeInfo) {
                    statePropertiesProvider.setStore(selected.storeInfo);
                    // Ensure the State Properties view is visible
                    getStatePropertiesView();
                }
            });
        }
        return treeView;
    };
    const getStatePropertiesView = () => {
        if (!statePropertiesView) {
            statePropertiesView = vscode.window.createTreeView('rgsStateProperties', {
                treeDataProvider: statePropertiesProvider,
                showCollapseAll: true
            });
            context.subscriptions.push(statePropertiesView);
        }
        return statePropertiesView;
    };
    // Register commands
    context.subscriptions.push(vscode.commands.registerCommand('rgs.welcome', () => {
        getWelcomeView();
    }));
    context.subscriptions.push(vscode.commands.registerCommand('rgs.analyzeWorkspace', async () => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            vscode.window.showWarningMessage('No workspace folder found');
            return;
        }
        vscode.window.showInformationMessage('Analyzing workspace...');
        try {
            const analysis = await analyzer.analyze(workspaceFolders[0]);
            treeProvider.setAnalysis(analysis);
            // Show tree view
            await getTreeView();
            const storeCount = analysis.stores.length;
            const issueCount = analysis.violations.length;
            vscode.window.showInformationMessage('Analysis complete: ' + storeCount + ' stores, ' + issueCount + ' issues');
        }
        catch (error) {
            vscode.window.showErrorMessage('Analysis failed: ' + error);
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand('rgs.showStoreDetails', async () => {
        if (!treeProvider.analysis?.stores?.length) {
            vscode.window.showInformationMessage('Run "RGS: Analyze Workspace" first');
            return;
        }
        const storeNames = treeProvider.analysis.stores.map((s) => s.name);
        const selected = await vscode.window.showQuickPick(storeNames, {
            placeHolder: 'Select a store'
        });
        if (!selected)
            return;
        const store = treeProvider.analysis.stores.find((s) => s.name === selected);
        if (!store)
            return;
        vscode.window.showInformationMessage('Store: ' + store.name + ' | File: ' + path.basename(store.filePath) + ':' + store.line);
    }));
    context.subscriptions.push(vscode.commands.registerCommand('rgs.goToStoreDefinition', async () => {
        if (!treeProvider.analysis?.stores?.length) {
            vscode.window.showInformationMessage('Run "RGS: Analyze Workspace" first');
            return;
        }
        const storeNames = treeProvider.analysis.stores.map((s) => s.name);
        const selected = await vscode.window.showQuickPick(storeNames, {
            placeHolder: 'Select a store'
        });
        if (!selected)
            return;
        const store = treeProvider.analysis.stores.find((s) => s.name === selected);
        if (!store)
            return;
        const doc = await vscode.workspace.openTextDocument(store.filePath);
        const editor = await vscode.window.showTextDocument(doc);
        const pos = new vscode.Position(store.line - 1, 0);
        editor.selection = new vscode.Selection(pos, pos);
        editor.revealRange(new vscode.Range(pos, pos));
    }));
    // Register go to property definition command
    context.subscriptions.push(vscode.commands.registerCommand('rgs.goToPropertyDefinition', async (property) => {
        if (!property) {
            vscode.window.showInformationMessage('No property selected');
            return;
        }
        try {
            const doc = await vscode.workspace.openTextDocument(property.filePath);
            const editor = await vscode.window.showTextDocument(doc);
            const pos = new vscode.Position(property.line - 1, 0);
            editor.selection = new vscode.Selection(pos, pos);
            editor.revealRange(new vscode.Range(pos, pos));
        }
        catch (error) {
            vscode.window.showErrorMessage('Failed to open file: ' + property.filePath);
        }
    }));
    // Register completion provider
    if (config.enableAutocomplete) {
        const completionProvider = vscode.languages.registerCompletionItemProvider(['typescript', 'typescriptreact', 'javascript', 'javascriptreact'], {
            provideCompletionItems(document, position, _token, _context) {
                const line = document.lineAt(position.line).text;
                const beforeCursor = line.substring(0, position.character);
                const isRGSContext = /import\s+.*from\s+['"]@biglogic\/rgs['"]/.test(beforeCursor) ||
                    /import\s+.*from\s+['"]gstate['"]/.test(beforeCursor) ||
                    /createStore|initState|useStore|IStore|StoreConfig/g.test(beforeCursor);
                if (!isRGSContext)
                    return [];
                return completionsData.map(item => {
                    const completion = new vscode.CompletionItem(item.label, item.kind);
                    completion.insertText = item.insertText;
                    completion.documentation = item.documentation;
                    completion.detail = item.detail;
                    completion.sortText = String(1000 - item.priority).padStart(4, '0');
                    return completion;
                });
            },
        }, ...['.', '(', ',']);
        context.subscriptions.push(completionProvider);
    }
    // Register hover provider
    if (config.enableHover) {
        const hoverProvider = vscode.languages.registerHoverProvider(['typescript', 'typescriptreact', 'javascript', 'javascriptreact'], {
            provideHover(document, position, _token) {
                const wordRange = document.getWordRangeAtPosition(position);
                if (!wordRange)
                    return null;
                const word = document.getText(wordRange);
                const hoverInfo = hoverData[word];
                if (!hoverInfo)
                    return null;
                const line = document.lineAt(position.line).text;
                const isRGSContext = /import\s+.*from\s+['"]@biglogic\/rgs['"]/.test(line) ||
                    /import\s+.*from\s+['"]gstate['"]/.test(line) ||
                    /createStore|initState|useStore|StoreConfig|IStore/g.test(line);
                if (!isRGSContext)
                    return null;
                const md = new vscode.MarkdownString(hoverInfo.content);
                md.isTrusted = true;
                return new vscode.Hover(md, wordRange);
            },
        });
        context.subscriptions.push(hoverProvider);
    }
    // Register diagnostics
    if (config.enableDiagnostics) {
        const diagnosticCollection = vscode.languages.createDiagnosticCollection('rgs');
        const runDiagnostics = (document) => {
            if (document.languageId !== 'typescript' &&
                document.languageId !== 'typescriptreact' &&
                document.languageId !== 'javascript' &&
                document.languageId !== 'javascriptreact') {
                return;
            }
            const text = document.getText();
            const diagnostics = [];
            for (const rule of diagnosticRules) {
                const matches = text.matchAll(rule.pattern);
                for (const match of matches) {
                    const index = match.index || 0;
                    const startPos = document.positionAt(index);
                    const endPos = document.positionAt(index + match[0].length);
                    const diagnostic = new vscode.Diagnostic(new vscode.Range(startPos, endPos), rule.message, rule.severity);
                    if (rule.suggest) {
                        diagnostic.code = rule.suggest;
                    }
                    diagnostics.push(diagnostic);
                }
            }
            diagnosticCollection.set(document.uri, diagnostics);
        };
        vscode.workspace.textDocuments.forEach(runDiagnostics);
        context.subscriptions.push(vscode.workspace.onDidChangeTextDocument((event) => {
            runDiagnostics(event.document);
        }));
        context.subscriptions.push(vscode.workspace.onDidOpenTextDocument((document) => {
            runDiagnostics(document);
        }));
    }
    // Register Go to Definition
    const definitionProvider = vscode.languages.registerDefinitionProvider(['typescript', 'typescriptreact', 'javascript', 'javascriptreact'], {
        provideDefinition(document, position, _token) {
            const wordRange = document.getWordRangeAtPosition(position);
            if (!wordRange)
                return null;
            const word = document.getText(wordRange);
            const text = document.getText();
            const lines = text.split('\n');
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const match = line.match(/(?:const|let|var)\s+(\w+)\s*=\s*(createStore|initState)/);
                if (match && match[1] === word) {
                    const startPos = new vscode.Position(i, 0);
                    const endPos = new vscode.Position(i, line.length);
                    return new vscode.Location(document.uri, new vscode.Range(startPos, endPos));
                }
            }
            return null;
        },
    });
    context.subscriptions.push(definitionProvider);
    // Register RGS decorator
    const rgsDecoration = vscode.window.createTextEditorDecorationType({
        light: { color: '#0078d4', fontWeight: 'bold' },
        dark: { color: '#4fc1ff', fontWeight: 'bold' },
    });
    const applyDecorations = () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor)
            return;
        const document = editor.document;
        const text = document.getText();
        const apiRegex = /\b(createStore|initState|useStore|useSyncedState|getStore|destroyState)\b/g;
        const decorations = [];
        let match;
        while ((match = apiRegex.exec(text)) !== null) {
            const startPos = document.positionAt(match.index);
            const endPos = document.positionAt(match.index + match[0].length);
            const line = document.lineAt(startPos.line).text;
            const lineBeforeCursor = line.substring(0, startPos.character);
            if (lineBeforeCursor.includes('//') || lineBeforeCursor.includes('/*'))
                continue;
            decorations.push({ range: new vscode.Range(startPos, endPos) });
        }
        editor.setDecorations(rgsDecoration, decorations);
    };
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(() => applyDecorations()), vscode.window.onDidChangeActiveTextEditor(() => applyDecorations()));
    if (vscode.window.activeTextEditor) {
        applyDecorations();
    }
    console.log('RGS IntelliSense extension loaded');
}
function deactivate() {
    console.log('RGS IntelliSense extension deactivated');
}
//# sourceMappingURL=extension.js.map