export const meta = {
  name: 'nu-aura-security-audit',
  description: 'Full multi-agent security audit: 9 dimensions audited in parallel, each finding adversarially verified against layered defenses, then synthesized into a prioritized remediation report',
  phases: [
    { title: 'Audit', detail: 'one security-reviewer per dimension, grounded in real code' },
    { title: 'Verify', detail: 'adversarial verifier per finding — reachable? mitigated by another layer?' },
    { title: 'Synthesize', detail: 'dedup, prioritize, write remediation report' },
  ],
}

const REPO = '/Users/fayaz.m/IdeaProjects/nulogic/nu-aura'
const BE = 'backend/src/main/java/com/nulogic'

const DEP_CONTEXT = `npm audit (frontend): 3 critical + 1 high, ALL dev-only tooling — vitest/@vitest/ui (RCE only when Vitest UI server is listening; not shipped to prod), tmp<0.2.6 path traversal (dev). No production runtime npm criticals. gitleaks not installed locally — secrets must be checked via regex grep in the secrets dimension.`

const FINDINGS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    dimension: { type: 'string' },
    summary: { type: 'string', description: 'one-paragraph posture summary for this dimension' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          severity: { type: 'string', enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] },
          file: { type: 'string', description: 'file:line of the evidence' },
          evidence: { type: 'string', description: 'the actual code/config that is the problem' },
          attackScenario: { type: 'string', description: 'concrete steps an attacker takes' },
          mitigatingControls: { type: 'string', description: 'any layer (RLS, filter, CSP, rate limit) that may already mitigate — be honest' },
          recommendation: { type: 'string', description: 'specific fix with file and approach' },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        },
        required: ['id', 'title', 'severity', 'file', 'evidence', 'attackScenario', 'mitigatingControls', 'recommendation', 'confidence'],
      },
    },
  },
  required: ['dimension', 'summary', 'findings'],
}

const VERDICT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    isReal: { type: 'boolean', description: 'true only if exploitable in practice given ALL defense layers' },
    reachable: { type: 'boolean', description: 'is the vulnerable code path reachable by an attacker-controlled input' },
    mitigatedByOtherLayer: { type: 'string', description: 'name the layer that already blocks this, or "none"' },
    adjustedSeverity: { type: 'string', enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO', 'FALSE_POSITIVE'] },
    reasoning: { type: 'string' },
  },
  required: ['isReal', 'reachable', 'mitigatedByOtherLayer', 'adjustedSeverity', 'reasoning'],
}

const COMMON = `You are auditing the NU-AURA codebase (repo root: ${REPO}). Stack: Java 17 / Spring Boot 3.5, Next.js 14 App Router, PostgreSQL with RLS, Redis, Kafka. It is a multi-tenant HRMS — the #1 asset is TENANT DATA ISOLATION, #2 is PII/compensation data.

This codebase has a LAYERED defense (read docs/security/baseline.md): Cloudflare, then Next.js middleware (OWASP headers), then Spring Security (JWT, CSRF double-submit), then JwtAuthenticationFilter (TenantContext + permissions), then @RequiresPermission RBAC, then service validation, then repository tenant filter, then PostgreSQL RLS, then audit emit. A weakness in one layer is only a real finding if it is actually reachable and not fully neutralized by another layer — but DO flag defense-in-depth gaps as MEDIUM/LOW.

Ground EVERY finding in real code you read — give file:line and the actual offending snippet. Do NOT invent. If a control is correctly implemented, say so in the summary. Prefer fewer, real findings over a long speculative list. Use Grep/Glob/Read to investigate. Backend Java root: ${BE}.`

