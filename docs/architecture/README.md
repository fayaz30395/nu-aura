# Architecture

Topic-grouped architecture documentation for NU-AURA. Merged from the former `docs/build-kit/` tree during Phase 2 of the 2026-05-13 repo layout cleanup.

## Top-level docs

| Doc                                                | Topic                                                            |
|----------------------------------------------------|------------------------------------------------------------------|
| [`mental-model.md`](mental-model.md)               | Code-grounded mental model (read this first)                     |
| [`improvement-backlog.md`](improvement-backlog.md) | Tracked gaps & fixes (status-tagged, paired with mental-model)   |
| [`master-plan.md`](master-plan.md)                 | Build-kit master plan (00)                                       |
| [`system-overview.md`](system-overview.md)         | System overview (01)                                             |
| [`modules.md`](modules.md)                         | Module architecture (02)                                         |
| [`microservices.md`](microservices.md)             | Microservice architecture (03)                                   |
| [`events.md`](events.md)                           | Event-driven architecture (10)                                   |
| [`devops.md`](devops.md)                           | DevOps architecture (14)                                         |
| [`observability.md`](observability.md)             | Observability (formerly `OBSERVABILITY.md`)                      |
| [`observability-spec.md`](observability-spec.md)   | Observability spec (build-kit 15; complements observability.md)  |
| [`testing-strategy.md`](testing-strategy.md)       | Testing strategy (16)                                            |
| [`ai-execution-plan.md`](ai-execution-plan.md)     | 7-day AI execution plan (17)                                     |

## Topic subfolders

| Folder                                                                   | Contents                                |
|--------------------------------------------------------------------------|-----------------------------------------|
| [`rbac/`](rbac/)                                                         | Permission matrix (build-kit 04)        |
| [`database/`](database/)                                                 | Schema design (build-kit 05)            |
| [`payroll/`](payroll/)                                                   | Payroll rule engine (build-kit 06)      |
| [`leave/`](leave/)                                                       | Leave policy engine (build-kit 07)      |
| [`workflow/`](workflow/)                                                 | Approval workflow engine (build-kit 08) |
| [`org/`](org/)                                                           | Organisation hierarchy engine (build-kit 09) |
| [`api/`](api/)                                                           | API standards (build-kit 11)            |
| [`frontend/`](frontend/)                                                 | Frontend architecture, UI system, security, MFA, RBAC test patterns, websocket integration, design-system-redesign |
| [`backend-assets/`](backend-assets/)                                     | Backend doc images (logos, symbols)     |

## Reference docs (already canonical, kept as-is)

| Doc                                                              | Topic                                       |
|------------------------------------------------------------------|---------------------------------------------|
| [`api-contracts.md`](api-contracts.md)                           | API contracts                               |
| [`architecture-analysis.md`](architecture-analysis.md)           | Holistic architecture analysis              |
| [`architecture-scorecard.md`](architecture-scorecard.md)         | Maturity scorecard                          |
| [`backend.md`](backend.md)                                       | Backend overview                            |
| [`class-analysis.md`](class-analysis.md)                         | Class-level analysis                        |
| [`design.md`](design.md)                                         | Design notes                                |
| [`erd.md`](erd.md)                                               | Entity-relationship diagram                 |
| [`features.md`](features.md)                                     | Feature catalogue                           |
| [`frontend-overview.md`](frontend-overview.md)                   | Frontend overview                           |
| [`granular-instructions.md`](granular-instructions.md)           | Granular implementation instructions        |
| [`requirements.md`](requirements.md)                             | Requirements                                |
| [`rethink.md`](rethink.md)                                       | Rethink/refactor notes                      |
| [`security-controls.md`](security-controls.md)                   | Security controls                           |
| [`self-heal.md`](self-heal.md)                                   | Self-healing patterns                       |
| [`skills.md`](skills.md)                                         | Skills inventory                            |
| [`sprint-history.md`](sprint-history.md)                         | Sprint history                              |
| [`technical-baseline.md`](technical-baseline.md)                 | Technical baseline                          |

## Decisions

ADRs live in [`../adr/`](../adr/). See the ADR README for the full index (ADR-001..009).
