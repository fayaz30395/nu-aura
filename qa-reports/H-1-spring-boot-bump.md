# H-1 — Spring Boot patch bump (prepared for CI/PR, NOT applied locally)

**Finding:** effective `spring-boot-starter-parent` is **3.4.7** (`pom.xml:24`), behind current 3.4.x; inherits framework CVEs patched later in the line. Sole remaining genuine HIGH from the security audit.

**Why not applied on the local baseline:** would mutate the verified-green `rc-2026-06-09-baseline` (4029 tests); target patch can't be resolved/fetched offline here; bump touches Spring Security + Spring Data (RLS/JWT surface) and must pass the full gate on pinned JDK21 — that environment is CI, not this laptop.

## Exact change
`pom.xml` (repo root), line 24:
```diff
-        <version>3.4.7</version>
+        <version>3.4.LATEST</version>   <!-- set to latest 3.4.x from the probe below -->
```

## CI/PR steps
```bash
# 1. Determine latest 3.4.x patch (CI has network)
mvn -q -f pom.xml versions:display-parent-updates

# 2. Set the version (replace 3.4.LATEST), then full gate on pinned JDK21
mvn -B -pl backend -am verify            # must stay 4029/0/0/0 (+ Testcontainers PG16)

# 3. CVE delta evidence
mvn -B org.owasp:dependency-check-maven:check   # confirm the fixed CVEs drop out

# 4. Frontend unaffected (no dep change) — tsc/lint/build already green
```

## Acceptance
- Full backend `verify` green (no regression vs 4029 baseline).
- OWASP dependency-check shows the previously-flagged framework CVEs resolved.
- No code changes required (patch-level; if any API drift appears, fix in the same PR).

## Decision note
Stack-lock docs conflict (CLAUDE.md "3.4.1", MEMORY "3.5.14", effective "3.4.7").
Recommend staying on the **3.4.x** line (patch, lowest blast radius) for this release; schedule the 3.5.x minor as a separate, tested migration. Correct the stale `pom.xml:254` BOM comment and MEMORY `project_stack_versions.md` to the real effective version in the same PR (closes L-2).