const DIMENSIONS = [
  {
    key: 'auth-session',
    prompt: `${COMMON}

DIMENSION: Authentication & session management. Audit:
- ${BE}/common/security/JwtAuthenticationFilter.java — token parsing, signature verification, expiry handling, what happens on malformed/expired/none-alg tokens, permission normalization (normalizePermissionCode).
- ${BE}/common/config/SecurityConfig.java, DevSecurityConfig.java, SamlSecurityConfig.java, WebSocketSecurityConfig.java — filter chain order, permitAll() paths, whether DevSecurityConfig can activate in prod, CSRF config, session management, actuator/swagger exposure.
- Login flow, AccountLockoutService (5/15min), TokenBlacklistService, refresh token rotation, JWT secret loading (env vs hardcoded vs default fallback), cookie flags (httpOnly/Secure/SameSite), token TTL.
Look for: alg confusion / unverified JWT, default/weak JWT secret fallback, missing Secure flag, overly broad permitAll, DevSecurityConfig leaking to prod, missing lockout, logout that does not blacklist, WebSocket auth bypass.`,
  },
  {
    key: 'authz-idor',
    prompt: `${COMMON}

DIMENSION: Authorization (RBAC) & IDOR. There are 184 controllers and 500+ permissions. Audit:
- ${BE}/common/security/RequiresPermission.java and its enforcement aspect/interceptor — HOW is it enforced, can it be bypassed, does it fail-open or fail-closed.
- Sample 15-25 controllers across modules (payroll, employee, payslip, documents, expense, leave) — find endpoints that take a resource id (e.g. /payslips/{id}) and check whether they verify the resource belongs to the caller tenant AND the caller is authorized for THAT resource (IDOR), not just that the caller has the generic permission.
- SuperAdmin bypass (must be enforced at filter+service+controller, never blocked).
- Scope hierarchy VIEW_ALL > VIEW_TEAM > VIEW_DEPARTMENT > VIEW_SELF — is it actually enforced or just declared.
- Mass-assignment / privilege escalation: can a user set their own roles/permissions/salary via a profile/update endpoint (/me)? Look for @RequestBody binding directly to entities.
Look for: endpoints with NO @RequiresPermission, IDOR (id without ownership check), role escalation via mass assignment, scope checks declared but not enforced.`,
  },
  {
    key: 'tenant-isolation',
    prompt: `${COMMON}

DIMENSION: Multi-tenant data isolation — THE existential threat. Audit:
- RLS implementation (ADR-010, docs/patterns/rls-tenant-filter.md). How is tenant_id set per request/connection (SET app.current_tenant?), and CRITICALLY: does it survive connection pooling? Project notes a known "RLS-under-pgbouncer leak is critical" — investigate whether the tenant GUC is reset/leaks across pooled connections.
- The 11 native queries (grep 'nativeQuery = true') — does each include a tenant_id predicate, or does it rely solely on RLS? List each one with its file:line and verdict.
- Soft-delete @SQLRestriction / @Where usage (Hibernate 6) — does it include tenant scoping; any entity missing it.
- TenantContext propagation across @Async threads, Kafka consumers, @Scheduled jobs — does tenant context leak or default to a wrong/null tenant in background work.
Look for: native query missing tenant filter, RLS GUC leak across pooled connections, async/scheduled work running without tenant scoping, admin/system queries that bypass RLS reachable from user input.`,
  },
  {
    key: 'injection',
    prompt: `${COMMON}

DIMENSION: Injection (SQLi, SpEL, command, path, deserialization). Audit:
- SQL: grep for string-concatenated queries, '+ ' inside @Query, createQuery/createNativeQuery with concatenation, EntityManager dynamic SQL, JdbcTemplate with concatenated args, ORDER BY / sort fields built from request params (common injection point that bypasses PreparedStatement).
- SpEL: grep StandardEvaluationContext, SpelExpressionParser, parseExpression — baseline says wave-12 fixed one RCE by switching to SimpleEvaluationContext; verify NO StandardEvaluationContext consumes user input anywhere.
- Command injection: Runtime.getRuntime().exec, ProcessBuilder with user input.
- Path traversal: file read/write where filename comes from request (downloads, imports, Google Drive, OpenPDF, POI/ExcelJS exports) — '../' not sanitized.
- Deserialization: ObjectInputStream, unsafe Jackson polymorphic typing (enableDefaultTyping/@JsonTypeInfo), YAML/XML external entity (XXE) in POI/XML parsing.
Look for: dynamic SQL via sort/filter params, any StandardEvaluationContext on user input, path traversal in file ops, XXE in document parsing.`,
  },
  {
    key: 'ssrf-webhook-upload',
    prompt: `${COMMON}

DIMENSION: SSRF, webhook integrity, file upload. Audit:
- SSRF: every place the server fetches a URL — webhooks (outbound), file/avatar import-by-URL, OAuth/SAML metadata fetch, any RestTemplate/WebClient/HttpClient/URL.openConnection where the host is user/tenant-supplied. Is there an allowlist + private-IP/link-local/metadata-endpoint (169.254.169.254) block? Baseline claims "allowlist-only + private-IP block at HTTP client" — verify it actually exists in code.
- Webhook signatures (ADR-004): outbound HMAC-SHA256 signing AND inbound verification — is signature mandatory, constant-time compared, with a replay/timestamp window. Baseline lists "Webhook key rotation gap (P0-5)" as open — check status.
- File upload: content-type/extension/magic-byte validation, size limits, filename sanitization, where files land (Google Drive), whether an uploaded file can be served back and executed or used for stored XSS (svg/html).
Look for: SSRF with no private-IP block, webhook verification missing/non-constant-time/no replay window, upload with no type/size validation, unsanitized stored filenames.`,
  },
  {
    key: 'secrets-config',
    prompt: `${COMMON}

DIMENSION: Secrets & configuration hardening (gitleaks is NOT installed — do this by grep). ${DEP_CONTEXT} Audit:
- Hardcoded secrets: grep across backend/src and frontend/src and all application*.yml / .env* / docker-compose*.yml for password=, secret=, apikey, token=, private key blocks, AWS/GCP keys, JWT_SECRET defaults, DB credentials. Distinguish real secrets from test/placeholder values.
- application-prod.yml vs application-dev.yml: is debug/devtools/h2-console/swagger/actuator exposed in prod? Are management endpoints (/actuator/**) secured? show-sql, stacktrace in error responses, CORS allowedOrigins (is it '*' with allowCredentials true — invalid+dangerous), allowed methods.
- Default credentials, seed admin passwords, demo profile leaking into prod.
- Spring Boot error handling leaking stack traces / server.error.include-message.
Look for: any committed real secret, CORS '*'+credentials, actuator/swagger exposed unauthenticated in prod, dev profile config reachable in prod, JWT secret with a default fallback.`,
  },
  {
    key: 'crypto',
    prompt: `${COMMON}

DIMENSION: Cryptography & randomness. Baseline crypto inventory: bcrypt cost12, JWT HS256, webhook HMAC-SHA256, field AES-256-GCM, TLS1.2+. Audit:
- Verify claims against code: password encoder & cost, JWT algorithm (reject 'none'/alg confusion), field-level encryption impl (AES mode — GCM not ECB/CBC-without-MAC, IV uniqueness, key from KMS not hardcoded).
- Weak randomness for security tokens: grep java.util.Random / Math.random() / new Random() used to generate tokens, OTPs, password-reset tokens, session ids — MUST be SecureRandom. Same on frontend (Math.random for anything security-relevant).
- Password policy enforcement (12+ chars, complexity, history of 5, 90-day) — is it actually enforced server-side or only client-side.
- MD5/SHA1 for anything security-sensitive, hardcoded IVs/salts, ECB mode.
Look for: java.util.Random for tokens, MD5/SHA1, ECB/static-IV, JWT alg not pinned, password policy client-only.`,
  },
  {
    key: 'frontend-web',
    prompt: `${COMMON}

DIMENSION: Frontend / web security (Next.js 14 App Router). Audit:
- Security headers & CSP: find where headers are set (next.config.js headers(), middleware, frontend/proxy.ts). Is there a real CSP (not just 'unsafe-inline' everything), X-Frame-Options/frame-ancestors, HSTS, X-Content-Type-Options, Referrer-Policy. Baseline claims OWASP headers at edge — verify.
- XSS: grep dangerouslySetInnerHTML across frontend/src (and components/app/lib) — is each one sanitized (DOMPurify) before render. Wiki/wall/blog rich text (Tiptap) rendering is the highest risk.
- Exposed secrets: grep NEXT_PUBLIC_ env usage — is any real secret (API key, JWT secret) exposed to the client bundle.
- Auth token handling: is the JWT in an httpOnly cookie (good) or in localStorage/JS-readable (bad). Open redirects (router.push/redirect with a user-supplied 'next'/'returnUrl' param). PostMessage handlers without origin checks.
Look for: missing/weak CSP, unsanitized dangerouslySetInnerHTML, secret in NEXT_PUBLIC, token in localStorage, open redirect, postMessage without origin check.`,
  },
  {
    key: 'ratelimit-dos',
    prompt: `${COMMON}

DIMENSION: Rate limiting, resource exhaustion, DoS surface (app-layer; network DoS is out of scope). Audit:
- ${BE}/common/security/RateLimitingFilter.java, ${BE}/common/config/DistributedRateLimiter.java, RateLimitConfig.java — what endpoints are covered. Baseline: 5/min auth, 100/min API, 5/5min exports. Verify auth (login/reset/register) and bulk-export endpoints are ACTUALLY rate limited, not just configured. Does the limiter fail-open if Redis is down (Bucket4j fallback) and is that safe.
- Unbounded queries: list/search/export endpoints accepting a page size or returning all rows without a max LIMIT; findAll() on large tables; N+1 reachable by user.
- ReDoS: user-supplied input fed into regex (Pattern.compile on request data, or catastrophic-backtracking patterns).
- Resource exhaustion: unbounded file upload size, unbounded request body, expensive PDF/Excel generation triggerable in a loop, zip-bomb on import.
Look for: auth/export endpoints not rate limited, unbounded result sets, ReDoS, no upload size cap.`,
  },
]

