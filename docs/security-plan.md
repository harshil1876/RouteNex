# RouteNex — Security Plan

## Threat Model

### Assets to Protect
1. **Upstream Provider API Keys** — Most critical. Leakage = direct financial loss.
2. **User Prompts/Completions** — Sensitive content transiting through the gateway.
3. **Gateway API Key** — Unauthorized access = proxy abuse.
4. **Request Metadata** — Usage patterns, costs, provider health data.

### Threat Actors
1. **Network Attackers** — Intercepting traffic, MITM.
2. **Unauthorized Users** — Accessing the gateway without credentials.
3. **Log Readers** — Accessing logs that accidentally contain secrets.
4. **Supply Chain** — Malicious dependencies.

---

## Security Controls

### 1. Provider Key Protection
- **Storage**: Provider keys are read from environment variables only. Never stored in files, databases, or config that is committed to version control.
- **Redaction**: All log output, error messages, and API responses redact provider keys. A key like `gsk_abc123xyz` is displayed as `gsk_***xyz`.
- **No Client Exposure**: Provider keys never appear in frontend code, API responses, SSE streams, or browser bundles.
- **Verification**: Automated tests assert that no mock provider key appears in any log output or response body.

### 2. Gateway Authentication
- **Default**: Auth is disabled when `ROUTENEX_API_KEY` is not set (localhost development mode).
- **When Enabled**: All API endpoints (except `/health/live`) require `Authorization: Bearer <key>`.
- **Timing-Safe Comparison**: API key comparison uses constant-time comparison to prevent timing attacks.
- **Error Messages**: Authentication failures return generic error messages without revealing whether the key format was incorrect or the key was wrong.

### 3. Rate Limiting
- **Per-IP**: 60 requests per minute per client IP (configurable).
- **Response**: 429 Too Many Requests with `Retry-After` header.
- **Cleanup**: Old rate limit entries are garbage-collected every 60 seconds.

### 4. Request Validation
- **Zod Schemas**: All incoming requests are validated against strict Zod schemas before processing.
- **Max Payload**: Request body limited to 10MB.
- **Max Messages**: Maximum 256 messages per request.
- **Model ID Validation**: Model identifiers must match `^[a-zA-Z0-9/_.-]+$`.

### 5. Prompt Privacy
- **Default**: Prompt contents are NOT logged (`ROUTENEX_LOG_PROMPTS=false`).
- **When Enabled**: Prompts are stored in the local request log file only.
- **Never Transmitted**: Prompts are never sent to RouteNex servers, analytics, or telemetry (there are none).

### 6. SSRF Prevention
- **Fixed Endpoints**: Provider base URLs are hardcoded per adapter (e.g., `https://api.groq.com/openai/v1`).
- **No User URLs**: Users cannot specify arbitrary upstream URLs in requests.
- **Future**: If custom provider endpoints are supported, they will be validated against an allowlist.

### 7. Dependency Security
- **Minimal Dependencies**: The gateway has <15 direct dependencies.
- **Audit**: Run `npm audit` before each release.
- **Lockfile**: `package-lock.json` ensures reproducible builds.

### 8. CORS
- **Default**: Allow `localhost` origins only.
- **Configurable**: Set `ROUTENEX_CORS_ORIGIN` for production deployments.

---

## Known Limitations (MVP)

1. **No encryption at rest** for the JSON request log file. Acceptable for local single-operator use.
2. **No TLS termination** built into the gateway. Use a reverse proxy (nginx, Caddy) for HTTPS in production.
3. **No key rotation mechanism** in MVP. Restart the gateway to update keys.
4. **No multi-tenant isolation**. Single operator model. Multi-tenancy is a post-MVP feature.

---

## Security Checklist

- [ ] Provider keys redacted in all log output
- [ ] Provider keys redacted in all API responses
- [ ] Provider keys not present in frontend bundle
- [ ] Gateway auth enforced when ROUTENEX_API_KEY is set
- [ ] Rate limiting active on all endpoints
- [ ] Request validation rejects malformed payloads
- [ ] Prompt logging disabled by default
- [ ] CORS restricted to localhost by default
- [ ] No arbitrary URL fetching from user input
- [ ] npm audit shows no critical vulnerabilities
