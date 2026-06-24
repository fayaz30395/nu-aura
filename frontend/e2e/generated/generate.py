#!/usr/bin/env python3
"""Generate Playwright test data from the app tree and docs/qa/use-cases.v2.yaml.

Emits two JSON files consumed by *.spec.ts files:
  - routes.json        : { path, module } per unique static frontend route
  - rbac-matrix.json   : { role, route, expected } per RBAC UC

Re-run via: python3 frontend/e2e/generated/generate.py
"""
import json, sys, re
from pathlib import Path

# Lightweight YAML reader (avoid pyyaml dep).
# Catalog uses a flat predictable shape; we only need: roles[], rbac_use_cases[].
ROOT = Path(__file__).resolve().parents[3]
YAML = ROOT / "docs/qa/use-cases.v2.yaml"
APP = ROOT / "frontend/app"
OUT = ROOT / "frontend/e2e/generated"

ROLE_PASS_FALLBACK = "Welcome@123"  # documented dev shared password

# Routes that legitimately require URL params or are dynamic; smoke skips them.
SKIP_ROUTE_PATTERNS = [
    re.compile(r"\["),                      # /[id], /[slug] dynamic segments
    re.compile(r"^/api/"),                  # API route handlers, not pages
    re.compile(r"^/v2-preview$"),           # legacy preview surface, not shipped
]

IGNORE_APP_DIRS = {"node_modules", ".next", "coverage"}

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

def route_from_page(page: Path) -> str:
    rel = page.relative_to(APP)
    segments = [
        part for part in rel.parts[:-1]
        if not (part.startswith("(") and part.endswith(")"))
        and not part.startswith("@")
    ]
    return "/" + "/".join(segments) if segments else "/"

def is_skipped_route(route: str) -> bool:
    return any(pattern.search(route) for pattern in SKIP_ROUTE_PATTERNS)

def collect_static_app_routes() -> set[str]:
    routes = set()
    for page in APP.rglob("page.tsx"):
        if any(part in IGNORE_APP_DIRS for part in page.parts):
            continue
        route = route_from_page(page)
        if not is_skipped_route(route):
            routes.add(route)
    return routes

def main() -> int:
    if YAML.exists():
        doc = parse_yaml(YAML.read_text())
        roles = doc["roles"]
        rbac = doc["rbac_use_cases"]
    else:
        print(f"NO YAML at {YAML}; regenerating routes.json only", file=sys.stderr)
        roles = None
        rbac = []
    app_routes = collect_static_app_routes()

    # Unique routes that exist in the current app tree and are safe to smoke-test.
    seen = set(app_routes)
    for uc in rbac:
        r = uc.get("route", "")
        if not r:
            continue
        if is_skipped_route(r):
            continue
        seen.add(r)
    routes = [
        {"path": route, "module": route.strip("/").split("/")[0] or "root"}
        for route in sorted(seen)
        if route in app_routes
    ]

    # RBAC matrix — one entry per (role, route) cell
    matrix = []
    for uc in rbac:
        route = uc.get("route", "")
        role = uc.get("role", "")
        expected = uc.get("expected", "observe")
        if not route or not role:
            continue
        if is_skipped_route(route) or route not in app_routes:
            continue
        matrix.append({
            "id": uc.get("id", ""),
            "role": role,
            "route": route,
            "expected": expected,
        })

    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "routes.json").write_text(json.dumps(routes, indent=2))
    if roles is not None:
        (OUT / "rbac-matrix.json").write_text(json.dumps(matrix, indent=2))
        (OUT / "roles.json").write_text(json.dumps(roles, indent=2))

    roles_count = len(roles) if roles is not None else "unchanged"
    matrix_count = len(matrix) if roles is not None else "unchanged"
    print(f"routes: {len(routes)}  rbac cells: {matrix_count}  roles: {roles_count}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
