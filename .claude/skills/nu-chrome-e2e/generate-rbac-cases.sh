#!/usr/bin/env bash
# Generates the UC-RBAC-* section of use-cases.yaml from the authoritative matrix.
# Matrix rows: route + expected behavior per role.
# Legend: R=render  X=redirect  W=render-with-reduced-scope (own data only)
# Roles (column order, fixed): SA TA HRA HRM MGR TL EMP REC FIN

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT="${1:-$SCRIPT_DIR/use-cases.rbac.yaml}"

# column: SA TA HRA HRM MGR TL EMP REC FIN
# rows: route|SA|TA|HRA|HRM|MGR|TL|EMP|REC|FIN|api_endpoint|severity_on_redirect_miss
# Each letter:  R (render), X (redirect→/me/dashboard, severity P0 unless overridden),
#               W (render with reduced scope — own/team data only, admin selectors forbidden)
# api_endpoint is the underlying REST path tested in the negative API check.

MATRIX=$(cat <<'EOF'
/me/dashboard|R|R|R|R|R|R|R|R|R|/api/v1/me/dashboard|P1
/me/profile|R|R|R|R|R|R|R|R|R|/api/v1/me/profile|P1
/me/leave|R|R|R|R|R|R|R|R|R|/api/v1/me/leave|P1
/me/attendance|R|R|R|R|R|R|R|R|R|/api/v1/me/attendance|P1
/me/payslips|R|R|R|R|R|R|R|R|R|/api/v1/me/payslips|P1
/me/assets|R|R|R|R|R|R|R|R|R|/api/v1/me/assets|P1
/me/documents|R|R|R|R|R|R|R|R|R|/api/v1/me/documents|P1
/me/loans|R|R|R|R|R|R|R|R|R|/api/v1/me/loans|P1
/me/expenses|R|R|R|R|R|R|R|R|R|/api/v1/me/expenses|P1
/me/travel|R|R|R|R|R|R|R|R|R|/api/v1/me/travel|P1
/me/training|R|R|R|R|R|R|R|R|R|/api/v1/me/training|P1
/me/goals|R|R|R|R|R|R|R|R|R|/api/v1/me/goals|P1
/me/performance|R|R|R|R|R|R|R|R|R|/api/v1/me/performance|P1
/me/tax|R|R|R|R|R|R|R|R|R|/api/v1/me/tax|P1
/me/letters|R|R|R|R|R|R|R|R|R|/api/v1/me/letters|P1
/me/helpdesk|R|R|R|R|R|R|R|R|R|/api/v1/me/helpdesk|P1
/dashboard|R|R|R|R|R|R|X|R|R|/api/v1/dashboard|P0
/employees|R|R|R|R|W|W|X|X|X|/api/v1/employees|P0
/departments|R|R|R|R|R|R|X|X|X|/api/v1/departments|P1
/attendance|R|R|R|R|W|W|W|X|X|/api/v1/attendance|P0
/leave|R|R|R|R|W|W|W|X|X|/api/v1/leave|P0
/payroll|R|R|R|R|X|X|X|X|R|/api/v1/payroll|P0
/compensation|R|R|R|R|X|X|X|X|R|/api/v1/compensation|P0
/benefits|R|R|R|R|X|X|X|X|R|/api/v1/benefits|P0
/expenses|R|R|R|R|W|W|W|X|R|/api/v1/expenses|P1
/loans|R|R|R|R|X|X|W|X|R|/api/v1/loans|P0
/travel|R|R|R|R|W|W|W|X|R|/api/v1/travel|P1
/assets|R|R|R|R|W|W|W|X|X|/api/v1/assets|P1
/letters|R|R|R|R|X|X|X|X|X|/api/v1/letters|P0
/statutory|R|R|R|R|X|X|X|X|R|/api/v1/statutory|P0
/statutory-filings|R|R|R|R|X|X|X|X|R|/api/v1/statutory-filings|P0
/tax|R|R|R|R|X|X|W|X|R|/api/v1/tax|P0
/helpdesk|R|R|R|R|R|R|R|R|R|/api/v1/helpdesk|P1
/approvals|R|R|R|R|R|R|X|R|R|/api/v1/approvals|P0
/announcements|R|R|R|R|R|R|R|R|R|/api/v1/announcements|P1
/org-chart|R|R|R|R|R|R|R|R|R|/api/v1/org-chart|P2
/timesheets|R|R|R|R|W|W|W|X|X|/api/v1/timesheets|P1
/time-tracking|R|R|R|R|W|W|W|X|X|/api/v1/time-tracking|P1
/projects|R|R|R|R|W|W|W|X|X|/api/v1/projects|P1
/resources|R|R|R|R|W|W|X|X|X|/api/v1/resources|P1
/allocations|R|R|R|R|W|X|X|X|X|/api/v1/allocations|P0
/calendar|R|R|R|R|R|R|R|R|R|/api/v1/calendar|P2
/overtime|R|R|R|R|W|W|W|X|R|/api/v1/overtime|P1
/probation|R|R|R|R|W|X|X|X|X|/api/v1/probation|P0
/shifts|R|R|R|R|W|W|W|X|X|/api/v1/shifts|P1
/reports|R|R|R|R|X|X|X|X|R|/api/v1/reports|P0
/analytics|R|R|R|R|X|X|X|X|X|/api/v1/analytics|P0
/settings|R|R|X|X|X|X|X|X|X|/api/v1/settings|P0
/admin|R|R|X|X|X|X|X|X|X|/api/v1/admin|P0
/admin/roles|R|R|X|X|X|X|X|X|X|/api/v1/admin/roles|P0
/import-export|R|R|R|X|X|X|X|X|X|/api/v1/import-export|P0
/integrations|R|R|X|X|X|X|X|X|X|/api/v1/integrations|P0
/holidays|R|R|R|R|R|R|R|R|R|/api/v1/holidays|P2
/restricted-holidays|R|R|R|R|R|R|R|R|R|/api/v1/restricted-holidays|P2
/contracts|R|R|R|R|X|X|W|X|X|/api/v1/contracts|P0
/exit-interview|R|R|R|R|X|X|X|X|X|/api/v1/exit-interview|P0
/workflows|R|R|R|X|X|X|X|X|X|/api/v1/workflows|P0
/compliance|R|R|R|R|X|X|X|X|R|/api/v1/compliance|P0
/predictive-analytics|R|R|R|R|X|X|X|X|X|/api/v1/predictive-analytics|P0
/executive|R|R|X|X|X|X|X|X|X|/api/v1/executive|P0
/sign|R|R|R|R|R|R|R|R|R|/api/v1/sign|P2
/team-directory|R|R|R|R|R|R|R|R|R|/api/v1/team-directory|P2
/referrals|R|R|R|R|R|R|R|R|R|/api/v1/referrals|P2
/one-on-one|R|R|R|R|R|R|R|X|X|/api/v1/one-on-one|P1
/payments|R|R|R|R|X|X|X|X|R|/api/v1/payments|P0
/lwf|R|R|R|R|X|X|X|X|R|/api/v1/lwf|P0
/security|R|R|X|X|X|X|X|X|X|/api/v1/security|P0
/biometric-devices|R|R|R|X|X|X|X|X|X|/api/v1/biometric-devices|P0
/letter-templates|R|R|R|X|X|X|X|X|X|/api/v1/letter-templates|P0
/recruitment|R|R|R|R|X|X|X|R|X|/api/v1/recruitment|P0
/onboarding|R|R|R|R|X|X|X|R|X|/api/v1/onboarding|P0
/preboarding|R|R|R|R|X|X|X|R|X|/api/v1/preboarding|P0
/offboarding|R|R|R|R|X|X|X|X|X|/api/v1/offboarding|P0
/offer-portal|R|R|R|R|X|X|X|R|X|/api/v1/offer-portal|P0
/careers|R|R|R|R|R|R|R|R|R|/api/v1/careers|P2
/performance|R|R|R|R|R|R|W|X|X|/api/v1/performance|P1
/fluence/wiki|R|R|R|R|R|R|R|R|R|/api/v1/fluence/wiki|P2
/fluence/blogs|R|R|R|R|R|R|R|R|R|/api/v1/fluence/blogs|P2
/fluence/templates|R|R|R|R|R|R|R|R|R|/api/v1/fluence/templates|P2
/fluence/drive|R|R|R|R|R|R|R|R|R|/api/v1/fluence/drive|P2
/fluence/search|R|R|R|R|R|R|R|R|R|/api/v1/fluence/search|P2
/fluence/my-content|R|R|R|R|R|R|R|R|R|/api/v1/fluence/my-content|P2
/fluence/wall|R|R|R|R|R|R|R|R|R|/api/v1/fluence/wall|P2
/fluence/dashboard|R|R|R|R|R|R|R|R|R|/api/v1/fluence/dashboard|P2
/fluence/analytics|R|R|R|R|R|R|R|R|R|/api/v1/fluence/analytics|P2
EOF
)

