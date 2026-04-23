#!/usr/bin/env python3
"""
Stratified sampler for the NU-AURA use-case catalog.

Reads docs/qa/use-cases.yaml, emits <run_dir>/uc-plan.jsonl (one JSON line per
UC to execute, with run_mode ∈ {api, browser, static}). Deterministic: same
inputs → same plan.

Usage:
    python3 stratify.py --mode=smoke --out=<path>
    python3 stratify.py --mode=full --out=<path>
    python3 stratify.py --mode=category --filter=RBAC --out=<path>
    python3 stratify.py --mode=role --filter=EMPLOYEE --out=<path>
    python3 stratify.py --mode=uc --filter=UC-WF-0001,UC-WF-0002 --out=<path>
"""
from __future__ import annotations
import argparse, json, sys
from pathlib import Path

try:
    import yaml
except ImportError:
    sys.exit("PyYAML required: pip3 install pyyaml")

HERE = Path(__file__).resolve().parent
CATALOG = HERE.parents[3] / "docs" / "qa" / "use-cases.yaml"

# Which categories execute as API vs browser vs static.
# Static = checks that need no running browser and no login (grep, code scan).
CATEGORY_MODE = {
    "rbac_use_cases": "api",
    "crud_use_cases": "api",
    "workflow_use_cases": "browser",   # multi-actor state; browser is the clearest signal
    "form_use_cases": "browser",
    "cross_cutting_use_cases": "mixed",  # decided per-UC
    "module_use_cases": "browser",
    "journey_use_cases": "browser",
}

# Default --smoke per-category caps (keeps parent conversation finite)
SMOKE_CAPS = {
    "rbac_use_cases": 40,
    "crud_use_cases": 20,
    "workflow_use_cases": 10,
    "form_use_cases": 8,
    "cross_cutting_use_cases": 10,
    "module_use_cases": 6,
    "journey_use_cases": 6,
}

# For cross-cutting, subcategory → run_mode
XC_MODE = {
    "auth_session": "api",
    "tenant_isolation": "api",
    "concurrency": "api",
    "observability": "api",
    "performance": "browser",
    "design_system": "static",
    "a11y": "browser",
    "security": "api",
    "i18n": "browser",
    "platform": "browser",
}


def stable_pick(items: list, k: int) -> list:
    """Deterministic subset — evenly spaced across the list."""
    if k >= len(items):
        return list(items)
    step = len(items) / k
    return [items[int(i * step)] for i in range(k)]


def smoke_plan(catalog: dict) -> list[dict]:
    plan = []
    for key, cap in SMOKE_CAPS.items():
        bucket = catalog.get(key, []) or []
        chosen = stable_pick(bucket, cap)
        for uc in chosen:
            plan.append(to_plan_line(uc, key))
    return plan


def full_plan(catalog: dict) -> list[dict]:
    plan = []
    for key in CATEGORY_MODE:
        for uc in catalog.get(key, []) or []:
            plan.append(to_plan_line(uc, key))
    return plan


def category_plan(catalog: dict, category: str) -> list[dict]:
    """category like 'RBAC', 'CRUD', 'WORKFLOW', 'FORM', 'XC', 'MOD', 'JRN'."""
    key_by_cat = {
        "RBAC": "rbac_use_cases",
        "CRUD": "crud_use_cases",
        "WORKFLOW": "workflow_use_cases",
        "FORM": "form_use_cases",
        "XC": "cross_cutting_use_cases",
        "MOD": "module_use_cases",
        "JRN": "journey_use_cases",
    }
    key = key_by_cat[category.upper()]
    return [to_plan_line(uc, key) for uc in catalog.get(key, []) or []]


def role_plan(catalog: dict, role: str) -> list[dict]:
    plan = []
    for key in CATEGORY_MODE:
        for uc in catalog.get(key, []) or []:
            actors = [uc.get("role"), uc.get("actor")]
            if role in actors:
                plan.append(to_plan_line(uc, key))
    return plan


def uc_plan(catalog: dict, ids: list[str]) -> list[dict]:
    wanted = set(ids)
    plan = []
    for key in CATEGORY_MODE:
        for uc in catalog.get(key, []) or []:
            if uc.get("id") in wanted:
                plan.append(to_plan_line(uc, key))
    return plan


_OP_METHOD = {
    "create": "POST", "read_list": "GET", "read_one": "GET",
    "update": "PUT", "delete": "DELETE",
}

def _resolve_http_expect(uc: dict) -> str | None:
    """
    Map catalog's access semantics (`expected`, `expected_access`) to numeric
    HTTP code so subagents can score with a plain integer comparison.
    Leaves existing numeric `http_expect` untouched.
    """
    he = uc.get("http_expect")
    if he is not None:
        # Already numeric — pass through, strip any unit
        return str(he)
    op = uc.get("operation", "read_list")
    access = uc.get("expected_access") or uc.get("expected")
    if not access:
        return None
    access = str(access)
    # Denials
    if access in ("deny", "deny_403"):
        return "403"
    if access == "deny_redirect":
        # Page-level RBAC redirect manifests as 403 on the underlying API
        return "403"
    # Allows — code depends on op
    if access in ("allow", "allow_scoped", "allow_self"):
        if op == "create":   return "201"
        if op == "delete":   return "204"
        return "200"
    return None


def to_plan_line(uc: dict, cat_key: str) -> dict:
    """Project a catalog UC into a plan line with run_mode + method + http_expect resolved."""
    mode = CATEGORY_MODE[cat_key]
    if mode == "mixed":  # cross-cutting
        sub = uc.get("subcategory", "")
        mode = XC_MODE.get(sub, "browser")
    out = {
        "uc_id": uc["id"],
        "category": uc.get("category", cat_key.replace("_use_cases", "").upper()),
        "run_mode": mode,
    }
    # Carry over role/actor so subagents can filter
    for k in ("role", "actor", "route", "api_path", "operation", "entity",
             "module", "sub_app", "form", "workflow", "step", "check",
             "expected", "http_expect", "expected_access", "severity_on_fail"):
        if k in uc:
            out[k] = uc[k]
    # Resolve method from operation so subagents can switch -X
    if "operation" in uc:
        out["method"] = _OP_METHOD.get(uc["operation"], "GET")
    else:
        out["method"] = "GET"
    # Resolve numeric http_expect so subagents don't need the catalog
    resolved = _resolve_http_expect(uc)
    if resolved is not None:
        out["http_expect"] = resolved
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--mode", required=True,
                    choices=["smoke", "full", "category", "role", "uc"])
    ap.add_argument("--filter", default="")
    ap.add_argument("--out", required=True)
    args = ap.parse_args()

    catalog = yaml.safe_load(CATALOG.read_text())
    if args.mode == "smoke":
        plan = smoke_plan(catalog)
    elif args.mode == "full":
        plan = full_plan(catalog)
    elif args.mode == "category":
        plan = category_plan(catalog, args.filter)
    elif args.mode == "role":
        plan = role_plan(catalog, args.filter)
    elif args.mode == "uc":
        plan = uc_plan(catalog, args.filter.split(","))

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    with out.open("w") as f:
        for p in plan:
            f.write(json.dumps(p) + "\n")

    # Summary to stdout
    by_mode = {}
    by_cat = {}
    for p in plan:
        by_mode[p["run_mode"]] = by_mode.get(p["run_mode"], 0) + 1
        by_cat[p["category"]] = by_cat.get(p["category"], 0) + 1
    print(f"PLAN wrote {len(plan)} UCs to {out}")
    print(f"  by_mode: {by_mode}")
    print(f"  by_category: {by_cat}")


if __name__ == "__main__":
    main()
