var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// core/store.ts
import { produce as _immerProduce2, freeze as _immerFreeze2 } from "immer";

// core/security.ts
var REGEX_TIMEOUT_MS = 100;
var safeRegexTest = (pattern, key) => {
  const startTime = Date.now();
  if (/\(\.*\+\?\)\+/.test(pattern) || /\(\.*\?\)\*/.test(pattern)) {
    console.warn(`[gstate] Potentially dangerous regex pattern blocked: ${pattern}`);
    return false;
  }
  if (pattern.length > 500) {
    console.warn(`[gstate] Regex pattern exceeds maximum length limit`);
    return false;
  }
  try {
    const regex = new RegExp(pattern);
    const result = regex.test(key);
    const elapsed = Date.now() - startTime;
    if (elapsed > REGEX_TIMEOUT_MS) {
      console.warn(`[gstate] Slow regex detected (${elapsed}ms) for pattern: ${pattern}`);
    }
    return result;
  } catch {
    return false;
  }
};
var safeRandomUUID = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    try {
      return crypto.randomUUID();
    } catch {
    }
  }
  throw new Error("Cryptographically secure random UUID generation is required but crypto.randomUUID is unavailable. Please use a browser or environment with Web Crypto API support.");
};
var isCryptoAvailable = typeof crypto !== "undefined" && typeof crypto.subtle !== "undefined" && typeof crypto.subtle.generateKey === "function";
var deriveKeyFromPassword = async (password, salt, iterations = 1e5) => {
  if (!isCryptoAvailable) throw new Error("Web Crypto API not available");
  const passwordKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: new Uint8Array(salt),
      iterations,
      hash: "SHA-256"
    },
    passwordKey,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  return { key, iv };
};
var generateSalt = (length = 16) => {
  return crypto.getRandomValues(new Uint8Array(length));
};
var generateEncryptionKey = async () => {
  if (!isCryptoAvailable) throw new Error("Web Crypto API not available");
  const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  ), iv = crypto.getRandomValues(new Uint8Array(12));
  return { key, iv };
};
var exportKey = async (encryptionKey) => {
  const exportedKey = await crypto.subtle.exportKey("raw", encryptionKey.key);
  return {
    key: btoa(String.fromCharCode(...new Uint8Array(exportedKey))),
    iv: btoa(String.fromCharCode(...encryptionKey.iv))
  };
};
var importKey = async (keyData, ivData) => {
  const keyBytes = Uint8Array.from(atob(keyData), (c) => c.charCodeAt(0)), ivBytes = Uint8Array.from(atob(ivData), (c) => c.charCodeAt(0)), key = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
  return { key, iv: ivBytes };
};
var encrypt = async (data, encryptionKey) => {
  const encoder = new TextEncoder(), encoded = encoder.encode(JSON.stringify(data)), encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: encryptionKey.iv },
    encryptionKey.key,
    encoded
  ), combined = new Uint8Array(encryptionKey.iv.length + encrypted.byteLength);
  combined.set(encryptionKey.iv);
  combined.set(new Uint8Array(encrypted), encryptionKey.iv.length);
  return btoa(String.fromCharCode(...combined));
};
var decrypt = async (encryptedData, encryptionKey) => {
  const combined = Uint8Array.from(atob(encryptedData), (c) => c.charCodeAt(0)), iv = combined.slice(0, 12), ciphertext = combined.slice(12), decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    encryptionKey.key,
    ciphertext
  );
  return JSON.parse(new TextDecoder().decode(decrypted));
};
var _auditLogger = null;
var setAuditLogger = (logger) => {
  _auditLogger = logger;
};
var isAuditActive = () => _auditLogger !== null;
var logAudit = (entry) => {
  if (_auditLogger) _auditLogger(entry);
};
var addAccessRule = (rules, pattern, perms) => {
  rules.set(pattern instanceof RegExp ? pattern.source : pattern, perms);
};
var hasPermission = (rules, key, action, _userId) => {
  if (rules.size === 0) return true;
  for (const [pattern, perms] of rules) {
    let matches;
    if (typeof pattern === "function") {
      matches = pattern(key, _userId);
    } else {
      matches = safeRegexTest(pattern, key);
    }
    if (matches) {
      return perms.includes(action) || perms.includes("admin");
    }
  }
  return false;
};
var sanitizeValue = (value) => {
  if (typeof value === "string") {
    let decoded = value.replace(/&#[xX]?[0-9a-fA-F]+;?/g, (match) => {
      const hexMatch = match.match(/&#x([0-9a-fA-F]+);?/i);
      if (hexMatch && hexMatch[1]) {
        return String.fromCharCode(parseInt(hexMatch[1], 16));
      }
      const decMatch = match.match(/&#([0-9]+);?/);
      if (decMatch && decMatch[1]) {
        return String.fromCharCode(parseInt(decMatch[1], 10));
      }
      return match;
    });
    try {
      decoded = decodeURIComponent(decoded);
    } catch {
    }
    const schemeCheck = decoded.replace(/\b(javascript|vbscript|data:text\/html|about:blank|chrome:)/gi, "[SEC-REMOVED]");
    return schemeCheck.replace(/<script\b[^>]*>[\s\S]*?<\s*\/\s*script\b[^>]*>/gi, "[SEC-REMOVED]").replace(/on\w+\s*=/gi, "[SEC-REMOVED]=").replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "[SEC-REMOVED]").replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, "[SEC-REMOVED]").replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, "[SEC-REMOVED]").replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, "[SEC-REMOVED]").replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, "[SEC-REMOVED]").replace(/<base\b[^<]*(?:(?!<\/base>)<[^<]*)*<\/base>/gi, "[SEC-REMOVED]").replace(/<link\b[^<]*(?:(?!<\/link>)<[^<]*)*<\/link>/gi, "[SEC-REMOVED]").replace(/<meta\b[^<]*(?:(?!<\/meta>)<[^<]*)*<\/meta>/gi, "[SEC-REMOVED]").replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "[SEC-REMOVED]");
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    if (Object.getPrototypeOf(value) === Object.prototype) {
      const sanitized = {};
      for (const [k, v] of Object.entries(value)) {
        sanitized[k] = sanitizeValue(v);
      }
      return sanitized;
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((v) => sanitizeValue(v));
  }
  return value;
};
var validateKey = (key) => /^[a-zA-Z0-9_.-]+$/.test(key) && key.length <= 256;
var recordConsent = (consents, userId, purpose, granted) => {
  const record = { id: safeRandomUUID(), purpose, granted, timestamp: Date.now() }, user = consents.get(userId) || [];
  user.push(record);
  consents.set(userId, user);
  logAudit({ timestamp: Date.now(), action: "set", key: `consent:${purpose}`, userId, success: true });
  return record;
};
var hasConsent = (consents, userId, purpose) => {
  const userConsents = consents.get(userId);
  if (!userConsents) return false;
  for (let i = userConsents.length - 1; i >= 0; i--) {
    const record = userConsents[i];
    if (record && record.purpose === purpose) {
      return record.granted;
    }
  }
  return false;
};
var revokeConsent = (consents, userId, purpose) => {
  return recordConsent(consents, userId, purpose, false);
};
var getConsents = (consents, userId) => consents.get(userId) || [];
var exportUserData = (consents, userId) => ({ userId, exportedAt: Date.now(), consents: consents.get(userId) || [] });
var deleteUserData = (consents, userId) => {
  const count = consents.get(userId)?.length || 0;
  consents.delete(userId);
  return { success: true, deletedConsents: count };
};

// core/utils.ts
var deepClone = (obj) => {
  if (obj === null || typeof obj !== "object") return obj;
  if (typeof structuredClone === "function") {
    try {
      return structuredClone(obj);
    } catch (_e) {
    }
  }
  const seen = /* @__PURE__ */ new WeakMap();
  const clone = (value) => {
    if (value === null || typeof value !== "object") return value;
    if (typeof value === "function") return value;
    if (seen.has(value)) return seen.get(value);
    if (value instanceof Date) return new Date(value.getTime());
    if (value instanceof RegExp) return new RegExp(value.source, value.flags);
    if (value instanceof Map) {
      const result2 = /* @__PURE__ */ new Map();
      seen.set(value, result2);
      value.forEach((v, k) => result2.set(clone(k), clone(v)));
      return result2;
    }
    if (value instanceof Set) {
      const result2 = /* @__PURE__ */ new Set();
      seen.set(value, result2);
      value.forEach((v) => result2.add(clone(v)));
      return result2;
    }
    const result = Array.isArray(value) ? [] : Object.create(Object.getPrototypeOf(value));
    seen.set(value, result);
    const keys = [...Object.keys(value), ...Object.getOwnPropertySymbols(value)];
    for (const key of keys) {
      result[key] = clone(value[key]);
    }
    return result;
  };
  return clone(obj);
};
var isEqual = (a, b) => {
  if (a === b) return true;
  if (a === null || b === null) return a === b;
  if (typeof a !== "object" || typeof b !== "object") return a === b;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!isEqual(a[i], b[i])) return false;
    return true;
  }
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (let i = 0; i < keysA.length; i++) {
    const key = keysA[i];
    if (!(key in b) || !isEqual(a[key], b[key])) return false;
  }
  return true;
};

