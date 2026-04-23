#!/usr/bin/env python3
"""
Regenerate docs/qa/use-cases.yaml from ground truth:
  - Next.js App Router page.tsx files under frontend/app/**
  - Backend controller @RequestMapping base paths grepped from the Java source

This replaces the stale use-cases.yaml where 17/40 routes were ghost and 202 real routes had no coverage.

Usage: python3 docs/qa/regenerate-use-cases.py > docs/qa/use-cases.v2.yaml

The output is an observational RBAC matrix — no pre-judged allow/deny. Each entry
records (role, route, expected=observe). The QA loop then records actual HTTP
status and flags anything that looks suspicious (e.g. EMPLOYEE getting 200 on /admin/*).
"""
import os, re, subprocess, sys, datetime
from collections import defaultdict

REPO = "/Users/fayaz.m/IdeaProjects/nulogic/nu-aura"
FRONTEND_APP = f"{REPO}/frontend/app"
BACKEND_SRC  = f"{REPO}/backend/src/main/java"

# ─────────────────────────────── Frontend route tree ───────────────────────────────
def iter_frontend_routes():
    for root, dirs, files in os.walk(FRONTEND_APP):
        # Skip internal app-router groups like (.)
        if "node_modules" in root: continue
        if "page.tsx" in files:
            rel = os.path.relpath(root, FRONTEND_APP)
            if rel == ".":
                yield "/"
            else:
                # Keep parameterized segments visible as [param] so users can still see them
                yield "/" + rel

# ─────────────────────────────── Backend controller paths ──────────────────────────
CONTROLLER_BASE_RE = re.compile(r'@RequestMapping\(\s*"(/api/v1/[^"]+)"\s*\)')
METHOD_MAPPING_RE  = re.compile(r'@(Get|Post|Put|Delete|Patch)Mapping\(\s*"([^"]*)"\s*\)')
CLASS_ANNOTATION_RE = re.compile(r'^\s*public\s+class\s+(\w+)', re.M)

def iter_backend_endpoints():
    for root, _, files in os.walk(BACKEND_SRC):
        if "/test/" in root: continue
        for f in files:
            if not f.endswith("Controller.java"): continue
            path = os.path.join(root, f)
            try:
                src = open(path).read()
            except Exception: continue
            base_match = CONTROLLER_BASE_RE.search(src)
            if not base_match: continue
            base = base_match.group(1).rstrip("/")
            for m in METHOD_MAPPING_RE.finditer(src):
                verb = m.group(1).upper()
                sub = m.group(2).strip()
                yield f"{verb} {base}{('/' + sub.lstrip('/')) if sub else ''}", f

# ─────────────────────────────── YAML emitter ──────────────────────────────────────
ROLES = [
    ("SUPER_ADMIN",       "fayaz.m@nulogic.io",              100),
    ("TENANT_ADMIN",      "deepak@nulogic.io",                95),
    ("HR_ADMIN",          "priya@nulogic.io",                 90),
    ("HR_MANAGER",        "jagadeesh@nulogic.io",             85),
    ("RECRUITMENT_ADMIN", "suresh@nulogic.io",                80),
    ("FINANCE_ADMIN",     "bharath@nulogic.io",               75),
    ("MANAGER",           "sumit@nulogic.io",                 70),
    ("TEAM_LEAD",         "mani@nulogic.io",                  65),
    ("EMPLOYEE",          "saran@nulogic.io",                 60),
]

def main():
    routes = sorted(set(iter_frontend_routes()))
    # iter_backend_endpoints yields (endpoint_string, source_file) tuples — take [0]
    endpoints = sorted({ep for ep, _ in iter_backend_endpoints()})

    # Plain (non-parameterized) routes to probe in the QA loop.
    plain_routes = [r for r in routes if "[" not in r]
    dynamic_routes = [r for r in routes if "[" in r]

    out = []
    out.append("# NU-AURA use cases v2 — REGENERATED from ground truth")
    out.append(f"# Generated: {datetime.date.today().isoformat()}")
    out.append(f"# Regenerate via: python3 docs/qa/regenerate-use-cases.py > docs/qa/use-cases.v2.yaml")
    out.append(f"#")
    out.append(f"# Counts: frontend routes = {len(routes)} ({len(plain_routes)} plain + {len(dynamic_routes)} dynamic)")
    out.append(f"#         backend endpoints = {len(endpoints)}")
    out.append(f"#         roles = {len(ROLES)}")
    out.append(f"#         UC-RBAC total = {len(plain_routes) * len(ROLES)}")
    out.append(f"#         UC-API total = {len([e for e in endpoints if e.startswith('GET ')]) * len(ROLES)}")
    out.append("")
    out.append("metadata:")
    out.append('  schema_version: "3.0.0"')
    out.append('  app: "NU-AURA"')
    out.append(f'  generated: "{datetime.date.today().isoformat()}"')
    out.append('  backend_base: "http://localhost:8080"')
    out.append('  frontend_base: "http://localhost:3000"')
    out.append("")
    out.append("roles:")
    for code, email, level in ROLES:
        out.append(f"  - code: {code}")
        out.append(f"    level: {level}")
        out.append(f'    email: "{email}"')
    out.append("")

    # UC-RBAC from real frontend routes
    out.append("# ───────────────────────── UC-RBAC (frontend route × role) ─────────────────────────")
    out.append("rbac_use_cases:")
    uc_id = 1
    for route in plain_routes:
        for role_code, _, _ in ROLES:
            out.append(f"  - id: UC-RBAC-{uc_id:04d}")
            out.append(f'    title: "{role_code} navigates {route}"')
            out.append(f'    role: {role_code}')
            out.append(f'    route: "{route}"')
            out.append(f'    expected: observe  # record actual; loop flags admin-scope violations')
            uc_id += 1
    out.append("")

    # UC-API from real backend endpoints (GET-only for safe sweep)
    out.append("# ───────────────────────── UC-API (backend GET × role) ─────────────────────────")
    out.append("api_use_cases:")
    uc_id = 1
    for ep in endpoints:
        if not ep.startswith("GET "): continue
        for role_code, _, _ in ROLES:
            path = ep[4:]
            out.append(f"  - id: UC-API-{uc_id:05d}")
            out.append(f'    title: "{role_code} GET {path}"')
            out.append(f'    role: {role_code}')
            out.append(f'    endpoint: "{path}"')
            out.append(f'    method: GET')
            out.append(f'    expected: observe')
            uc_id += 1
    out.append("")

    # Dynamic routes catalog (informational — not in sweep)
    out.append("# ───────────────────────── Dynamic routes (informational) ─────────────────────────")
    out.append("dynamic_routes:")
    for r in dynamic_routes:
        out.append(f'  - "{r}"')

    print("\n".join(out))

if __name__ == "__main__":
    main()
