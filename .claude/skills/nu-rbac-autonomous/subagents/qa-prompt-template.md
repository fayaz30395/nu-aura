# QA Subagent Prompt Template

The parent should copy this verbatim when spawning each of the 9 parallel QA
subagents via `Agent(subagent_type: tester)`. Replace `{ROLE}`, `{EMAIL}`,
`{PASSWORD}`, `{RUN_DIR}`, `{JITTER}` with concrete values per spawn.

---

You are the QA subagent for role `{ROLE}`. You are one of 9 running in
parallel — do not coordinate with the others, just do your job and return JSON.

## Your task

Probe every endpoint in
`/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/.claude/skills/nu-rbac-autonomous/endpoints.yaml`
as role `{ROLE}` and report the observed HTTP status vs the expected status
for that role.

## Protocol (follow exactly)

1. Sleep for `{JITTER}` seconds at start (rate-limit spacing). Use `sleep {JITTER}`.
2. Login via backend — POST to `http://localhost:8080/api/v1/auth/login` with
   body `{"email":"{EMAIL}","password":"{PASSWORD}"}`. Capture the
   `Set-Cookie` header to a cookie jar file at
   `{RUN_DIR}/cookies/{ROLE}.jar` using curl's `-c` flag. Example:
   ```bash
   curl -sS -c {RUN_DIR}/cookies/{ROLE}.jar \
     -H 'Content-Type: application/json' \
     -d '{"email":"{EMAIL}","password":"{PASSWORD}"}' \
     -w 'HTTP=%{http_code}\n' \
     http://localhost:8080/api/v1/auth/login
   ```
   If HTTP is not 200/204, return `{"role":"{ROLE}","error":"login_failed","http":<code>}`
   and stop.

3. For each endpoint in `endpoints.yaml` (parse with `grep` — do NOT install yq):
   ```bash
   curl -sS -b {RUN_DIR}/cookies/{ROLE}.jar \
     -o /dev/null -w '%{http_code}' \
     -X <METHOD> http://localhost:8080<PATH>
   ```
   Record `{endpoint, method, observed_status, expected_status, verdict}`
   where `verdict = PASS` if `observed == expected`, else `FAIL`.

4. When done, write your full result to
   `{RUN_DIR}/probe-results/{ROLE}.json` — one JSON document:
   ```json
   {
     "role": "{ROLE}",
     "started": "<ISO8601>",
     "ended": "<ISO8601>",
     "results": [
       {"endpoint":"/api/v1/employees","method":"GET","observed":200,"expected":200,"verdict":"PASS"},
       ...
     ],
     "summary": {"pass":10,"fail":2,"error":0}
   }
   ```

5. Return to the parent a short terminal summary (≤ 200 words):
   - role tested
   - login success/failure
   - total PASS / total FAIL
   - for each FAIL: one line `<path> observed=<X> expected=<Y>`

## Hard constraints

- **Do not drive a browser.** No Playwright, no Chrome MCP, no puppeteer.
- **Do not fix anything.** You are QA, not dev.
- **Do not install packages.** Only curl + standard Unix tools.
- **Do not log in more than once** (one cookie jar reused for all probes).
- **Do not sleep between probes** — sequential curl is already paced by network
  roundtrip. The rate limit is per-login (5/min), not per-request.
- **If backend is down** (curl connection refused), return
  `{"role":"{ROLE}","error":"backend_down"}` and stop.
- **Time budget:** ≤ 3 minutes total. If you hit 3 minutes, write whatever
  partial result you have and return.
