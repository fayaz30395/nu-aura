#!/usr/bin/env bash
# baseline-scan.sh
# Runs the automated portion of docs/security/scan-checklist.md.
# Exits non-zero on any Critical finding so CI can gate on it.
#
# Usage:
#   scripts/security/baseline-scan.sh [--skip-images] [--report-dir <dir>]
#
# Environment:
#   SKIP_FRONTEND=1     Skip npm audit (e.g., when frontend not in this checkout)
#   SKIP_BACKEND=1      Skip mvn dependency-check
#   SKIP_IMAGES=1       Skip Trivy image scans
#   FAIL_ON_HIGH=1      Treat High as failure (default: only Critical fails the run)

set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
REPORT_DIR="${REPO_ROOT}/build/security-reports/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$REPORT_DIR"

# Color output if TTY
if [ -t 1 ]; then
    RED=$'\033[0;31m'; YELLOW=$'\033[0;33m'; GREEN=$'\033[0;32m'; RESET=$'\033[0m'
else
    RED=''; YELLOW=''; GREEN=''; RESET=''
fi

CRITICAL_COUNT=0
HIGH_COUNT=0
FAILURES=()

log()    { echo "[$(date +%H:%M:%S)] $*"; }
section() { echo; echo "═══ $* ═══"; }
fail()   { echo "${RED}FAIL:${RESET} $*"; FAILURES+=("$*"); }
warn()   { echo "${YELLOW}WARN:${RESET} $*"; }
ok()     { echo "${GREEN}OK:${RESET}   $*"; }

while [[ $# -gt 0 ]]; do
    case "$1" in
        --skip-images) export SKIP_IMAGES=1; shift ;;
        --report-dir) REPORT_DIR="$2"; mkdir -p "$REPORT_DIR"; shift 2 ;;
        *) echo "unknown arg: $1"; exit 64 ;;
    esac
done

log "Report dir: $REPORT_DIR"

# ─── Secrets scan ────────────────────────────────────────────────────────────
section "Secrets scan (gitleaks)"
if command -v gitleaks >/dev/null 2>&1; then
    if gitleaks detect --source "$REPO_ROOT" --no-banner --report-path "$REPORT_DIR/gitleaks.json" --report-format json; then
        ok "gitleaks: clean"
    else
        fail "gitleaks: matches found — see $REPORT_DIR/gitleaks.json"
    fi
else
    warn "gitleaks not installed — skipping. Install: brew install gitleaks"
fi

# ─── Backend dependency CVE ──────────────────────────────────────────────────
section "Backend dependency CVE (OWASP dep-check)"
if [ "${SKIP_BACKEND:-0}" = "1" ]; then
    warn "SKIP_BACKEND=1 — skipping mvn dep-check"
elif [ -f "$REPO_ROOT/pom.xml" ]; then
    cd "$REPO_ROOT/backend" 2>/dev/null || cd "$REPO_ROOT"
    if mvn -B -q org.owasp:dependency-check-maven:check \
        -Dformat=JSON \
        -DoutputDirectory="$REPORT_DIR/depcheck" 2>&1 | tee "$REPORT_DIR/depcheck.log"; then
        ok "dep-check: completed"
    else
        warn "dep-check: completed with findings"
    fi
    # Parse JSON for Critical/High
    if [ -f "$REPORT_DIR/depcheck/dependency-check-report.json" ]; then
        crit=$(jq '[.dependencies[]?.vulnerabilities[]? | select(.severity=="CRITICAL")] | length' "$REPORT_DIR/depcheck/dependency-check-report.json" 2>/dev/null || echo 0)
        high=$(jq '[.dependencies[]?.vulnerabilities[]? | select(.severity=="HIGH")] | length' "$REPORT_DIR/depcheck/dependency-check-report.json" 2>/dev/null || echo 0)
        CRITICAL_COUNT=$((CRITICAL_COUNT + crit))
        HIGH_COUNT=$((HIGH_COUNT + high))
        log "dep-check: Critical=$crit, High=$high"
        [ "$crit" -gt 0 ] && fail "dep-check: $crit Critical CVE(s)"
    fi
    cd "$REPO_ROOT"
else
    warn "No pom.xml at repo root — skipping"
fi

# ─── Frontend dependency CVE ─────────────────────────────────────────────────
section "Frontend dependency CVE (npm audit)"
if [ "${SKIP_FRONTEND:-0}" = "1" ]; then
    warn "SKIP_FRONTEND=1 — skipping npm audit"