phase('Audit')
log(`Auditing ${DIMENSIONS.length} security dimensions in parallel, each finding adversarially verified against the layered defense model.`)

const auditResults = await pipeline(
  DIMENSIONS,
  (d) => agent(d.prompt, {
    label: `audit:${d.key}`,
    phase: 'Audit',
    agentType: 'security-reviewer',
    schema: FINDINGS_SCHEMA,
  }),
  (audit, d) => {
    if (!audit || !audit.findings || audit.findings.length === 0) return { dimension: d.key, summary: (audit && audit.summary) || '', verified: [] }
    return parallel(audit.findings.map((f) => () =>
      agent(`${COMMON}

You are an ADVERSARIAL VERIFIER. A prior audit produced this finding in the "${d.key}" dimension. Your job is to REFUTE it. Default to skepticism: assume it is a false positive or already mitigated unless you can prove otherwise by reading the actual code AND every relevant defense layer.

FINDING:
- Title: ${f.title}
- Claimed severity: ${f.severity}
- Location: ${f.file}
- Evidence: ${f.evidence}
- Attack scenario: ${f.attackScenario}
- Claimed mitigating controls: ${f.mitigatingControls}

Verify by reading: (1) the cited file:line to confirm the code actually says this; (2) whether attacker-controlled input actually reaches it (reachability); (3) whether ANOTHER layer (Spring Security config, JwtAuthenticationFilter, @RequiresPermission, repository tenant filter, PostgreSQL RLS, Next.js headers, rate limiter) already neutralizes it. Only mark isReal=true if it is exploitable in practice end-to-end. If the cited code does not exist or does not say what is claimed, mark FALSE_POSITIVE.`,
        {
          label: `verify:${d.key}:${f.id}`,
          phase: 'Verify',
          agentType: 'security-reviewer',
          schema: VERDICT_SCHEMA,
        })
        .then((v) => ({ ...f, dimension: d.key, verdict: v }))
        .catch(() => ({ ...f, dimension: d.key, verdict: null }))
    )).then((verified) => ({ dimension: d.key, summary: audit.summary, verified: verified.filter(Boolean) }))
  }
)

