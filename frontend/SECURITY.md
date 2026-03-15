# Security Vulnerability Register

This document tracks known vulnerabilities, their risk assessment, and planned remediation.

> Last updated: 2026-03-13

---

## Active Vulnerabilities

### [HIGH] Next.js Image Optimizer DoS (GHSA-9g9p-9gw9-jx7f)

| Field       | Value |
|-------------|-------|
| **Package** | `next@14.2.35` |
| **CVE**     | GHSA-9g9p-9gw9-jx7f |
| **Severity**| High |
| **Fix**     | `next@15.3.x` or `next@16.x` (breaking semver) |
| **Status**  | Tracked — upgrade deferred |

**Description:** Self-hosted Next.js applications using `remotePatterns` with wildcard hostnames
in `next.config.*` can be abused to trigger resource exhaustion in the Image Optimization API.

**Assessment for this project:**
- `next.config.js` uses `**.amazonaws.com`, `**.cloudfront.net`, `**.licdn.com` wildcards → **directly affected**
- Exploit requires unauthenticated access to `/_next/image?url=<crafted-url>`

**Mitigations applied:**
1. No public-facing deployment yet (dev/staging only) — risk surface minimal
2. CSP header blocks external `<img>` injection via `img-src 'self' data: blob: https:`
3. Upgrade to Next.js 15 planned for Q2 2026 (Wave 9 release cycle)

**Remediation plan:**
```
Q2 2026: Next.js 14 → 15 upgrade (App Router changes minimal for our usage)
         Test all experimental.optimizePackageImports still work
         Validate remotePatterns behavior unchanged
         eslint-config-next upgraded automatically as peer dep
```

---

### [HIGH] Next.js HTTP Request Deserialization DoS (GHSA-h25m-26qc-wcjf)

| Field       | Value |
|-------------|-------|
| **Package** | `next@14.2.35` |
| **CVE**     | GHSA-h25m-26qc-wcjf |
| **Severity**| High |
| **Fix**     | `next@15.3.x` or `next@16.x` (breaking semver) |
| **Status**  | Tracked — upgrade deferred (same as above) |

**Description:** Malformed HTTP request deserialization can trigger DoS in React Server Components.

**Assessment:** We use the App Router with RSC, so this is potentially in-scope.
Same upgrade path as above — resolved together in the Q2 Next.js upgrade.

---

### [HIGH] glob CLI Command Injection (GHSA in @next/eslint-plugin-next)

| Field       | Value |
|-------------|-------|
| **Package** | `glob` (via `@next/eslint-plugin-next` → `eslint-config-next`) |
| **Severity**| High |
| **Fix**     | `eslint-config-next@16.x` |
| **Status**  | **No production risk — devDependency only** |

**Description:** `glob` CLI's `-c/--cmd` flag executes shell commands if invoked directly.

**Assessment:**
- `glob` is a transitive dep of `eslint-config-next` (devDependency)
- `glob` is **never invoked as a CLI** in this project (only used as a library by eslint internally)
- Exploitation requires an attacker to execute `npx glob -c '<cmd>'` on the build machine
- CI/CD uses isolated runners; no untrusted code execution in the same process
- **Risk: NEGLIGIBLE** for this project

**No action required** until Next.js 15 upgrade resolves this as a side effect.

---

## Resolved Vulnerabilities

*(None yet — this file tracks active issues only)*

---

## Upgrade Path: Next.js 14 → 15

```bash
# 1. Install Next.js 15 (peer deps will update eslint-config-next automatically)
npm install next@15 react@19 react-dom@19

# 2. Run codemod for breaking changes
npx @next/codemod@latest upgrade

# 3. Check experimental.optimizePackageImports (may be stable in v15)

# 4. Validate remotePatterns still accepted

# 5. Run type check
npx tsc --noEmit

# 6. Run full test suite
npm test
```

**Known breaking changes to address:**
- `next/font` API changes (verify font loading still works)
- Async `params`/`searchParams` in pages (Next.js 15 requires `await params`)
- React 19 strict mode changes if upgrading React simultaneously

---

## References

- https://github.com/advisories/GHSA-9g9p-9gw9-jx7f
- https://github.com/advisories/GHSA-h25m-26qc-wcjf
- https://nextjs.org/blog/next-15 (migration guide)