elif [ -d "$REPO_ROOT/frontend" ]; then
    cd "$REPO_ROOT/frontend"
    npm audit --json --omit=dev > "$REPORT_DIR/npm-audit.json" 2>"$REPORT_DIR/npm-audit.err" || true
    crit=$(jq '.metadata.vulnerabilities.critical // 0' "$REPORT_DIR/npm-audit.json" 2>/dev/null || echo 0)
    high=$(jq '.metadata.vulnerabilities.high // 0' "$REPORT_DIR/npm-audit.json" 2>/dev/null || echo 0)
    CRITICAL_COUNT=$((CRITICAL_COUNT + crit))
    HIGH_COUNT=$((HIGH_COUNT + high))
    log "npm audit: Critical=$crit, High=$high"
    [ "$crit" -gt 0 ] && fail "npm audit: $crit Critical CVE(s)"
    [ "$crit" -eq 0 ] && [ "$high" -eq 0 ] && ok "npm audit: clean"
    cd "$REPO_ROOT"
else
    warn "No frontend/ dir — skipping"
fi

# ─── Container image scans ───────────────────────────────────────────────────
section "Container image scan (Trivy)"
if [ "${SKIP_IMAGES:-0}" = "1" ]; then
    warn "SKIP_IMAGES=1 — skipping"
elif command -v trivy >/dev/null 2>&1; then
    for img in nu-aura-backend:latest nu-aura-frontend:latest; do
        if docker image inspect "$img" >/dev/null 2>&1; then
            trivy image --quiet --severity CRITICAL,HIGH --format json --output "$REPORT_DIR/trivy-${img//[:\/]/_}.json" "$img" || true
            crit=$(jq '[.Results[]?.Vulnerabilities[]? | select(.Severity=="CRITICAL")] | length' "$REPORT_DIR/trivy-${img//[:\/]/_}.json" 2>/dev/null || echo 0)
            CRITICAL_COUNT=$((CRITICAL_COUNT + crit))
            [ "$crit" -gt 0 ] && fail "trivy $img: $crit Critical CVE(s)"
            [ "$crit" -eq 0 ] && ok "trivy $img: clean (Critical)"
        else
            warn "Image $img not built locally — skipping. Build first: docker build -t $img ."
        fi
    done
else
    warn "trivy not installed — skipping. Install: brew install trivy"
fi

# ─── Cross-tenant query smoke check (app-level) ──────────────────────────────
section "Cross-tenant query detector (heuristic)"
# Heuristic: grep for native queries that mention tenant-aware tables without 'tenant_id'.
TENANT_AWARE_TABLES="employees attendance leave_balances payslips compensation contracts documents"
SUSPECT_COUNT=0
for tbl in $TENANT_AWARE_TABLES; do
    matches=$(grep -rn --include="*.java" "@Query.*$tbl\|nativeQuery.*$tbl" "$REPO_ROOT/backend/src/main/java" 2>/dev/null | grep -v "tenant_id" | head -5 || true)
    if [ -n "$matches" ]; then
        SUSPECT_COUNT=$((SUSPECT_COUNT + 1))
        echo "$matches" >> "$REPORT_DIR/cross-tenant-suspects.txt"
    fi
done
if [ "$SUSPECT_COUNT" -gt 0 ]; then
    warn "cross-tenant heuristic: $SUSPECT_COUNT tables with native queries missing tenant_id keyword — review $REPORT_DIR/cross-tenant-suspects.txt"
else
    ok "cross-tenant heuristic: clean"
fi

# ─── ZAP baseline (only if zap-baseline.py available, e.g. in CI) ─────────────
section "OWASP ZAP baseline"
if command -v zap-baseline.py >/dev/null 2>&1 && [ -n "${ZAP_TARGET_URL:-}" ]; then
    zap-baseline.py -t "$ZAP_TARGET_URL" -J "$REPORT_DIR/zap-baseline.json" || true
    ok "zap baseline: see $REPORT_DIR/zap-baseline.json"
else
    warn "zap-baseline.py not present or ZAP_TARGET_URL unset — skipping. Wire in CI."
fi

# ─── Summary ─────────────────────────────────────────────────────────────────
section "Summary"
echo "Critical findings: $CRITICAL_COUNT"
echo "High findings:     $HIGH_COUNT"
echo "Report dir:        $REPORT_DIR"

if [ "$CRITICAL_COUNT" -gt 0 ]; then
    echo "${RED}❌ CRITICAL findings — failing build${RESET}"
    for f in "${FAILURES[@]}"; do echo " - $f"; done
    exit 1
fi
if [ "${FAIL_ON_HIGH:-0}" = "1" ] && [ "$HIGH_COUNT" -gt 0 ]; then
    echo "${RED}❌ HIGH findings (FAIL_ON_HIGH=1) — failing build${RESET}"
    exit 1
fi

echo "${GREEN}✅ baseline-scan complete — no Critical findings${RESET}"
exit 0
