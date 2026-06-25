---
title: Graphify Code Graph
tags: [knowledge-graph, graphify, code-map, tooling]
updated: 2026-06-25
summary: "Local graphify code graph snapshot and usage guide for source-level navigation."
---

# Graphify Code Graph

## Purpose

`graphify-out/` is the local code graph for NU-AURA. It is a code-only corpus used to
answer source-location questions such as "where is this defined?", "what imports this?",
and "what does this node connect to?" Use it with the Obsidian vault: Obsidian explains
the system, graphify locates concrete code nodes.

## Current Snapshot

Built on 2026-06-25 with:

```bash
graphify update .
```

| Metric | Value |
|---|---:|
| Files extracted | 7,204 |
| Nodes | 58,943 |
| Edges | 142,248 |
| Communities | 3,765 |
| Extraction mix | 92% extracted, 8% inferred |
| Built from commit | `da01fd4c` |
| Output | `graphify-out/graph.json`, `graphify-out/GRAPH_REPORT.md` |

The HTML visualization was skipped because the graph is larger than the default 5,000-node
visualization limit.

## Scope

The project `.graphifyignore` excludes docs, Markdown, PDFs, images, generated build output,
`node_modules`, `.next`, `target`, `graphify-out`, and `.claude-flow`. This keeps the graph
focused on source code and scripts.

## Useful Commands

| Need | Command |
|---|---|
| Refresh after code changes | `graphify update .` |
| Read graph report | `sed -n '1,260p' graphify-out/GRAPH_REPORT.md` |
| Explain exact node | `graphify explain "SecurityConfig"` |
| Trace shortest path | `graphify path "A" "B"` |
| Ask traversal query | `graphify query "question" --budget 2500` |
| Generate tree HTML | `graphify tree --label nu-aura` |

## Exact Node Evidence From This Pass

| Node | Source location | Why it matters |
|---|---|---|
| `PLATFORM_APPS` | `frontend/lib/config/apps.ts L40` | Defines the four app records, app entry routes, route prefixes, and permission prefixes |
| `SecurityConfig` | `backend/src/main/java/com/nulogic/common/config/SecurityConfig.java L37` | Defines Spring Security filters, public endpoints, CORS, headers, and auth policy |
| `AuthController` | `backend/src/main/java/com/nulogic/api/auth/controller/AuthController.java L27` | Handles login, refresh, MFA, logout, password, and current-user auth endpoints |

## Observed Limitations

- Broad natural-language graph queries can start from noisy nodes. Prefer exact-node explains
  when you already know a class, function, or constant name.
- The graph is a point-in-time snapshot. Compare `git rev-parse HEAD` to the report's
  `Built from commit` before using graph facts in a release note.
- The graph excludes docs by design. Use [[00-Home]] and [[Product-Delivery-Index]] for prose.

## Recommended Workflow

1. Read the relevant Obsidian note for the system concept.
2. Use `graphify explain "<exact node>"` for the source location and neighbors.
3. Open the source file before making claims or edits.
4. Refresh the graph after large code changes.
5. Update this note only when the graph is rebuilt or the workflow changes.

## Related

- [[Module-Relationships]]
- [[Data-Flows]]
- [[Feature-Traceability]]
- [[Application-Map]]
- [[Product-Architecture]]
