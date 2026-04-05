# NU-AURA Team Role Skills - Summary

## ✅ Completed Skills

### 1. Engineering Manager / Tech Lead

**File**: `01-engineering-manager-tech-lead.md`
**Size**: ~8,500 words
**Key Topics**:

- Sprint planning & execution
- Architectural consistency
- Code review standards
- Team leadership & mentorship
- Risk management
- Technical debt management

### 2. Product Manager

**File**: `02-product-manager.md`
**Size**: ~9,200 words
**Key Topics**:

- RICE prioritization framework
- User story templates
- Quarterly OKR planning
- Go-to-market strategy
- Customer personas
- Competitive analysis
- Feature specification process

### 3. Senior Backend Engineer - Core Platform

**File**: `03-senior-backend-core-platform.md`
**Size**: ~11,000 words
**Key Topics**:

- Multi-tenant RLS (PostgreSQL)
- RBAC system (500+ permissions)
- Approval workflow engine
- Kafka event pipeline
- Scheduled jobs (24 jobs)
- Performance optimization
- Observability & monitoring

## 🔄 Remaining Skills (To Be Created)

The following skills need to be created with similar depth and detail:

### Backend Engineering

**4. Backend Engineer - NU-HRMS + Payroll**
Focus Areas:

- Payroll engine (SpEL formulas, DAG evaluation)
- Leave accrual system
- Tax calculation (PF, ESI, PT, TDS, Form 16)
- Attendance tracking
- Benefits administration
- Asset management
- Document management

**5. Backend Engineer - NU-Hire + NU-Grow**
Focus Areas:

- Recruitment pipeline (ATS logic)
- Interview scheduling (Google Calendar integration)
- Onboarding workflows
- Offboarding process
- Performance review system
- OKR tracking
- LMS integration
- 360 feedback

**6. Backend Engineer - NU-Fluence** (Phase 2)
Focus Areas:

- Elasticsearch integration
- Wiki content management
- Blog system
- Template library
- Drive integration (Google Drive, OneDrive)
- Full-text search
- Version control

### Frontend Engineering

**7. Senior Frontend Engineer - Platform**
Focus Areas:

- Design system (Mantine UI)
- App switcher (waffle grid)
- Auth flows (JWT, Google OAuth)
- Sidebar navigation
- Form patterns (React Hook Form + Zod)
- React Query hooks
- Shared components

**8. Frontend Engineer - NU-HRMS**
Focus Areas:

- Employee management UI
- Attendance tracking UI
- Leave request forms
- Payroll views (payslips, salary breakdown)
- Benefits UI
- Asset tracking
- Document management

**9. Frontend Engineer - NU-Hire + NU-Grow**
Focus Areas:

- ATS pipeline (drag-and-drop)
- Candidate cards
- Interview scheduling UI
- Onboarding checklists
- Performance review forms
- OKR tracking UI
- Survey builder
- Recognition system

### Infrastructure & QA

**10. DevOps Engineer**
Focus Areas:

- Docker Compose (8 services)
- Kubernetes manifests (10 manifests, GKE)
- Prometheus + Grafana (28 alert rules, 19 SLOs)
- CI/CD pipeline (.github/workflows/ci.yml)
- MinIO storage management
- Kafka cluster management
- Database operations (Neon dev, PostgreSQL 16 prod)

**11. QA Engineer**
Focus Areas:

- E2E testing (Playwright/Cypress)
- Tenant isolation validation
- RBAC edge case testing
- Payroll calculation validation
- Approval workflow testing
- API testing (Postman/Rest Assured)
- Test automation (200+ routes)

### Design & Domain

**12. UI/UX Designer**
Focus Areas:

- Design system ownership (Mantine-based)
- Mockup creation (Figma)
- Enterprise B2B SaaS patterns
- Data-heavy table designs
- Complex form layouts
- Dashboard design
- Consistency across 4 sub-apps

**13. HR Domain Expert**
Focus Areas:

- Indian payroll compliance (PF, ESI, PT, TDS, gratuity)
- Leave policy rules
- Statutory requirements (India, global)
- Tax regulations
- Labor law compliance
- Industry best practices
- Audit support

## Usage Instructions

### For Engineers

1. **Read your primary role skill first** - Understand your core responsibilities
2. **Cross-reference related skills** - Understand dependencies with other roles
3. **Update skills as patterns evolve** - Document new patterns you discover
4. **Use for onboarding new team members** - Share relevant role skills

### For Managers

1. **Use for hiring** - Skills define required expertise
2. **Use for performance reviews** - Skills define success criteria
3. **Use for capacity planning** - Skills show workload distribution
4. **Use for knowledge transfer** - Skills document critical patterns

## Skill Maintenance

**Update Frequency**: Quarterly or when major architectural changes occur

**Who Updates**:

- Engineering Manager reviews all skills
- Each engineer maintains their own role skill
- Product Manager maintains PM skill

**Review Process**:

1. Engineer proposes changes via PR
2. Tech Lead reviews for accuracy
3. Merge to main after approval
4. Announce changes in team meeting

## Quick Reference

| Role                       | File                                  | Status      | Priority         |
|----------------------------|---------------------------------------|-------------|------------------|
| Engineering Manager        | `01-engineering-manager-tech-lead.md` | ✅ Complete  | Critical         |
| Product Manager            | `02-product-manager.md`               | ✅ Complete  | Critical         |
| Senior Backend (Core)      | `03-senior-backend-core-platform.md`  | ✅ Complete  | Critical         |
| Backend (Payroll)          | `04-backend-hrms-payroll.md`          | 🔄 Template | High             |
| Backend (Hire/Grow)        | `05-backend-hire-grow.md`             | 🔄 Template | High             |
| Backend (Fluence)          | `06-backend-fluence.md`               | 🔄 Template | Medium (Phase 2) |
| Senior Frontend (Platform) | `07-senior-frontend-platform.md`      | 🔄 Template | Critical         |
| Frontend (HRMS)            | `08-frontend-hrms.md`                 | 🔄 Template | High             |
| Frontend (Hire/Grow)       | `09-frontend-hire-grow.md`            | 🔄 Template | High             |
| DevOps                     | `10-devops-engineer.md`               | 🔄 Template | Critical         |
| QA                         | `11-qa-engineer.md`                   | 🔄 Template | High             |
| UI/UX Designer             | `12-uiux-designer.md`                 | 🔄 Template | High             |
| HR Domain Expert           | `13-hr-domain-expert.md`              | 🔄 Template | Medium           |

## Total Team Size

**Core Team**: 8-10 full-time members

- Leadership: 2 (EM + PM)
- Backend: 4 (1 Core + 3 Module-specific)
- Frontend: 3 (1 Platform + 2 Module-specific)
- DevOps: 1
- QA: 1

**Extended Team**: Part-time/Consulting

- Design: 1 (UI/UX Designer)
- Domain: 1 (HR Expert, consulting basis)

**Estimated Budget**:

- US-based team: $1.2M - $1.5M/year
- India-based team: $300K - $450K/year
- Hybrid (US leads + India team): $600K - $800K/year

## Next Steps

1. **Complete remaining 10 skills** - Use the completed 3 as templates
2. **Review with current team** - Validate accuracy of existing patterns
3. **Create onboarding checklists** - Derive from skills for each role
4. **Set up skill-based training** - Identify knowledge gaps
5. **Integrate with hiring process** - Use skills for interview evaluation
