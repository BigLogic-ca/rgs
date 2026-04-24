# Security Features

RGS includes enterprise-grade security features out of the box.

## Role-Based Access Control (RBAC)

Restrict state access based on user roles and permissions.

### Setting Up RBAC

```typescript
import { addAccessRule, hasPermission, Permission } from '@biglogic/rgs'

// Define access rules
addAccessRule(
  /admin_.*/,  // Regex pattern for admin-only keys
  ['read', 'write', 'delete', 'admin']
)

addAccessRule(
  /user_.*/,
  ['read', 'write'] // Regular users can read and write user data
)

// Check permission before access
if (hasPermission(rules, 'admin_settings', 'write', userId)) {
  setState('admin_settings', newSettings)
} else {
  console.warn('Access denied: insufficient permissions')
}
```

### Permission Types

| Permission | Description |
|------------|-------------|
| `read` | Can read the state key |
| `write` | Can modify the state key |
| `delete` | Can delete the state key |
| `admin` | Full access (implies all others) |

### Function-Based Rules

```typescript
// Dynamic rule based on user attributes
addAccessRule(
  (key: string, userId?: string) => {
    // Only allow access to user's own data
    return key.startsWith(`user_${userId}_`)
  },
  ['read', 'write']
)
```

## AES-256-GCM Encryption

Encrypt sensitive state data at rest.

### Generating Encryption Keys

```typescript
import { 
  generateEncryptionKey, 
  encrypt, 
  decrypt 
} from '@biglogic/rgs'

// Generate encryption key
const encryptionKey = await generateEncryptionKey()

// Store encrypted data
const encrypted = await encrypt(sensitiveData, encryptionKey)
setState('encrypted_data', encrypted)

// Retrieve and decrypt
const stored = getState<string>('encrypted_data')
const decrypted = await decrypt<MyData>(stored, encryptionKey)
```

### Key Derivation from Password

Derive encryption keys from user passwords using PBKDF2 (NIST SP 800-132 compliant).

```typescript
import { deriveKeyFromPassword, generateSalt } from '@biglogic/rgs'

// User provides password
const password = 'user-password'

// Generate salt (store alongside encrypted data)
const salt = generateSalt(32)

// Derive key (NIST SP 800-132 compliant: 600,000+ iterations)
const encryptionKey = await deriveKeyFromPassword(password, salt, 600000)

// Export keys for storage
import { exportKey } from '@biglogic/rgs'
const { key, iv } = await exportKey(encryptionKey)
// Store key and iv securely (e.g., in httpOnly cookie or secure storage)
```

### Key Management

- **Never store keys in client-side code**
- **Use httpOnly cookies** for web applications
- **Rotate keys periodically**
- **Use PBKDF2** for password-based key derivation
- **Follow NIST guidelines** (600,000+ iterations minimum)

## Audit Logging

Track all state access and modifications for compliance.

### Configuring Audit Logger

```typescript
import { setAuditLogger, AuditEntry } from '@biglogic/rgs'

// Configure audit logger
setAuditLogger((entry: AuditEntry) => {
  // Send to your audit service
  fetch('/api/audit', {
    method: 'POST',
    body: JSON.stringify({
      timestamp: entry.timestamp,
      action: entry.action,
      key: entry.key,
      userId: entry.userId,
      success: entry.success,
      error: entry.error
    })
  })
})
```

### Audit Entry Structure

```typescript
interface AuditEntry {
  timestamp: number
  action: 'set' | 'get' | 'delete' | 'hydrate'
  key: string
  userId?: string
  success: boolean
  error?: string
}
```

### Automatic Audit Entries

Audit entries are automatically created for:
- `setState` (action: 'set')
- `getState` (action: 'get')
- `hydrate` (action: 'hydrate')
- `delete` (action: 'delete')

## GDPR Compliance

Manage user consent and data rights (GDPR Articles 17, 20).

### Managing Consent

```typescript
import { recordConsent, hasConsent, ConsentsMap } from '@biglogic/rgs'

// Record user consent
const consentsMap: ConsentsMap = new Map()
recordConsent(consentsMap, userId, 'analytics', true)
recordConsent(consentsMap, userId, 'marketing', false)

// Check consent before processing
if (hasConsent(consentsMap, userId, 'analytics')) {
  // Process analytics
}
```

### Data Portability (Article 20)

```typescript
import { exportUserData } from '@biglogic/rgs'

// Export user data (GDPR Article 20 - Right to data portability)
const userData = exportUserData(consentsMap, userId)
```

### Right to Be Forgotten (Article 17)

```typescript
import { deleteUserData } from '@biglogic/rgs'

// Delete user data (GDPR Article 17 - Right to be forgotten)
const result = deleteUserData(consentsMap, userId)
```

## Input Sanitization

Prevent XSS attacks with built-in sanitization.

### Automatic Sanitization

```typescript
import { sanitizeValue } from '@biglogic/rgs'

// Automatically sanitizes when setting state
const clean = sanitizeValue(userInput)

// Or use manually
setState('user_content', sanitizeValue(untrustedHTML))
```

### What Gets Sanitized

- Script tags (`<script>`)
- Event handlers (`onclick=`, `onload=`, etc.)
- Dangerous URL schemes (`javascript:`, `vbscript:`)
- Malicious HTML elements (`<iframe>`, `<object>`, `<embed>`)
- Encoded XSS attacks (HTML entities, URL encoding)

## Security Checklist

- [ ] Enable RBAC for sensitive state keys
- [ ] Use AES-256-GCM encryption for PII
- [ ] Configure audit logging
- [ ] Implement GDPR consent management
- [ ] Sanitize all user inputs
- [ ] Use HTTPS in production
- [ ] Store encryption keys securely (httpOnly cookies)
- [ ] Regularly rotate encryption keys
- [ ] Monitor for suspicious access patterns
- [ ] Follow NIST password guidelines (600,000+ iterations)

## Next Steps

- [Testing](testing.md) - Testing strategies
- [Performance](performance.md) - Optimization tips
- [Best Practices](best-practices.md) - Security best practices
