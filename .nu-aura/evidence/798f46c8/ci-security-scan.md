# BLOCKER-004 — main "Security Scan" CI failure

Run: 36303355757 (Security Scan, main, schedule, 2026-09-27T07:31:20Z) — conclusion: failure
Command: `gh run view 36303355757 --log-failed`

## Root cause

Job step `Container scan (Trivy)` failed with a FATAL error, not a vulnerability finding:

```
FATAL Fatal error run error: image scan error: ... Unable to initialize the Java DB:
Java DB update failed: ... failed to download ... trivy-java-db:1 ...:
write /home/runner/work/nu-aura/nu-aura/.cache/trivy/java-db/trivy-java.db: no space left on device
##[error]Process completed with exit code 1.
```

Preceded by the runner warning:
`You are running out of disk space ... Free space left: 77 MB`.

## Assessment

- This is an **infrastructure/disk-space flake** in the GitHub runner during Trivy's Java DB
  download, NOT a product defect and NOT an actual CVE gate failure.
- The Trivy policy was `exit-code=1`, `severity=CRITICAL`, `ignore-unfixed=true`; it never reached
  the vulnerability evaluation because the DB download exhausted the disk.
- Classification: CI reliability issue. Remediation candidates (not yet applied): free runner disk
  before the scan (remove unused toolchains/caches), skip the Java DB download, or use a larger
  runner. No product code change required.

Status: IN_PROGRESS (root cause identified; fix not applied).