const allFindings = auditResults.filter(Boolean).flatMap((r) => (r.verified || []))
const confirmed = allFindings.filter((f) => f.verdict && f.verdict.isReal && f.verdict.adjustedSeverity !== 'FALSE_POSITIVE')
const dimSummaries = auditResults.filter(Boolean).map((r) => `- **${r.dimension}**: ${r.summary || '(no summary)'}`).join('\n')

log(`Audit complete: ${allFindings.length} raw findings, ${confirmed.length} survived adversarial verification.`)

phase('Synthesize')

const findingsForReport = confirmed.map((f) => ({
  dimension: f.dimension,
  title: f.title,
  originalSeverity: f.severity,
  adjustedSeverity: f.verdict.adjustedSeverity,
  file: f.file,
  evidence: f.evidence,
  attackScenario: f.attackScenario,
  reachable: f.verdict.reachable,
  mitigatedByOtherLayer: f.verdict.mitigatedByOtherLayer,
  recommendation: f.recommendation,
  verifierReasoning: f.verdict.reasoning,
}))

const report = await agent(`You are the lead security architect synthesizing a multi-agent audit of NU-AURA into a single prioritized remediation report.

Dependency-scan context: ${DEP_CONTEXT}

Per-dimension posture summaries:
${dimSummaries}

VERIFIED findings (already survived adversarial verification — these are real and reachable):
${JSON.stringify(findingsForReport, null, 2)}

Write a remediation report to ${REPO}/docs/audit/release-2026-06-04/security-audit-2026-06-04.md with this structure:
1. Executive summary — overall posture (this codebase has strong layered defenses; be fair), count by adjusted severity, the single most important thing to fix.
2. Prioritized findings table — sorted CRITICAL to LOW: ID | Title | Dimension | Severity | File | Reachable | Already-mitigated-by.
3. Detailed findings — for each: evidence (file:line + snippet), attack scenario, why it survived verification, and a SPECIFIC fix (file + concrete approach/code).
4. Defense-in-depth gaps — MEDIUM/LOW items that are not directly exploitable but weaken a layer.
5. Dependency hygiene — the dev-only npm criticals + recommendation (upgrade vitest, never run Vitest UI server in CI/prod).
6. What is already done well — per the dimension summaries, so we do not regress it.
7. Recommended remediation order — a numbered, dependency-aware fix sequence the orchestrator will execute next.

Use the Write tool to create the file. Then return a concise plain-text summary: the counts by adjusted severity, and the top 5 fixes in recommended order with their file paths, so the orchestrator can start fixing immediately.`,
  { label: 'synthesize:report', phase: 'Synthesize', agentType: 'security-architect' })

const severityRank = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 }
return {
  totalRaw: allFindings.length,
  confirmed: confirmed.length,
  bySeverity: confirmed.reduce((acc, f) => {
    const s = f.verdict.adjustedSeverity
    acc[s] = (acc[s] || 0) + 1
    return acc
  }, {}),
  topFindings: confirmed
    .map((f) => ({ title: f.title, severity: f.verdict.adjustedSeverity, file: f.file, dimension: f.dimension }))
    .sort((a, b) => (severityRank[a.severity] ?? 9) - (severityRank[b.severity] ?? 9)),
  reportSummary: report,
}
