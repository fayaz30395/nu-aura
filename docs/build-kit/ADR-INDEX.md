# Architecture Decision Records (ADR) - Index

**Last Updated:** 2026-03-11

This directory contains Architecture Decision Records for critical architecture challenges in the
NU-AURA HRMS platform.

---

## Quick Navigation

### Summary Document

📄 **[Critical Architecture Challenges - Summary](./CRITICAL-ARCHITECTURE-CHALLENGES-SUMMARY.md)**

- Executive overview of all 5 challenges
- Consolidated implementation roadmap
- Resource allocation and cost analysis
- Success metrics and monitoring strategy

---

## Individual ADRs

### ADR-001: Theme Migration Consolidation

**Status:** Proposed | **Priority:** High (Quick Win) | **Effort:** 16 hours

📄 **[Read Full ADR](./ADR-001-THEME-CONSOLIDATION.md)**

**Problem:**

- 2,500+ duplicate `dark:` Tailwind classes
- Hydration mismatches causing theme flash
- No CSS variable system for dark mode

**Solution:**

- CSS Variables-First approach with semantic color tokens
- Server-side theme detection (cookies + middleware)
- Smooth 200ms theme transitions

**Impact:**

- 79% reduction in Tailwind classes
- 15-20KB smaller CSS bundle
- 100% elimination of hydration bugs

**Timeline:** 4 days

---

### ADR-002: JWT Token Size Optimization

**Status:** Proposed | **Priority:** Critical | **Effort:** 28 hours

📄 **[Read Full ADR](./ADR-002-JWT-TOKEN-OPTIMIZATION.md)**

**Problem:**

- JWT tokens up to 13.3 KB for admin users (50+ permissions)
- 1.35 MB network overhead per 100 API requests
- Can't use httpOnly cookies (4KB browser limit)

**Solution:**

- Minimal JWT payload (userId, tenantId, roles, sessionId)
- Redis permission cache with 1-hour TTL
- Cache invalidation on role/permission changes

**Impact:**

- 96% token size reduction (13 KB → 560 bytes)
- 96% network savings (1.35 MB → 56 KB per 100 requests)
- httpOnly cookie support for enhanced security

**Timeline:** 5 days

**Key Metrics:**

```promql
jwt_token_size_bytes_p99 < 1024
redis_cache_hit_rate > 0.95
```

---

### ADR-003: Payroll Saga Pattern Design

**Status:** Proposed | **Priority:** Critical | **Effort:** 80 hours

📄 **[Read Full ADR](./ADR-003-PAYROLL-SAGA-PATTERN.md)**

**Problem:**

- Payroll is single monolithic transaction
- Email failure causes entire payroll rollback
- No partial recovery or retry logic
- Database locked for 30-60s during run

**Solution:**

- Orchestration-based saga pattern
- 4-step workflow with idempotent operations
- Compensating transactions for rollback
- Event sourcing for audit trail

**Workflow:**

```
Step 1: Calculate Salaries
Step 2: Generate Payslips (idempotent)
Step 3: Send Notifications (best effort)
Step 4: Update Bank Queue
On Failure: Compensate in reverse order
```

**Impact:**

