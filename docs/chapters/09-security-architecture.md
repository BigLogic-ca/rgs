# Security Architecture & Hardening

## Overview
Reactive Global State (RGS) is designed with a "Security-First" philosophy. Our architecture ensures that global state is not only reactive but protected against common web vulnerabilities and unauthorized access.

## 1. Data Sanitization (XSS Defense)
The `sanitizeValue` utility provides a robust baseline defense by stripping malicious content from strings and objects before they enter the store.

- **Scheme Blocking**: Specifically blocks `javascript:`, `vbscript:`, and `data:text/html` schemes.
- **Tag Removal**: Automatically removes dangerous HTML tags such as `<script>`, `<iframe>`, `<form>`, and `<meta>`.
- **Entity Removal**: Strips HTML entities (`&#...;`) to prevent obfuscation-based bypasses.

## 2. Advanced Deep Cloning
To ensure state immutability and prevent unintended side effects, RGS uses an intelligent cloning engine:
- **Native structuredClone**: Leverages the browser's native API for maximum performance.
- **Support for Collections**: Extends cloning capabilities to `Map` and `Set` objects.
- **Circular Reference Protection**: Uses `WeakMap` to handle complex nested structures safely.

## 3. Cryptography (AES-256-GCM)
The security module uses the Web Crypto API to provide high-performance, authenticated encryption:
- **AES-GCM**: Provides both confidentiality and integrity verification.
- **GCM (Galois/Counter Mode)**: Ensures that data has not been tampered with during storage.

## 4. RBAC (Role-Based Access Control)
RGS supports fine-grained access rules:
- **Fail-Closed Design**: Access is denied by default if any rules are defined.
- **Regex Caching**: Store instances cache compiled regular expressions for ultra-fast permission checks.

## 5. Security Best Practices
For real-world implementations, refer to the `examples/security-best-practices` directory, which covers:
- **Encryption Key Management**: Using `generateEncryptionKey()` for secure key generation.
- **Audit Logging**: Tracking all store modifications for compliance.
- **GDPR Compliance**: Managing user consent and data export/deletion.

## Summary of 2.9.5 Enhancements
- Robust regex patterns for `sanitizeValue`.
- Recursive sanitization for plain objects.
- `Map` and `Set` support in `deepClone`.
- **Exposed Metadata**: Store instances now expose read-only `namespace` and `userId`.
- **Direct Store Access**: Added `getStore()` utility for non-React contexts.
