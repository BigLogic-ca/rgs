# Security

Reactive Global State (RGS) implements enterprise-grade security including AES-256-GCM encryption, RBAC, and internal XSS sanitization as a secondary defense layer.

## Reporting a Vulnerability

Please email [@passariello](https://github.com/passariello) or see <https://dario.passariello.ca/contact/> if you have a potential security vulnerability to report.

## Recent Hardening

- Improved XSS sanitization patterns to block `data:`, `vbscript:`, and complex HTML tag combinations.
- Implemented removal of HTML entity obfuscation.
- Enhanced deep cloning to support `Map`/`Set` and circular references.
