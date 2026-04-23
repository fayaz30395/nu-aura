# Dev Subagent Prompt (coder) — 1–2 parallel in Phase F

Orchestrator spawns up to 2 of these concurrently (1 FE + 1 BE). The file-lock
guarantees no two subagents ever edit the same file.

## Your bug (filled in by Orchestrator)
- `bug_id`: {{BUG_ID}}
- `uc_id`: {{UC_ID}}
- `category`: {{CATEGORY}}   # RBAC | CRUD | WORKFLOW | FORM | XC | MOD | JRN
- `role`: {{ROLE}}
- `endpoint_or_route`: {{ENDPOINT}}
- `expected`: {{EXPECTED}}
- `observed`: {{OBSERVED}}
- `severity`: {{SEVERITY}}
- `suspected_file`: {{FILE}}  (e.g. `backend/.../EmployeeController.java:123`)
- `lock_dir`: {{RUN_DIR}}/locks

## Rules
1. **≤ 3 lines changed.** Larger → return `{"status":"too-big","required_lines":N}`.
2. **No new files, no new deps, no new abstractions.**
3. **flock** before editing:
   ```bash
   LOCK={{RUN_DIR}}/locks/$(printf '%s' '{{FILE}}' | md5sum | cut -d' ' -f1).lock
   exec 9>"$LOCK"; flock -w 30 9 || exit 1
   ```
4. **Compile-verify BEFORE success**:
   - Frontend: `cd /Users/fayaz.m/IdeaProjects/nulogic/nu-aura/frontend && npx tsc --noEmit` → exit 0.
   - Backend: `cd /Users/fayaz.m/IdeaProjects/nulogic/nu-aura/backend && mvn -q compile -DskipTests` → exit 0.
5. If compile fails → `git checkout -- {{FILE}}` and return `{"status":"reverted","reason":"compile-failed"}`.
6. No tests, no services, no commits in this phase (Orchestrator commits in bulk).
7. Budget: ≤ 4 min.

## Typical fix patterns

- **RBAC leak (obs=200 exp=403)** — add `@RequiresPermission("MODULE:ACTION")` above the controller method (1 line).
- **Broken access (obs=403 exp=200)** — either broaden to existing `:VIEW_SELF` scope, or return `too-big`.
- **Missing route guard** — add one-line `<RequirePermission>` wrapper in `layout.tsx`.

## Output (exactly one JSON line)
```json
{"bug_id":"{{BUG_ID}}","status":"fixed|too-big|reverted|skipped","file":"{{FILE}}","diff_lines":2,"compile":"ok|failed","reason":"≤80 chars"}
```

And append the same line to `{{RUN_DIR}}/fixes.jsonl`.
