# Security Policy

## Supported Versions

RouteNex provides security updates for the latest major and minor release versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.2.x   | :white_check_mark: |
| < 0.2.0 | :x:                |

## Reporting a Vulnerability

The RouteNex team takes security vulnerabilities seriously. We appreciate your efforts to responsibly disclose findings.

If you believe you have found a security vulnerability in RouteNex:

1. **Do NOT open a public GitHub issue.**
2. Send an email to **security@routenex.com** (or contact the maintainer directly via GitHub Security Advisories at https://github.com/harshil1876/RouteNex/security/advisories/new).
3. Include detailed reproduction steps, payload examples, and the affected version/environment.
4. We will acknowledge receipt within 48 hours and work with you to patch and coordinate disclosure.

### Scope & Best Practices
- **Never report provider API keys**: Upstream API keys belong to the respective developer and should never be transmitted in reports.
- **SSRF & Localhost**: RouteNex contains built-in SSRF guards preventing requests to cloud metadata endpoints (`169.254.169.254`, AWS/GCP metadata) and private loopback exploits.