ROLE_NAMES=(SUPER_ADMIN TENANT_ADMIN HR_ADMIN HR_MANAGER MANAGER TEAM_LEAD EMPLOYEE RECRUITMENT_ADMIN FINANCE_ADMIN)

n=1
printf "# UC-RBAC-NNN — generated by generate-rbac-cases.sh\n" > "$OUT"
printf "# Legend: expect=render | expect=redirect → /me/dashboard | expect=render_scoped (admin selectors forbidden)\n\n" >> "$OUT"
printf "use_cases:\n" >> "$OUT"

while IFS='|' read -r route sa ta hra hrm mgr tl emp rec fin api sev; do
  [ -z "$route" ] && continue
  cells=("$sa" "$ta" "$hra" "$hrm" "$mgr" "$tl" "$emp" "$rec" "$fin")
  for i in 0 1 2 3 4 5 6 7 8; do
    role="${ROLE_NAMES[$i]}"
    cell="${cells[$i]}"
    uc=$(printf "UC-RBAC-%03d" "$n")
    case "$cell" in
      R) expect="render"; target="null"; sev_out="P2" ;;
      X) expect="redirect"; target="/me/dashboard"; sev_out="$sev" ;;
      W) expect="render_scoped"; target="null"; sev_out="P1" ;;
      *) echo "unknown cell '$cell' for $route/$role" >&2; exit 1 ;;
    esac
    {
      printf "  - id: %s\n" "$uc"
      printf "    category: RBAC\n"
      printf "    route: %s\n" "$route"
      printf "    role: %s\n" "$role"
      printf "    expect: %s\n" "$expect"
      printf "    redirect_target: %s\n" "$target"
      printf "    severity_on_miss: %s\n" "$sev_out"
      if [ "$expect" = "redirect" ]; then
        printf "    negative_api_check:\n"
        printf "      endpoint: GET %s\n" "$api"
        printf "      expected_status: 403\n"
      fi
    } >> "$OUT"
    n=$((n+1))
  done
done <<< "$MATRIX"

total=$((n-1))
echo "Generated $total UC-RBAC entries → $OUT" >&2
