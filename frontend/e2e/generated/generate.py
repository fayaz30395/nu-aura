#!/usr/bin/env python3
"""Generate Playwright test data from docs/qa/use-cases.v2.yaml.

Emits two JSON files consumed by *.spec.ts files:
  - routes.json        : { path, modules[], hasParams } per unique frontend route
  - rbac-matrix.json   : { role, route, expected } per RBAC UC

Re-run via: python3 frontend/e2e/generated/generate.py
"""
import json, sys, re
from pathlib import Path

# Lightweight YAML reader (avoid pyyaml dep).
# Catalog uses a flat predictable shape; we only need: roles[], rbac_use_cases[].
ROOT = Path(__file__).resolve().parents[3]
YAML = ROOT / "docs/qa/use-cases.v2.yaml"
OUT = ROOT / "frontend/e2e/generated"

ROLE_PASS_FALLBACK = "Welcome@123"  # documented dev shared password

# Routes that legitimately require URL params or are dynamic; smoke skips them.
SKIP_ROUTE_PATTERNS = [
    re.compile(r"\["),                      # /[id], /[slug] dynamic segments
    re.compile(r"^/api/"),                  # API route handlers, not pages
    re.compile(r"^/auth/"),                 # auth flows tested in dedicated suite
    # Catalog references these but no corresponding page.tsx exists in the
    # frontend tree. Skip until the page is built so we don't spam 404s.
    re.compile(r"^/notifications$"),        # use /me/notifications instead
    re.compile(r"^/v2-preview$"),           # legacy preview surface, not shipped
]

def parse_yaml(text: str) -> dict:
    """Minimal YAML parse — only handles the v2 catalog's shape."""
    roles, rbac = [], []
    section = None
    cur = None
    for raw in text.splitlines():
        line = raw.rstrip()
        if not line or line.lstrip().startswith("#"):
            continue
        # Top-level section markers
        if re.match(r"^[a-z_]+:\s*$", line):
            section = line.split(":", 1)[0]
            cur = None
            continue
        if section == "roles":
            if line.startswith("  - "):
                cur = {}
                roles.append(cur)
                line = "    " + line[4:]
            m = re.match(r"^    ([a-z_]+):\s*(.*)$", line)
            if m and cur is not None:
                cur[m.group(1)] = m.group(2).strip().strip('"')
        elif section == "rbac_use_cases":
            if line.startswith("  - "):
                cur = {}
                rbac.append(cur)
                line = "    " + line[4:]
            m = re.match(r"^    ([a-z_]+):\s*(.*)$", line)
            if m and cur is not None:
                v = m.group(2).strip()
                # strip trailing comments
                if "#" in v:
                    v = v.split("#")[0].strip()
                cur[m.group(1)] = v.strip('"')
    return {"roles": roles, "rbac_use_cases": rbac}

def main() -> int:
    if not YAML.exists():
        print(f"NO YAML at {YAML}", file=sys.stderr)
        return 1
    doc = parse_yaml(YAML.read_text())
    roles = doc["roles"]
    rbac = doc["rbac_use_cases"]

    # Unique routes that are safe to smoke-test
    seen, routes = set(), []
    for uc in rbac:
        r = uc.get("route", "")
        if not r or r in seen:
            continue
        if any(p.search(r) for p in SKIP_ROUTE_PATTERNS):
            continue
        seen.add(r)
        routes.append({"path": r, "module": r.strip("/").split("/")[0] or "root"})
    routes.sort(key=lambda x: x["path"])

    # RBAC matrix — one entry per (role, route) cell
    matrix = []
    for uc in rbac:
        route = uc.get("route", "")
        role = uc.get("role", "")
        expected = uc.get("expected", "observe")
        if not route or not role:
            continue
        if any(p.search(route) for p in SKIP_ROUTE_PATTERNS):
            continue
        matrix.append({
            "id": uc.get("id", ""),
            "role": role,
            "route": route,
            "expected": expected,
        })

    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "routes.json").write_text(json.dumps(routes, indent=2))
    (OUT / "rbac-matrix.json").write_text(json.dumps(matrix, indent=2))
    (OUT / "roles.json").write_text(json.dumps(roles, indent=2))

    print(f"routes: {len(routes)}  rbac cells: {len(matrix)}  roles: {len(roles)}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