- 100% fault tolerance
- Eventual consistency (non-critical steps won't block completion)
- Complete audit trail
- Resumability from failure point

**Timeline:** 5 weeks

**Success Metrics:**

```promql
payroll_saga_success_rate > 0.99
payroll_saga_compensation_rate < 0.01
```

---

### ADR-004: Recruitment ATS Gap Analysis

**Status:** Proposed | **Priority:** Medium | **Effort:** 480 hours

📄 **[Read Full ADR](./ADR-004-RECRUITMENT-ATS-GAP-ANALYSIS.md)**

**Problem:**
Current recruitment module lacks:

- Visual pipeline/kanban board
- Offer letter generation with e-signatures
- Assessment integration (HackerRank, Codility)
- Communication hub (email tracking)
- Analytics dashboard

**Solution: 4-Phase Roadmap**

**Phase 1 (4 weeks):** Critical ATS Features

- Drag-and-drop kanban pipeline
- Offer letter templates + DocuSign integration
- SLA tracking

**Phase 2 (3 weeks):** Communication & Assessments

- Email template system
- HackerRank API integration
- Bulk communication

**Phase 3 (2 weeks):** Analytics

- Recruitment funnel dashboard
- Time-to-hire metrics
- Source effectiveness analysis

**Phase 4 (3 weeks):** Public Job Board

- Public job listings
- Application submission
- Candidate portal

**Impact:**

- 95% feature parity with Greenhouse/Lever
- Competitive differentiation via AI screening
- Complete ATS workflow

**Timeline:** 12 weeks (can parallelize with Saga work)

**Competitive Positioning:**
| Feature | Current | After Phase 1 | Greenhouse |
|---------|---------|---------------|------------|
| AI Screening | ✅ | ✅ | ✅ |
| Kanban Pipeline | ❌ | ✅ | ✅ |
| E-Signatures | ❌ | ✅ | ✅ |

---

### ADR-005: Database Connection Pool Sizing

**Status:** Proposed | **Priority:** Immediate | **Effort:** 8 hours

📄 **[Read Full ADR](./ADR-005-DATABASE-CONNECTION-POOL-SIZING.md)**

**Problem:**

- Current pool: 10 connections (dev) / 20 connections (prod)
- 100 concurrent users need ~100 connections
- 90% of requests queued (9-second wait times)
- Database underutilized (10% CPU)

**Solution: Environment-Specific Sizing**

| Environment | Max Pool | Purpose                |
|-------------|----------|------------------------|
| Development | 5        | Local testing          |
| Staging     | 30       | Performance validation |
| Production  | 60       | 100+ concurrent users  |

**Formula:**

```
max_pool_size = (peak_requests / avg_db_time) * buffer
              = (100 / 0.2s) * 1.2 = 60
```

**Additional Optimizations:**

- Connection leak detection (30s threshold)
- Keep-alive queries (prevent stale connections)
- Aggressive timeouts (8s)

**Impact:**

- 6x connection pool increase (10 → 60)
- 97.8% latency reduction (9s → 200ms at p95)
- 99.7% fewer timeouts (30% → 0.1%)
- Optimal DB utilization (10% → 40-60% CPU)

**Timeline:** 1 week

**Monitoring:**

```promql
hikaricp_connections_pending > 5  # Alert
rate(hikaricp_connections_timeout_total[5m]) > 0.001  # Alert
```

---

## Implementation Sequence

### Recommended Priority Order

1. **Week 1:** ADR-005 (Database Connection Pooling) - **IMMEDIATE**

- Fastest ROI (8 hours → 97% improvement)
- Blocks production scalability
- No code changes, just configuration

2. **Week 2:** ADR-001 (Theme Migration) - **Quick Win**

- Improves developer velocity
- Eliminates hydration bugs
- Small effort, high long-term benefit

3. **Week 3:** ADR-002 (JWT Optimization) - **Security**

- Enables httpOnly cookie security
- Reduces mobile data usage
- Requires Redis (already in stack)

4. **Week 4-8:** ADR-003 (Saga Pattern) - **Data Integrity**

- Critical for production payroll reliability
- Can run in parallel with ATS work
- Requires significant design & testing

5. **Week 4-16:** ADR-004 (ATS Gaps) - **Feature Parity**

- Largest effort (parallelizable)
- Phased delivery (Phase 1 critical)
- Requires external vendor contracts

---

## Summary Metrics

| Metric                     | Current   | After ADRs | Improvement      |
|----------------------------|-----------|------------|------------------|
| JWT Token Size (Admin)     | 13.3 KB   | 560 bytes  | 96% smaller      |
| API Latency (p95)          | 9 seconds | 200ms      | 97.8% faster     |
| Theme Class Count          | 2,500+    | ~500       | 80% reduction    |
| Concurrent Users Supported | 10        | 100+       | 10x increase     |
| ATS Feature Parity         | 40%       | 95%        | +55% features    |
| Payroll Fault Tolerance    | 0%        | 99%+       | Production-ready |

**Total Implementation:**

- **Timeline:** 12 weeks (with parallel execution)
- **Effort:** 612 hours
- **Team:** 2-4 engineers
- **Infrastructure Cost:** +$445/month
- **Development Cost:** $45,900 (one-time)

---

## Document Status

| ADR     | Status   | Owner                   | Last Updated |
|---------|----------|-------------------------|--------------|
| ADR-001 | Proposed | Frontend Team           | 2026-03-11   |
| ADR-002 | Proposed | Backend Security Team   | 2026-03-11   |
| ADR-003 | Proposed | Backend Core Team       | 2026-03-11   |
| ADR-004 | Proposed | Recruitment Module Team | 2026-03-11   |
| ADR-005 | Proposed | Infrastructure Team     | 2026-03-11   |

---

## Approval Tracking

### Required Approvals

- [x] Architecture Team Review (2026-03-11)
- [ ] Product Team Approval (ATS roadmap)
- [ ] Infrastructure Team Approval (DB upgrade, Redis)
- [ ] Finance Approval (3rd-party vendors: DocuSign, HackerRank)
- [ ] Security Team Review (JWT changes, e-signature integration)

### Next Steps

1. **Week 0:** Finalize vendor contracts, provision Redis, set up monitoring
2. **Week 1:** Start ADR-005 (DB pooling) - HIGHEST PRIORITY
3. **Weeks 2-3:** Quick wins (Theme, JWT)
4. **Weeks 4+:** Long-running projects (Saga, ATS)

---

## Related Documentation

- [System Overview](./01_SYSTEM_OVERVIEW.md)
- [Microservice Architecture](./03_MICROSERVICE_ARCHITECTURE.md)
- [Database Schema Design](./05_DATABASE_SCHEMA_DESIGN.md)
- [Observability Strategy](./15_OBSERVABILITY.md)

---

**Document Owner:** Architecture Team
**Maintained By:** Backend Lead, Frontend Lead, Infrastructure Lead
**Review Frequency:** After each ADR implementation completion