// core/persistence.ts
import { freeze as _immerFreeze } from "immer";
var _getPrefix = (namespace) => `${namespace}_`;
var flushDisk = async (ctx) => {
  if (!ctx.storage) return;
  const { store, config, diskQueue, storage, encryptionKey, audit, onError, silent, currentVersion } = ctx;
  const prefix = _getPrefix(config.namespace || "gstate");
  try {
    const stateObj = {};
    store.forEach((v, k) => {
      stateObj[k] = v;
    });
    let dataValue;
    const isEncoded = config?.encoded;
    if (isEncoded) {
      dataValue = btoa(JSON.stringify(stateObj));
    } else {
      dataValue = JSON.stringify(stateObj);
    }
    storage.setItem(prefix.replace("_", ""), JSON.stringify({
      v: 1,
      t: Date.now(),
      e: null,
      d: dataValue,
      _sys_v: currentVersion,
      _b64: isEncoded ? true : void 0
    }));
    audit("set", "FULL_STATE", true);
  } catch (e) {
    const error = e instanceof Error ? e : new Error(String(e));
    if (onError) onError(error, { operation: "persist", key: "FULL_STATE" });
    else if (!silent) console.error(`[gstate] Persist failed: `, error);
  }
  const queue = Array.from(diskQueue.entries());
  diskQueue.clear();
  for (const [key, data] of queue) {
    try {
      if (!key || !/^[a-zA-Z0-9_.-]+$/.test(key) || key.length > 256) {
        console.warn(`[gstate] Invalid storage key: ${key}`);
        continue;
      }
      let dataValue = data.value;
      const isEncoded = data.options.encoded || data.options.encrypted || data.options.secure;
      if (data.options.encrypted) {
        if (!encryptionKey) throw new Error(`Encryption key missing for "${key}"`);
        dataValue = await encrypt(data.value, encryptionKey);
      } else if (isEncoded) {
        dataValue = btoa(JSON.stringify(data.value));
      } else if (typeof data.value === "object" && data.value !== null) {
        dataValue = JSON.stringify(data.value);
      }
      storage.setItem(`${prefix}${key}`, JSON.stringify({
        v: ctx.versions.get(key) || 1,
        t: Date.now(),
        e: data.options.ttl ? Date.now() + data.options.ttl : null,
        d: dataValue,
        _sys_v: currentVersion,
        _enc: data.options.encrypted ? true : void 0,
        _b64: data.options.encoded || data.options.secure ? true : void 0
      }));
      audit("set", key, true);
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      if (onError) onError(error, { operation: "persist", key });
      else if (!silent) console.error(`[gstate] Persist failed: `, error);
    }
  }
};
var hydrateStore = async (ctx, calculateSize, emit) => {
  const { storage, config, encryptionKey, audit, onError, silent, currentVersion, store, sizes, versions } = ctx;
  const prefix = _getPrefix(config.namespace || "gstate");
  const immer = config.immer ?? true;
  if (!storage) return;
  try {
    const persisted = {};
    let savedV = 0;
    for (let i = 0; i < (storage.length || 0); i++) {
      const k = storage.key(i);
      if (!k || !k.startsWith(prefix)) continue;
      const raw = storage.getItem(k);
      if (!raw) continue;
      try {
        const meta = JSON.parse(raw), key = k.substring(prefix.length);
        savedV = Math.max(savedV, meta._sys_v !== void 0 ? meta._sys_v : meta.v || 0);
        if (meta.e && Date.now() > meta.e) {
          storage.removeItem(k);
          i--;
          continue;
        }
        let d = meta.d;
        if (meta._enc && encryptionKey) {
          d = await decrypt(d, encryptionKey);
        } else if (typeof d === "string") {
          if (meta._b64) {
            try {
              d = JSON.parse(atob(d));
            } catch (_e) {
            }
          } else if (d.startsWith("{") || d.startsWith("[")) {
            try {
              d = JSON.parse(d);
            } catch (_e) {
            }
          }
        }
        persisted[key] = d;
        audit("hydrate", key, true);
      } catch (err) {
        audit("hydrate", k, false, String(err));
        const error = err instanceof Error ? err : new Error(String(err));
        if (onError) onError(error, { operation: "hydration", key: k });
        else if (!silent) console.error(`[gstate] Hydration failed for "${k}": `, err);
      }
    }
    const final = savedV < currentVersion && config.migrate ? config.migrate(persisted, savedV) : persisted;
    Object.entries(final).forEach(([k, v]) => {
      const frozen = immer && v !== null && typeof v === "object" ? _immerFreeze(deepClone(v), true) : v;
      const size = calculateSize(frozen);
      const oldSize = sizes.get(k) || 0;
      ctx.totalSize = ctx.totalSize - oldSize + size;
      sizes.set(k, size);
      store.set(k, frozen);
      versions.set(k, 1);
    });
    emit();
  } catch (e) {
    const error = e instanceof Error ? e : new Error(String(e));
    if (onError) onError(error, { operation: "hydration" });
    else if (!silent) console.error(`[gstate] Hydration failed: `, error);
  }
};

// core/plugins.ts
var runHook = (ctx, name, hookContext) => {
  if (ctx.plugins.size === 0) return;
  for (const p of ctx.plugins.values()) {
    const hook = p.hooks?.[name];
    if (hook) {
      try {
        hook(hookContext);
      } catch (e) {
        const error = e instanceof Error ? e : new Error(String(e));
        if (ctx.onError) ctx.onError(error, { operation: `plugin:${p.name}:${name}`, key: hookContext.key });
        else if (!ctx.silent) console.error(`[gstate] Plugin "${p.name}" error:`, e);
      }
    }
  }
};
var installPlugin = (ctx, plugin, storeInstance) => {
  try {
    ctx.plugins.set(plugin.name, plugin);
    plugin.hooks?.onInstall?.({ store: storeInstance });
  } catch (e) {
    const error = e instanceof Error ? e : new Error(String(e));
    if (ctx.onError) ctx.onError(error, { operation: "plugin:install", key: plugin.name });
    else if (!ctx.silent) console.error(`[gstate] Failed to install plugin "${plugin.name}": `, e);
  }
};

