---
title: Product Delivery Index
tags: [product, delivery, index, prd, wbs, user-manual]
updated: 2026-06-25
summary: "Stakeholder-facing documentation hub for NU-AURA: product map, PRD, WBS, architecture narrative, user manual, and traceability links into the engineering vault."
---

# Product Delivery Index

## Purpose

This section turns the engineering-heavy NU-AURA vault into a stakeholder-facing product
package. It does not replace the detailed source-of-truth notes; it points to them and
summarizes them for product, delivery, onboarding, sales, QA, and implementation planning.

Use this section when you need to explain what NU-AURA is, what it must do, how work should be
sequenced, how users operate it, and where to verify each claim in the existing vault.

## Document Set

| Document | Use it for | Deep source |
|---|---|---|
| [[Application-Map]] | Whole-product map, app/module boundaries, source snapshot, graph diagrams | [[System-Overview]], [[Module-Relationships]], [[Feature-Traceability]] |
| [[Product-Requirements-Document]] | Product scope, personas, requirements, acceptance criteria, non-goals | [[Nu-HRMS]], [[Nu-Hire]], [[Nu-Grow]], [[Nu-Fluence]], [[Shared-Platform]] |
| [[Work-Breakdown-Structure]] | Delivery planning, work packages, sequencing, exit criteria | [[Test-Catalog]], [[Deployment]], [[Security-Audit]] |
| [[Product-Architecture]] | Stakeholder architecture narrative with focused Mermaid diagrams | [[C4-Context]], [[C4-Container]], [[C4-Component]], [[Data-Flows]] |
| [[User-Manual]] | Role-oriented usage guide for day-to-day operation | [[Routes]], [[Pages]], [[RBAC-Matrix]] |
| [[Graphify-Code-Graph]] | Local code graph snapshot, refresh commands, exact-node lookup workflow | `graphify-out/GRAPH_REPORT.md` |

## Evidence Baseline

This section was created from the current checkout on 2026-06-25.

| Evidence | Current value | Source |
|---|---:|---|
| Frontend pages | 290 | `find frontend/app -name page.tsx` |
| Raw `@RestController` files | 184 | `rg -l "@RestController" backend/src/main/java/com/nulogic` |
| Backend application contexts | 70 | `find backend/src/main/java/com/nulogic/application -maxdepth 1 -mindepth 1 -type d` |
| Flyway migration files | 305 | `find backend/src/main/resources/db/migration -name 'V*.sql'` |
| Highest Flyway version | V316 | migration filename sweep |
| Graphify code graph | 58,943 nodes / 142,248 edges | [[Graphify-Code-Graph]] |

These counts supersede older point-in-time counts only for this document set. The exhaustive
leaf catalogs remain the linked source of truth and should be re-reconciled before a release
claim.

## How To Use

1. Start with [[Application-Map]] for the high-level product picture.
2. Use [[Product-Requirements-Document]] to align product intent and acceptance criteria.
3. Use [[Work-Breakdown-Structure]] to plan delivery waves and validation gates.
4. Use [[Product-Architecture]] to explain implementation shape to technical stakeholders.
5. Give [[User-Manual]] to pilot users and support teams.
6. Use [[Graphify-Code-Graph]] when locating concrete source nodes or refreshing the code graph.

## Related

- [[00-Home]]
- [[Documentation-Coverage-Report]]
- [[System-Overview]]
- [[Feature-Traceability]]
- [[Graphify-Code-Graph]]