// core/sync.ts
var SyncEngine = class {
  constructor(store, config) {
    __publicField(this, "store");
    __publicField(this, "config");
    __publicField(this, "pendingQueue", /* @__PURE__ */ new Map());
    __publicField(this, "remoteVersions", /* @__PURE__ */ new Map());
    __publicField(this, "syncTimer", null);
    __publicField(this, "onlineStatusListeners", /* @__PURE__ */ new Set());
    __publicField(this, "syncStateListeners", /* @__PURE__ */ new Set());
    __publicField(this, "_isOnline", true);
    __publicField(this, "_isSyncing", false);
    this.store = store;
    this.config = {
      endpoint: config.endpoint,
      authToken: config.authToken || "",
      strategy: config.strategy || "last-write-wins",
      autoSyncInterval: config.autoSyncInterval ?? 3e4,
      syncOnReconnect: config.syncOnReconnect ?? true,
      debounceTime: config.debounceTime ?? 1e3,
      fetch: config.fetch || fetch,
      onSync: config.onSync || (() => {
      }),
      onConflict: config.onConflict || (() => ({ action: "accept-local" })),
      maxRetries: config.maxRetries ?? 3
    };
    this._isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
    this._setupOnlineListener();
    this._setupStoreListener();
    if (this.config.autoSyncInterval > 0) {
      this._startAutoSync();
    }
  }
  /**
   * Get current auth token (supports both static string and getter function)
   */
  _getAuthToken() {
    const token = this.config.authToken;
    if (typeof token === "function") {
      return token() || "";
    }
    return token || "";
  }
  _setupOnlineListener() {
    if (typeof window === "undefined") return;
    window.addEventListener("online", () => {
      this._isOnline = true;
      this._notifyOnlineChange(true);
      if (this.config.syncOnReconnect) {
        this.sync();
      }
    });
    window.addEventListener("offline", () => {
      this._isOnline = false;
      this._notifyOnlineChange(false);
    });
  }
  _setupStoreListener() {
    this.store._subscribe(() => {
    });
  }
  _startAutoSync() {
    setInterval(() => {
      if (this._isOnline && !this._isSyncing && this.pendingQueue.size > 0) {
        this.sync();
      }
    }, this.config.autoSyncInterval);
  }
  _notifyOnlineChange(online) {
    this.onlineStatusListeners.forEach((cb) => cb(online));
    this._notifyStateChange();
  }
  _notifyStateChange() {
    const state = this.getState();
    this.syncStateListeners.forEach((cb) => cb(state));
  }
  /**
   * Queue a change for synchronization
   */
  queueChange(key, value) {
    const version = this.store._getVersion(key) || 1;
    this.pendingQueue.set(key, {
      key,
      value: deepClone(value),
      timestamp: Date.now(),
      version
    });
    this._notifyStateChange();
    if (this.syncTimer) clearTimeout(this.syncTimer);
    this.syncTimer = setTimeout(() => {
      if (this._isOnline) this.sync();
    }, this.config.debounceTime);
  }
  /**
   * Perform synchronization with remote server
   */
  async sync() {
    if (this._isSyncing) {
      return {
        success: false,
        syncedKeys: [],
        conflicts: [],
        errors: ["Sync already in progress"],
        timestamp: Date.now(),
        duration: 0
      };
    }
    this._isSyncing = true;
    this._notifyStateChange();
    const startTime = Date.now();
    const syncedKeys = [];
    const conflicts = [];
    const errors = [];
    try {
      const pendingChanges = Array.from(this.pendingQueue.values());
      if (pendingChanges.length === 0) {
        this._isSyncing = false;
        this._notifyStateChange();
        return {
          success: true,
          syncedKeys: [],
          conflicts: [],
          errors: [],
          timestamp: Date.now(),
          duration: Date.now() - startTime
        };
      }
      await this._fetchRemoteVersions(pendingChanges.map((p) => p.key));
      for (const change of pendingChanges) {
        try {
          const remoteVersion = this.remoteVersions.get(change.key);
          if (!remoteVersion) {
            await this._pushChange(change);
            syncedKeys.push(change.key);
            this.pendingQueue.delete(change.key);
          } else if (remoteVersion.version >= change.version) {
            const conflict = {
              key: change.key,
              localValue: change.value,
              remoteValue: remoteVersion.value,
              localVersion: change.version,
              remoteVersion: remoteVersion.version,
              timestamp: change.timestamp
            };
            conflicts.push(conflict);
            const resolution = this.config.onConflict(conflict);
            await this._resolveConflict(change, remoteVersion, resolution);
            syncedKeys.push(change.key);
            this.pendingQueue.delete(change.key);
          } else {
            await this._pushChange(change);
            syncedKeys.push(change.key);
            this.pendingQueue.delete(change.key);
          }
        } catch (err) {
          errors.push(`Failed to sync "${change.key}": ${err}`);
        }
      }
      const result = {
        success: errors.length === 0,
        syncedKeys,
        conflicts,
        errors,
        timestamp: Date.now(),
        duration: Date.now() - startTime
      };
      this.config.onSync(result);
      return result;
    } catch (err) {
      const errorMsg = `Sync failed: ${err}`;
      errors.push(errorMsg);
      return {
        success: false,
        syncedKeys,
        conflicts,
        errors,
        timestamp: Date.now(),
        duration: Date.now() - startTime
      };
    } finally {
      this._isSyncing = false;
      this._notifyStateChange();
    }
  }
  async _fetchRemoteVersions(keys) {
    try {
      const authToken = this._getAuthToken();
      const response = await this.config.fetch(`${this.config.endpoint}/versions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authToken && { "Authorization": `Bearer ${authToken}` }
        },
        body: JSON.stringify({ keys })
      });
      if (response.ok) {
        const data = await response.json();
        if (data.versions) {
          for (const [key, version] of Object.entries(data.versions)) {
            this.remoteVersions.set(key, version);
          }
        }
      }
    } catch (err) {
      console.warn("[SyncEngine] Failed to fetch remote versions:", err);
    }
  }
  async _pushChange(change) {
    let retries = 0;
    while (retries < this.config.maxRetries) {
      try {
        const authToken = this._getAuthToken();
        const response = await this.config.fetch(`${this.config.endpoint}/sync`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authToken && { "Authorization": `Bearer ${authToken}` }
          },
          body: JSON.stringify({
            key: change.key,
            value: change.value,
            version: change.version,
            timestamp: change.timestamp
          })
        });
        if (response.ok) {
          const data = await response.json();
          if (data.version) {
            this.remoteVersions.set(change.key, {
              version: data.version,
              timestamp: data.timestamp || Date.now(),
              value: change.value
            });
          }
          return;
        }
        retries++;
      } catch (err) {
        retries++;
        if (retries >= this.config.maxRetries) throw err;
      }
    }
  }
  async _resolveConflict(localChange, remoteVersion, resolution) {
    switch (resolution.action) {
      case "accept-local":
        await this._pushChange({
          ...localChange,
          version: remoteVersion.version + 1,
          timestamp: Date.now()
        });
        break;
      case "accept-remote":
        this.store.set(localChange.key, remoteVersion.value);
        break;
      case "merge":
        this.store.set(localChange.key, resolution.value);
        await this._pushChange({
          key: localChange.key,
          value: resolution.value,
          version: Math.max(localChange.version, remoteVersion.version) + 1,
          timestamp: Date.now()
        });
        break;
      case "discard":
        break;
    }
  }
  /**
   * Get current sync state
   */
  getState() {
    return {
      isOnline: this._isOnline,
      isSyncing: this._isSyncing,
      lastSyncTimestamp: null,
      // Could track this
      pendingChanges: this.pendingQueue.size,
      conflicts: 0
      // Could track unresolved conflicts
    };
  }
  /**
   * Subscribe to online status changes
   */
  onOnlineChange(callback) {
    this.onlineStatusListeners.add(callback);
    return () => this.onlineStatusListeners.delete(callback);
  }
  /**
   * Subscribe to sync state changes
   */
  onStateChange(callback) {
    this.syncStateListeners.add(callback);
    return () => this.syncStateListeners.delete(callback);
  }
  /**
   * Force push all pending changes
   */
  async flush() {
    return this.sync();
  }
  /**
   * Destroy the sync engine
   */
  destroy() {
    if (this.syncTimer) clearTimeout(this.syncTimer);
    this.pendingQueue.clear();
    this.onlineStatusListeners.clear();
    this.syncStateListeners.clear();
  }
};
var createSyncEngine = (store, config) => {
  return new SyncEngine(store, config);
};

// core/env.ts
var isProduction = () => {
  try {
    if (typeof process !== "undefined" && process.env && process.env.NODE_ENV === "production") return true;
    const glob = typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : {};
    if (typeof glob.__DEV__ !== "undefined" && glob.__DEV__ === false) return true;
    return false;
  } catch {
    return false;
  }
};
var isDevelopment = () => !isProduction();

// core/store.ts
var StorageAdapters = {
  local: () => typeof window !== "undefined" ? window.localStorage : null,
  session: () => typeof window !== "undefined" ? window.sessionStorage : null,
  memory: () => {
    const _m = /* @__PURE__ */ new Map();
    return {
      getItem: (k) => _m.get(k) || null,
      setItem: (k, v) => _m.set(k, v),
      removeItem: (k) => _m.delete(k),
      key: (i) => Array.from(_m.keys())[i] || null,
      get length() {
        return _m.size;
      }
    };
  }
};
var createStore = (config) => {
  const _store = /* @__PURE__ */ new Map(), _versions = /* @__PURE__ */ new Map(), _sizes = /* @__PURE__ */ new Map(), _listeners = /* @__PURE__ */ new Set(), _keyListeners = /* @__PURE__ */ new Map(), _middlewares = /* @__PURE__ */ new Set(), _watchers = /* @__PURE__ */ new Map(), _computed = /* @__PURE__ */ new Map(), _computedDeps = /* @__PURE__ */ new Map(), _plugins = /* @__PURE__ */ new Map(), _diskQueue = /* @__PURE__ */ new Map(), _regexCache = /* @__PURE__ */ new Map(), _accessRules = /* @__PURE__ */ new Map(), _consents = /* @__PURE__ */ new Map(), _namespace = config?.namespace || "gstate", _silent = config?.silent ?? false, _debounceTime = config?.debounceTime ?? 150, _currentVersion = config?.version ?? 0, _storage = config?.storage || StorageAdapters.local(), _onError = config?.onError, _maxObjectSize = config?.maxObjectSize ?? 0, _maxTotalSize = config?.maxTotalSize ?? 0, _encryptionKey = config?.encryptionKey ?? null, _validateInput = config?.validateInput ?? true, _auditEnabled = config?.auditEnabled ?? true, _userId = config?.userId, _immer = config?.immer ?? true, _persistByDefault = config?.persistByDefault ?? config?.persistence ?? config?.persist ?? false;
  if (config?.accessRules) {
    config.accessRules.forEach((rule) => addAccessRule(_accessRules, rule.pattern, rule.permissions));
  }
  let _isTransaction = false, _pendingEmit = false, _isReady = false, _totalSize = 0, _diskTimer = null, _snapshot = null;
  let _readyResolver;
  const _readyPromise = new Promise((resolve) => {
    _readyResolver = resolve;
  });
  const _getPrefix2 = () => `${_namespace}_`;
  const getPersistenceContext = () => ({
    store: _store,
    versions: _versions,
    sizes: _sizes,
    totalSize: _totalSize,
    storage: _storage,
    config: config || {},
    diskQueue: _diskQueue,
    encryptionKey: _encryptionKey,
    audit: _audit,
    onError: _onError,
    silent: _silent,
    debounceTime: _debounceTime,
    currentVersion: _currentVersion
  });
  const getPluginContext = () => ({
    plugins: _plugins,
    onError: _onError,
    silent: _silent
  });
  const _calculateSize = (val) => {
    if (val === null || val === void 0) return 0;
    const type = typeof val;
    if (type === "boolean") return 4;
    if (type === "number") return 8;
    if (type === "string") return val.length * 2;
    if (type !== "object") return 0;
    let bytes = 0;
    const stack = [val];
    const seen = /* @__PURE__ */ new WeakSet();
    while (stack.length > 0) {
      const value = stack.pop();
      if (typeof value === "boolean") {
        bytes += 4;
      } else if (typeof value === "number") {
        bytes += 8;
      } else if (typeof value === "string") {
        bytes += value.length * 2;
      } else if (typeof value === "object" && value !== null) {
        const obj = value;
        if (seen.has(obj)) continue;
        seen.add(obj);
        if (Array.isArray(obj)) {
          for (let i = 0; i < obj.length; i++) stack.push(obj[i]);
        } else {
          for (const key of Object.keys(obj)) {
            bytes += key.length * 2;
            stack.push(obj[key]);
          }
        }
      }
    }
    return bytes;
  };
  const _runHook = (name, context) => {
    runHook(getPluginContext(), name, context);
  };
  const _audit = (action, key, success, error) => {
    if (_auditEnabled && isAuditActive() && logAudit) {
      logAudit({ timestamp: Date.now(), action, key, userId: _userId, success, error });
    }
  };
  const _updateComputed = (key) => {
    const comp = _computed.get(key);
    if (!comp) return;
    const depsFound = /* @__PURE__ */ new Set();
    const getter = (k) => {
      depsFound.add(k);
      if (_computed.has(k)) return _computed.get(k).lastValue;
      return instance.get(k);
    };
    const newValue = comp.selector(getter);
    comp.deps.forEach((d) => {
      if (!depsFound.has(d)) {
        const dependents = _computedDeps.get(d);
        if (dependents) {
          dependents.delete(key);
          if (dependents.size === 0) _computedDeps.delete(d);
        }
      }
    });
    depsFound.forEach((d) => {
      if (!comp.deps.has(d)) {
        if (!_computedDeps.has(d)) _computedDeps.set(d, /* @__PURE__ */ new Set());
        _computedDeps.get(d).add(key);
      }
    });
    comp.deps = depsFound;
    if (!isEqual(comp.lastValue, newValue)) {
      comp.lastValue = _immer && newValue !== null && typeof newValue === "object" ? _immerFreeze2(deepClone(newValue), true) : newValue;
      _versions.set(key, (_versions.get(key) || 0) + 1);
      _emit(key);
    }
  };
  const _emit = (changedKey) => {
    if (changedKey) {
      if (_computedDeps.has(changedKey)) {
        const dependents = _computedDeps.get(changedKey);
        for (const dependentKey of dependents) {
          _updateComputed(dependentKey);
        }
      }
      const watchers = _watchers.get(changedKey);
      if (watchers) {
        const val = instance.get(changedKey);
        for (const w of watchers) {
          try {
            w(val);
          } catch (e) {
            const error = e instanceof Error ? e : new Error(String(e));
            if (_onError) _onError(error, { operation: "watcher", key: changedKey });
            else if (!_silent) console.error(`[gstate] Watcher error for "${changedKey}":`, e);
          }
        }
      }
      const keyListeners = _keyListeners.get(changedKey);
      if (keyListeners) {
        for (const l of keyListeners) {
          try {
            l();
          } catch (e) {
            const error = e instanceof Error ? e : new Error(String(e));
            if (_onError) _onError(error, { operation: "keyListener", key: changedKey });
            else if (!_silent) console.error(`[gstate] Listener error for "${changedKey}":`, e);
          }
        }
      }
    }
    if (_isTransaction) {
      _pendingEmit = true;
      return;
    }
    for (const l of _listeners) {
      try {
        l();
      } catch (e) {
        const error = e instanceof Error ? e : new Error(String(e));
        if (_onError) _onError(error, { operation: "listener" });
        else if (!_silent) console.error(`[gstate] Global listener error: `, e);
      }
    }
  };
  const _flushDisk = async () => {
    flushDisk(getPersistenceContext());
  };
  const _methodNamespace = {};
  const instance = {
    _setSilently: (key, value) => {
      const oldSize = _sizes.get(key) || 0, frozen = _immer && value !== null && typeof value === "object" ? _immerFreeze2(deepClone(value), true) : value;
      const hasLimits = (_maxObjectSize > 0 || _maxTotalSize > 0) && !isProduction();
      const newSize = hasLimits ? _calculateSize(frozen) : 0;
      _totalSize = _totalSize - oldSize + newSize;
      _sizes.set(key, newSize);
      _store.set(key, frozen);
      _versions.set(key, (_versions.get(key) || 0) + 1);
      _snapshot = null;
    },
    /**
     * Registers a custom method on the store instance.
     * @param pluginName - Plugin name
     * @param methodName - Method name
     * @param fn - Method function
     */
    _registerMethod: (pluginName, methodName, fn) => {
      const isUnsafeKey = (key) => key === "__proto__" || key === "constructor" || key === "prototype";
      if (isUnsafeKey(pluginName) || isUnsafeKey(methodName)) {
        console.warn("[gstate] Refusing to register method with unsafe key:", pluginName, methodName);
        return;
      }
      if (!_methodNamespace[pluginName]) _methodNamespace[pluginName] = {};
      _methodNamespace[pluginName][methodName] = fn;
    },
    set: (key, valOrUp, options = {}) => {
      const oldVal = _store.get(key), newVal = _immer && typeof valOrUp === "function" ? _immerProduce2(oldVal, valOrUp) : valOrUp;
      if (_validateInput && !validateKey(key)) {
        if (!_silent) console.warn(`[gstate] Invalid key: ${key}`);
        return false;
      }
      if (!hasPermission(_accessRules, key, "write", _userId)) {
        _audit("set", key, false, "RBAC Denied");
        if (!_silent) console.error(`[gstate] RBAC Denied for "${key}"`);
        return false;
      }
      const sani = _validateInput ? sanitizeValue(newVal) : newVal;
      const oldSize = _sizes.get(key) || 0;
      _runHook("onBeforeSet", { key, value: sani, store: instance, version: _versions.get(key) || 0 });
      const frozen = _immer && sani !== null && typeof sani === "object" ? _immerFreeze2(deepClone(sani), true) : sani;
      if (!isEqual(oldVal, frozen)) {
        const hasLimits = (_maxObjectSize > 0 || _maxTotalSize > 0) && !isProduction();
        const finalSize = hasLimits ? _calculateSize(frozen) : 0;
        if (_maxObjectSize > 0 && finalSize > _maxObjectSize) {
          const error = new Error(`Object size (${finalSize} bytes) exceeds maxObjectSize (${_maxObjectSize} bytes)`);
          if (_onError) _onError(error, { operation: "set", key });
          else if (!_silent) console.warn(`[gstate] ${error.message} for "${key}"`);
        }
        if (_maxTotalSize > 0) {
          const est = _totalSize - oldSize + finalSize;
          if (est > _maxTotalSize) {
            const error = new Error(`Total store size (${est} bytes) exceeds limit (${_maxTotalSize} bytes)`);
            if (_onError) _onError(error, { operation: "set" });
            else if (!_silent) console.warn(`[gstate] ${error.message}`);
          }
        }
        _totalSize = _totalSize - oldSize + finalSize;
        _sizes.set(key, finalSize);
        _store.set(key, frozen);
        _versions.set(key, (_versions.get(key) || 0) + 1);
        _snapshot = null;
        const shouldPersist = options.persist ?? _persistByDefault;
        if (shouldPersist) {
          _diskQueue.set(key, { value: frozen, options: { ...options, persist: shouldPersist, encoded: options.encoded || config?.encoded } });
          if (_diskTimer) clearTimeout(_diskTimer);
          _diskTimer = setTimeout(_flushDisk, _debounceTime);
        }
        _runHook("onSet", { key, value: frozen, store: instance, version: _versions.get(key) });
        _audit("set", key, true);
        _emit(key);
        return true;
      }
      return false;
    },
    get: (key) => {
      if (!hasPermission(_accessRules, key, "read", _userId)) {
        _audit("get", key, false, "RBAC Denied");
        return null;
      }
      const val = _store.get(key);
      _runHook("onGet", { store: instance, key, value: val });
      _audit("get", key, true);
      return val;
    },
    compute: (key, selector) => {
      try {
        if (!_computed.has(key)) {
          _computed.set(key, { selector, lastValue: null, deps: /* @__PURE__ */ new Set() });
          _updateComputed(key);
        }
        return _computed.get(key).lastValue;
      } catch (e) {
        const error = e instanceof Error ? e : new Error(String(e));
        if (_onError) _onError(error, { operation: "compute", key });
        else if (!_silent) console.error(`[gstate] Compute error for "${key}": `, e);
        return null;
      }
    },
    watch: (key, callback) => {
      if (!_watchers.has(key)) _watchers.set(key, /* @__PURE__ */ new Set());
      const set = _watchers.get(key);
      set.add(callback);
      return () => {
        set.delete(callback);
        if (set.size === 0) _watchers.delete(key);
      };
    },
    remove: (key) => {
      if (!hasPermission(_accessRules, key, "delete", _userId)) {
        _audit("delete", key, false, "RBAC Denied");
        return false;
      }
      const old = _store.get(key), deleted = _store.delete(key);
      if (deleted) {
        _totalSize -= _sizes.get(key) || 0;
        _sizes.delete(key);
        _runHook("onRemove", { store: instance, key, value: old });
        _snapshot = null;
      }
      _versions.set(key, (_versions.get(key) || 0) + 1);
      if (_storage) _storage.removeItem(`${_getPrefix2()}${key}`);
      _audit("delete", key, true);
      _emit(key);
      return deleted;
    },
    delete: (key) => instance.remove(key),
    deleteAll: () => {
      Array.from(_store.keys()).forEach((k) => instance.remove(k));
      if (_storage) {
        const prefix = _namespace + "_";
        for (let i = 0; i < (_storage.length || 0); i++) {
          const k = _storage.key(i);
          if (k?.startsWith(prefix)) {
            _storage.removeItem(k);
            i--;
          }
        }
      }
      _totalSize = 0;
      _sizes.clear();
      _snapshot = null;
      return true;
    },
    list: () => Object.fromEntries(_store.entries()),
    use: (m) => {
      _middlewares.add(m);
    },
    transaction: (fn) => {
      _isTransaction = true;
      _runHook("onTransaction", { store: instance, key: "START" });
      try {
        fn();
      } finally {
        _isTransaction = false;
        _runHook("onTransaction", { store: instance, key: "END" });
        if (_pendingEmit) {
          _pendingEmit = false;
          _emit();
        }
      }
    },
    destroy: () => {
      if (_diskTimer) {
        clearTimeout(_diskTimer);
        _diskTimer = null;
      }
      _diskQueue.clear();
      if (typeof window !== "undefined") window.removeEventListener("beforeunload", _unloadHandler);
      _runHook("onDestroy", { store: instance });
      _listeners.clear();
      _keyListeners.clear();
      _watchers.clear();
      _computed.clear();
      _computedDeps.clear();
      _plugins.clear();
      _store.clear();
      _sizes.clear();
      _totalSize = 0;
      _accessRules.clear();
      _consents.clear();
      _versions.clear();
      _regexCache.clear();
      _middlewares.clear();
    },
    _addPlugin: (p) => {
      installPlugin(getPluginContext(), p, instance);
    },
    _removePlugin: (name) => {
      _plugins.delete(name);
    },
    _subscribe: (cb, key) => {
      if (key) {
        if (!_keyListeners.has(key)) _keyListeners.set(key, /* @__PURE__ */ new Set());
        const set = _keyListeners.get(key);
        set.add(cb);
        return () => {
          set.delete(cb);
          if (set.size === 0) _keyListeners.delete(key);
        };
      }
      _listeners.add(cb);
      return () => _listeners.delete(cb);
    },
    _getVersion: (key) => _versions.get(key) ?? 0,
    // Enterprise Security & Compliance
    addAccessRule: (pattern, permissions) => addAccessRule(_accessRules, pattern, permissions),
    hasPermission: (key, action, userId) => hasPermission(_accessRules, key, action, userId),
    recordConsent: (userId, purpose, granted) => recordConsent(_consents, userId, purpose, granted),
    hasConsent: (userId, purpose) => hasConsent(_consents, userId, purpose),
    getConsents: (userId) => getConsents(_consents, userId),
    revokeConsent: (userId, purpose) => revokeConsent(_consents, userId, purpose),
    exportUserData: (userId) => exportUserData(_consents, userId),
    deleteUserData: (userId) => deleteUserData(_consents, userId),
    getSnapshot: () => {
      if (!_snapshot) {
        _snapshot = Object.fromEntries(_store.entries());
      }
      return _snapshot;
    },
    get plugins() {
      return _methodNamespace;
    },
    get isReady() {
      return _isReady;
    },
    get namespace() {
      return _namespace;
    },
    get userId() {
      return _userId;
    },
    whenReady: () => _readyPromise
  };
  const secMethods = ["addAccessRule", "recordConsent", "hasConsent", "getConsents", "revokeConsent", "exportUserData", "deleteUserData"];
  secMethods.forEach((m) => {
    const fn = instance[m];
    if (fn) instance._registerMethod("security", m, fn);
  });
  const _unloadHandler = () => {
    if (_diskQueue.size > 0) _flushDisk();
  };
  if (typeof window !== "undefined") window.addEventListener("beforeunload", _unloadHandler);
  if (_storage) {
    hydrateStore(
      getPersistenceContext(),
      // We pass the calculateSize function to update memory usage correctly after hydration
      (val) => {
        const hasLimits = (_maxObjectSize > 0 || _maxTotalSize > 0) && !isProduction();
        return hasLimits ? _calculateSize(val) : 0;
      },
      () => {
        _isReady = true;
        _snapshot = null;
        _readyResolver();
        _emit();
      }
    ).then(() => {
    });
  } else {
    _isReady = true;
    _readyResolver();
  }
  let _syncEngine = null;
  if (config?.sync) {
    _syncEngine = new SyncEngine(instance, config.sync);
    instance._registerMethod("sync", "flush", () => _syncEngine?.flush());
    instance._registerMethod("sync", "getState", () => _syncEngine?.getState());
    instance._registerMethod("sync", "onStateChange", (cb) => _syncEngine?.onStateChange(cb));
  }
  return instance;
};

// core/hooks.ts
import { useSyncExternalStore, useDebugValue, useMemo, useCallback, useEffect, useState } from "react";
var _defaultStore = null;
var initState = (config) => {
  if (_defaultStore && !config?.namespace) {
    if (!config?.silent) {
      console.warn(
        "[gstate] Store already exists. Pass a unique namespace to create additional stores."
      );
    }
  }
  const store = createStore(config);
  _defaultStore = store;
  return store;
};
var destroyState = () => {
  if (_defaultStore) {
    _defaultStore.destroy();
    _defaultStore = null;
  }
};
var useIsStoreReady = (store) => {
  const targetStore = store || _defaultStore;
  const subscribe = useMemo(
    () => (callback) => targetStore ? targetStore._subscribe(callback) : () => {
    },
    [targetStore]
  );
  return useSyncExternalStore(
    subscribe,
    () => targetStore ? targetStore.isReady : false,
    () => true
    // SSR is always "ready" as it doesn't hydrate from local storage
  );
};
var getStore = () => _defaultStore;
function useStore(keyOrSelector, store) {
  const targetStore = useMemo(
    () => store || _defaultStore,
    [store]
  );
  const ghostStore = useMemo(() => {
    const noop = () => {
    };
    const noopFalse = () => false;
    const noopNull = () => null;
    return {
      set: noopFalse,
      get: noopNull,
      remove: noopFalse,
      delete: noopFalse,
      deleteAll: noopFalse,
      list: () => ({}),
      compute: noopNull,
      watch: () => () => {
      },
      use: noop,
      transaction: noop,
      destroy: noop,
      _subscribe: () => () => {
      },
      _setSilently: noop,
      _registerMethod: noop,
      _addPlugin: noop,
      _removePlugin: noop,
      _getVersion: () => 0,
      get isReady() {
        return false;
      },
      whenReady: () => Promise.resolve(),
      get plugins() {
        return {};
      },
      getSnapshot: () => ({}),
      // Ghost snapshot
      get namespace() {
        return "ghost";
      },
      get userId() {
        return void 0;
      }
    };
  }, []);
  const safeStore = targetStore || ghostStore;
  const isSelector = typeof keyOrSelector === "function";
  const key = !isSelector ? keyOrSelector : null;
  const selector = isSelector ? keyOrSelector : null;
  const subscribe = useCallback(
    (callback) => {
      if (isSelector) {
        return safeStore._subscribe(callback);
      } else {
        return safeStore._subscribe(callback, key);
      }
    },
    [safeStore, isSelector, key]
  );
  const getSnapshot = useCallback(() => {
    if (isSelector) {
      return selector(safeStore.getSnapshot());
    } else {
      return safeStore.get(key) ?? void 0;
    }
  }, [safeStore, isSelector, key, selector]);
  const getServerSnapshot = useCallback(() => {
    if (isSelector) {
      try {
        return selector({});
      } catch {
        return void 0;
      }
    } else {
      return void 0;
    }
  }, [selector, isSelector]);
  const value = useSyncExternalStore(
    subscribe,
    getSnapshot,
    // Cast needed for union types
    getServerSnapshot
  );
  const setter = useCallback(
    (val, options) => {
      if (isSelector) {
        if (!isProduction()) {
          console.warn("[gstate] Cannot set value when using a selector.");
        }
        return false;
      }
      return safeStore.set(key, val, options);
    },
    [safeStore, isSelector, key]
  );
  useDebugValue(value, (v) => isSelector ? `Selector: ${JSON.stringify(v)}` : `${key}: ${JSON.stringify(v)}`);
  if (isSelector) {
    return value;
  }
  return [value, setter];
}
var _syncEngines = /* @__PURE__ */ new Map();
var initSync = (store, config) => {
  const key = store.namespace;
  if (_syncEngines.has(key)) {
    console.warn(`[gstate] Sync engine already exists for namespace "${key}". Call destroySync first.`);
    return _syncEngines.get(key);
  }
  const engine = new SyncEngine(store, config);
  _syncEngines.set(key, engine);
  return engine;
};
var destroySync = (namespace) => {
  const engine = _syncEngines.get(namespace);
  if (engine) {
    engine.destroy();
    _syncEngines.delete(namespace);
  }
};
function useSyncedState(key, store) {
  const targetStore = store || _defaultStore;
  const namespace = targetStore?.namespace || "default";
  const engine = _syncEngines.get(namespace);
  const result = useStore(key, targetStore);
  const value = result[0];
  const setter = result[1];
  const [syncState, setSyncState] = useState(() => engine?.getState() || {
    isOnline: true,
    isSyncing: false,
    lastSyncTimestamp: null,
    pendingChanges: 0,
    conflicts: 0
  });
  useEffect(() => {
    if (!engine) return;
    const unsubscribe = engine.onStateChange(setSyncState);
    return unsubscribe;
  }, [engine]);
  const syncedSetter = useCallback(
    (val, options) => {
      const result2 = setter(val, options);
      if (result2 && engine) {
        const currentValue = targetStore?.get(key);
        engine.queueChange(key, currentValue);
      }
      return result2;
    },
    [setter, engine, key, targetStore]
  );
  return [value, syncedSetter, syncState];
}
var useSyncStatus = () => {
  const [state, setState] = useState({
    isOnline: true,
    isSyncing: false,
    lastSyncTimestamp: null,
    pendingChanges: 0,
    conflicts: 0
  });
  useEffect(() => {
    const updateState = () => {
      let isOnline = true;
      let isSyncing = false;
      let pendingChanges = 0;
      let conflicts = 0;
      _syncEngines.forEach((engine) => {
        const s = engine.getState();
        isOnline = isOnline && s.isOnline;
        isSyncing = isSyncing || s.isSyncing;
        pendingChanges += s.pendingChanges;
        conflicts += s.conflicts;
      });
      setState({
        isOnline,
        isSyncing,
        lastSyncTimestamp: null,
        pendingChanges,
        conflicts
      });
    };
    updateState();
    const unsubscribes = Array.from(_syncEngines.values()).map(
      (engine) => engine.onStateChange(updateState)
    );
    return () => unsubscribes.forEach((fn) => fn());
  }, []);
  return state;
};
var triggerSync = async (namespace) => {
  const targetNamespace = namespace || _defaultStore?.namespace;
  if (!targetNamespace) return;
  const engine = _syncEngines.get(targetNamespace);
  if (engine) {
    await engine.flush();
  }
};

// core/async.ts
var createAsyncStore = (resolver, options) => {
  const key = options?.key || "async_data";
  const store = options?.store || createStore({
    namespace: `async_${key}`,
    silent: true
  });
  if (store.get(key) == null) {
    store.set(key, { data: null, loading: false, error: null, updatedAt: null });
  }
  const run = async () => {
    const current = store.get(key);
    store.set(key, {
      ...current || { data: null, loading: false, error: null, updatedAt: null },
      loading: true,
      error: null
    });
    if ("whenReady" in store && !store.isReady) await store.whenReady();
    try {
      const result = await resolver();
      const prev = store.get(key);
      store.set(key, {
        ...prev || { data: null, loading: false, error: null, updatedAt: null },
        data: result,
        loading: false,
        updatedAt: Date.now()
      }, { persist: options?.persist });
    } catch (e) {
      const prev = store.get(key);
      store.set(key, {
        ...prev || { data: null, loading: false, error: null, updatedAt: null },
        error: e instanceof Error ? e : new Error(String(e)),
        loading: false
      });
    }
  };
  return Object.assign(store, { execute: run });
};

// plugins/official/immer.plugin.ts
var immerPlugin = () => ({
  name: "gstate-immer",
  hooks: {
    onInstall: ({ store }) => {
      store._registerMethod("immer", "setWithProduce", ((key, updater) => {
        return store.set(key, updater);
      }));
    }
  }
});

// plugins/official/undo-redo.plugin.ts
var undoRedoPlugin = (options) => {
  let _history = [];
  let _cursor = -1;
  let _isRestoring = false;
  const _limit = options?.limit || 50;
  return {
    name: "gstate-undo-redo",
    hooks: {
      onInstall: ({ store }) => {
        _history.push(store.list());
        _cursor = 0;
        store._registerMethod("undoRedo", "undo", () => {
          if (_cursor > 0) {
            _isRestoring = true;
            _cursor--;
            const snapshot = _history[_cursor];
            if (!snapshot) return false;
            Object.entries(snapshot).forEach(([k, v]) => {
              store._setSilently(k, v);
            });
            _isRestoring = false;
            return true;
          }
          return false;
        });
        store._registerMethod("undoRedo", "redo", () => {
          if (_cursor < _history.length - 1) {
            _isRestoring = true;
            _cursor++;
            const snapshot = _history[_cursor];
            if (!snapshot) return false;
            Object.entries(snapshot).forEach(([k, v]) => {
              store._setSilently(k, v);
            });
            _isRestoring = false;
            return true;
          }
          return false;
        });
        store._registerMethod("undoRedo", "canUndo", () => _cursor > 0);
        store._registerMethod("undoRedo", "canRedo", () => _cursor < _history.length - 1);
      },
      onSet: ({ store }) => {
        if (_isRestoring) return;
        if (_cursor < _history.length - 1) {
          _history = _history.slice(0, _cursor + 1);
        }
        _history.push(store.list());
        if (_history.length > _limit) {
          _history.shift();
        } else {
          _cursor++;
        }
      }
    }
  };
};

// plugins/official/schema.plugin.ts
var schemaPlugin = (schemas) => ({
  name: "gstate-schema",
  hooks: {
    onSet: ({ key, value }) => {
      if (!key) return;
      const validator = schemas[key];
      if (validator) {
        const result = validator(value);
        if (result !== true) {
          throw new Error(`[Schema Error] Validation failed for key "${key}": ${result === false ? "Invalid type" : result}`);
        }
      }
    }
  }
});

// plugins/official/devtools.plugin.ts
var devToolsPlugin = (options) => {
  const ext = globalThis;
  const global = ext;
  const extension = global.__REDUX_DEVTOOLS_EXTENSION__;
  if (!extension?.connect) {
    return { name: "gstate-devtools-noop", hooks: {} };
  }
  let _devTools = null;
  return {
    name: "gstate-devtools",
    hooks: {
      onInstall: ({ store }) => {
        _devTools = extension.connect({ name: options?.name || "Magnetar Store" });
        _devTools.init(store.list());
      },
      onSet: ({ key, store }) => {
        if (!key || !_devTools) return;
        _devTools.send(`SET_${key.toUpperCase()}`, store.list());
      },
      onRemove: ({ key, store }) => {
        if (!key || !_devTools) return;
        _devTools.send(`REMOVE_${key.toUpperCase()}`, store.list());
      }
    }
  };
};

// plugins/official/snapshot.plugin.ts
var snapshotPlugin = () => {
  const _snapshots = /* @__PURE__ */ new Map();
  return {
    name: "gstate-snapshot",
    hooks: {
      onInstall: ({ store }) => {
        store._registerMethod("snapshot", "takeSnapshot", ((name) => {
          _snapshots.set(name, store.list());
        }));
        store._registerMethod("snapshot", "restoreSnapshot", ((name) => {
          const snap = _snapshots.get(name);
          if (!snap) return false;
          store.transaction(() => {
            Object.entries(snap).forEach(([k, v]) => {
              store.set(k, v);
            });
          });
          return true;
        }));
        store._registerMethod("snapshot", "listSnapshots", (() => Array.from(_snapshots.keys())));
        store._registerMethod("snapshot", "deleteSnapshot", ((name) => _snapshots.delete(name)));
        store._registerMethod("snapshot", "clearSnapshots", (() => _snapshots.clear()));
      }
    }
  };
};

// plugins/official/guard.plugin.ts
var guardPlugin = (guards) => ({
  name: "gstate-guard",
  hooks: {
    onBeforeSet: ({ key, value, store: _store }) => {
      if (!key) return;
      const guard = guards[key];
      if (guard) {
        const transformed = guard(value);
        if (transformed !== value) {
        }
      }
    }
  }
});

// plugins/official/analytics.plugin.ts
var analyticsPlugin = (options) => ({
  name: "gstate-analytics",
  hooks: {
    onSet: ({ key, value }) => {
      if (!key) return;
      if (!options.keys || options.keys.includes(key)) {
        options.provider({ key, value, action: "SET" });
      }
    },
    onRemove: ({ key }) => {
      if (!key) return;
      if (!options.keys || options.keys.includes(key)) {
        options.provider({ key, value: null, action: "REMOVE" });
      }
    }
  }
});

// plugins/official/sync.plugin.ts
var syncPlugin = (options) => {
  const _channel = new BroadcastChannel(options?.channelName || "gstate_sync");
  let _isSyncing = false;
  return {
    name: "gstate-sync",
    hooks: {
      onInstall: ({ store }) => {
        _channel.onmessage = (event) => {
          const { key, value, action } = event.data;
          if (!key) return;
          _isSyncing = true;
          if (action === "REMOVE") {
            store.remove(key);
          } else {
            store.set(key, value);
          }
          _isSyncing = false;
        };
      },
      onSet: ({ key, value }) => {
        if (!key || _isSyncing) return;
        _channel.postMessage({ key, value, action: "SET" });
      },
      onRemove: ({ key }) => {
        if (!key || _isSyncing) return;
        _channel.postMessage({ key, action: "REMOVE" });
      },
      onDestroy: () => {
        _channel.close();
      }
    }
  };
};

// plugins/official/debug.plugin.ts
var debugPlugin = () => {
  if (isProduction()) {
    return { name: "gstate-debug-noop", hooks: {} };
  }
  const isDev = !isProduction();
  const debugLog = (...args) => {
    if (isDev) console.debug(...args);
  };
  return {
    name: "gstate-debug",
    hooks: {
      onInstall: ({ store }) => {
        if (typeof window !== "undefined") {
          window.gstate = {
            /** Get all state */
            list: () => {
              return store.list();
            },
            /** Get a specific key */
            get: (key) => {
              const val = store.get(key);
              debugLog(`[gstate] get('${key}'):`, val);
              return val;
            },
            /** Set a value */
            set: (key, value) => {
              const result = store.set(key, value);
              debugLog(`[gstate] set('${key}', ${JSON.stringify(value)}):`, result);
              return result;
            },
            /** Watch a key */
            watch: (key, callback) => {
              const unwatch = store.watch(key, callback);
              debugLog(`[gstate] watching '${key}'`);
              return unwatch;
            },
            /** Get store info */
            info: () => {
              const info = {
                namespace: store.namespace,
                isReady: store.isReady,
                keys: Object.keys(store.list()),
                size: Object.keys(store.list()).length
              };
              debugLog("[gstate] Store Info:", info);
              return info;
            },
            /** Clear console and show banner */
            banner: () => {
              debugLog(`
\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557
\u2551         \u{1F9F2} gState Debug            \u2551
\u2551   Type: gstate.list()              \u2551
\u2551        gstate.get(key)            \u2551
\u2551        gstate.set(key, value)    \u2551
\u2551        gstate.info()              \u2551
\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D
              `);
            }
          };
          debugLog("[gstate] Debug plugin installed. Type gstate.banner() for help.");
        }
      },
      onDestroy: () => {
        if (typeof window !== "undefined") {
          delete window.gstate;
        }
      }
    }
  };
};

// plugins/official/indexeddb.plugin.ts
var indexedDBPlugin = (options = {}) => {
  const dbName = options.dbName || "rgs-db";
  const storeName = options.storeName || "states";
  const dbVersion = options.version || 1;
  let db = null;
  const getDB = () => {
    return new Promise((resolve, reject) => {
      if (db) return resolve(db);
      const request = indexedDB.open(dbName, dbVersion);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        db = request.result;
        resolve(db);
      };
      request.onupgradeneeded = (event) => {
        const database = event.target.result;
        if (!database.objectStoreNames.contains(storeName)) {
          database.createObjectStore(storeName);
        }
      };
    });
  };
  const save = async (key, value) => {
    const database = await getDB();
    return new Promise((resolve, reject) => {
      const tx = database.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      const request = store.put(value, key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  };
  const load = async (key) => {
    const database = await getDB();
    return new Promise((resolve, reject) => {
      const tx = database.transaction(storeName, "readonly");
      const store = tx.objectStore(storeName);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  };
  const remove = async (key) => {
    const database = await getDB();
    return new Promise((resolve, reject) => {
      const tx = database.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  };
  return {
    name: "indexedDB",
    hooks: {
      onInstall: ({ store }) => {
        store._registerMethod("indexedDB", "clear", async () => {
          const database = await getDB();
          const tx = database.transaction(storeName, "readwrite");
          tx.objectStore(storeName).clear();
        });
      },
      onInit: async ({ store }) => {
        const database = await getDB();
        const tx = database.transaction(storeName, "readonly");
        const objectStore = tx.objectStore(storeName);
        const request = objectStore.getAllKeys();
        request.onsuccess = async () => {
          const keys = request.result;
          const prefix = store.namespace + "_";
          for (const key of keys) {
            if (key.startsWith(prefix)) {
              const val = await load(key);
              if (val) {
                const storeKey = key.substring(prefix.length);
                store._setSilently(storeKey, val.d);
              }
            }
          }
        };
      },
      onSet: async ({ key, value, store }) => {
        if (!key) return;
        const prefix = store.namespace + "_";
        const data = {
          d: value,
          t: Date.now(),
          v: store._getVersion?.(key) || 1
        };
        await save(`${prefix}${key}`, data);
      },
      onRemove: async ({ key, store }) => {
        if (!key) return;
        const prefix = store.namespace + "_";
        await remove(`${prefix}${key}`);
      }
    }
  };
};

// plugins/official/cloud-sync.plugin.ts
var cloudSyncPlugin = (options) => {
  const { adapter, autoSyncInterval } = options;
  const lastSyncedVersions = /* @__PURE__ */ new Map();
  const stats = {
    lastSyncTimestamp: null,
    totalKeysSynced: 0,
    totalBytesSynced: 0,
    syncCount: 0,
    lastDuration: 0,
    errors: 0
  };
  let timer = null;
  return {
    name: "cloudSync",
    hooks: {
      onInstall: ({ store }) => {
        store._registerMethod("cloudSync", "sync", async () => {
          const startTime = performance.now();
          const dirtyData = {};
          let bytesCount = 0;
          try {
            const allData = store.list();
            const keys = Object.keys(allData);
            for (const key of keys) {
              const currentVersion = store._getVersion?.(key) || 0;
              const lastVersion = lastSyncedVersions.get(key) || 0;
              if (currentVersion > lastVersion) {
                const val = allData[key];
                dirtyData[key] = val;
                bytesCount += JSON.stringify(val).length;
                lastSyncedVersions.set(key, currentVersion);
              }
            }
            if (Object.keys(dirtyData).length === 0) return { status: "no-change", stats };
            const success = await adapter.save(dirtyData);
            if (success) {
              stats.lastSyncTimestamp = Date.now();
              stats.totalKeysSynced += Object.keys(dirtyData).length;
              stats.totalBytesSynced += bytesCount;
              stats.syncCount++;
              stats.lastDuration = performance.now() - startTime;
              if (options.onSync) options.onSync(stats);
              return { status: "success", stats };
            } else {
              throw new Error(`Adapter ${adapter.name} failed to save.`);
            }
          } catch (err) {
            stats.errors++;
            console.error(`[gstate] Cloud Sync Failed (${adapter.name}):`, err);
            return { status: "error", error: String(err), stats };
          }
        });
        store._registerMethod("cloudSync", "getStats", () => stats);
        if (autoSyncInterval && autoSyncInterval > 0) {
          timer = setInterval(() => {
            const plugins = store.plugins;
            const cs = plugins.cloudSync;
            if (cs) cs.sync();
          }, autoSyncInterval);
        }
      },
      onDestroy: () => {
        if (timer) clearInterval(timer);
      }
    }
  };
};
var createMongoAdapter = (apiUrl, apiKey) => ({
  name: "MongoDB-Atlas",
  save: async (data) => {
    const response = await fetch(`${apiUrl}/action/updateOne`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-key": apiKey },
      body: JSON.stringify({
        dataSource: "Cluster0",
        database: "rgs_cloud",
        collection: "user_states",
        filter: { id: "global_state" },
        // Or specific user ID
        update: { $set: { data, updatedAt: Date.now() } },
        upsert: true
      })
    });
    return response.ok;
  }
});
var createFirestoreAdapter = (db, docPath) => ({
  name: "Firebase-Firestore",
  save: async (data) => {
    try {
      const isDev = !isProduction();
      const debugLog = (...args) => {
        if (isDev) console.debug(...args);
      };
      debugLog("[Mock] Firestore Syncing:", data);
      return true;
    } catch (e) {
      return false;
    }
  }
});
var createSqlRestAdapter = (endpoint, getAuthToken) => ({
  name: "SQL-REST-API",
  save: async (data) => {
    const authToken = getAuthToken();
    if (!authToken) {
      console.warn("[gstate] No auth token available for SQL-REST sync");
      return false;
    }
    const response = await fetch(endpoint, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        // NOTE: In production, use HTTP-only cookies instead of Bearer tokens
        // This is provided as a template only - production should use secure auth
        "Authorization": `Bearer ${authToken}`
      },
      body: JSON.stringify(data),
      credentials: "same-origin"
    });
    return response.ok;
  }
});

// plugins/index.ts
var loggerPlugin = (options) => ({
  name: "gstate-logger",
  hooks: {
    onSet: ({ key, value, version }) => {
      const time = (/* @__PURE__ */ new Date()).toLocaleTimeString(), groupLabel = `[gstate] SET: ${key} (v${version}) @ ${time}`;
      if (options?.collapsed) console.groupCollapsed(groupLabel);
      else console.group(groupLabel);
      console.info("%c Value:", "color: #4CAF50; font-weight: bold;", value);
      console.groupEnd();
    },
    onRemove: ({ key }) => {
      console.warn(`[gstate] REMOVED: ${key}`);
    },
    onTransaction: ({ key }) => {
      if (key === "START") console.group("\u2500\u2500 TRANSACTION START \u2500\u2500");
      else console.groupEnd();
    }
  }
});

// index.ts
var gstate = (initialState, configOrNamespace) => {
  const config = typeof configOrNamespace === "string" ? { namespace: configOrNamespace } : configOrNamespace;
  const store = createStore(config);
  if (initialState) {
    Object.entries(initialState).forEach(([k, v]) => {
      if (store.get(k) === null) {
        store._setSilently(k, v);
      }
    });
  }
  const magic = (key) => useStore(key, store);
  if (typeof window !== "undefined" && isDevelopment()) {
    window.gstate = store;
    window.gState = store;
    window.rgs = store;
  }
  return Object.assign(magic, store);
};
var addAccessRule2 = (pattern, perms) => getStore()?.addAccessRule(pattern, perms);
var hasPermission2 = (key, action, uid) => getStore()?.hasPermission(key, action, uid) ?? true;
var recordConsent2 = (uid, p, g) => {
  const s = getStore();
  if (!s) throw new Error("[gstate] recordConsent failed: No store found. call initState() first.");
  return s.recordConsent(uid, p, g);
};
var hasConsent2 = (uid, p) => getStore()?.hasConsent(uid, p) ?? false;
var getConsents2 = (uid) => getStore()?.getConsents(uid) ?? [];
var revokeConsent2 = (uid, p) => getStore()?.revokeConsent(uid, p);
var exportUserData2 = (uid) => {
  const s = getStore();
  if (!s) throw new Error("[gstate] exportUserData failed: No store found.");
  return s.exportUserData(uid);
};
var deleteUserData2 = (uid) => {
  const s = getStore();
  if (!s) throw new Error("[gstate] deleteUserData failed: No store found.");
  return s.deleteUserData(uid);
};
var clearAccessRules = () => {
};
var clearAllConsents = () => {
};
export {
  SyncEngine,
  addAccessRule2 as addAccessRule,
  analyticsPlugin,
  clearAccessRules,
  clearAllConsents,
  cloudSyncPlugin,
  createAsyncStore,
  createFirestoreAdapter,
  createMongoAdapter,
  createSqlRestAdapter,
  createStore,
  createSyncEngine,
  debugPlugin,
  deleteUserData2 as deleteUserData,
  deriveKeyFromPassword,
  destroyState,
  destroySync,
  devToolsPlugin,
  exportKey,
  exportUserData2 as exportUserData,
  generateEncryptionKey,
  generateSalt,
  getConsents2 as getConsents,
  getStore,
  gstate,
  guardPlugin,
  hasConsent2 as hasConsent,
  hasPermission2 as hasPermission,
  immerPlugin,
  importKey,
  indexedDBPlugin,
  initState,
  initSync,
  isCryptoAvailable,
  logAudit,
  loggerPlugin,
  recordConsent2 as recordConsent,
  revokeConsent2 as revokeConsent,
  sanitizeValue,
  schemaPlugin,
  setAuditLogger,
  snapshotPlugin,
  syncPlugin,
  triggerSync,
  undoRedoPlugin,
  useStore as useGState,
  useIsStoreReady,
  useStore as useSimpleState,
  useStore,
  useSyncStatus,
  useSyncedState,
  validateKey
};
