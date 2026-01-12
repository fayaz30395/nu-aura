# NU-AURA HRMS Documentation

Multi-tenant HRMS platform for employees, attendance, payroll, performance, and recruitment.

## Quick Links

| Document | Description |
|----------|-------------|
| [Technical Architecture](architecture/TECHNICAL_ARCHITECTURE.md) | System design, tech stack, layers |
| [UI Architecture](architecture/UI_ARCHITECTURE.md) | Frontend components, state, integrations |
| [Security & RBAC](architecture/SECURITY_REQUIREMENTS.md) | Auth, permissions, data protection |
| [RBAC Details](architecture/RBAC_DOCUMENTATION.md) | Role hierarchy, permission matrix |
| [API Specifications](api/API_SPECIFICATIONS.md) | REST endpoints, request/response |
| [Database Schema](api/DATABASE_SCHEMA.md) | Data models, relationships |
| [Functional Requirements](api/FUNCTIONAL_REQUIREMENTS.md) | Feature specifications |

## Development

| Document | Description |
|----------|-------------|
| [Setup Guide](operations/SETUP_GUIDE.md) | Local development setup |
| [Developer Guide](development/DEVELOPER_GUIDE.md) | Coding standards, workflow |
| [Backend Guide](development/BACKEND_README.md) | Spring Boot specifics |
| [Frontend Guide](development/FRONTEND_README.md) | Next.js specifics |

## Operations

| Document | Description |
|----------|-------------|
| [Deployment Guide](operations/DEPLOYMENT_GUIDE.md) | Docker, K8s, CI/CD |
| [Testing Requirements](operations/TESTING_REQUIREMENTS.md) | Unit, integration, E2E |

## Project Status

| Document | Description |
|----------|-------------|
| [Project Status](project/PROJECT_STATUS.md) | Current state, recent commits |
| [Backlog](project/BACKLOG.md) | Prioritized pending work (P0-P3) |

## Tech Stack

| Component | Technology |
|-----------|------------|
| Backend | Spring Boot 3.4, Java 21 |
| Frontend | Next.js 14, TypeScript |
| Database | PostgreSQL 14+ |
| Cache | Redis 6+ |
| Storage | MinIO (S3-compatible) |
| Testing | Playwright, JUnit 5 |

## Core Modules

- **Employees**: Directory, hierarchy, documents, onboarding
- **Attendance**: Check-in/out, shifts, geofencing
- **Leave**: Policies, balances, approvals
- **Payroll**: Salary, payslips, statutory compliance
- **Performance**: OKRs, reviews, 360 feedback
- **Recruitment**: Jobs, candidates, interviews
- **Benefits**: Plans, enrollments, claims
- **Training**: Courses, LMS, certificates
- **Expenses**: Claims, approvals, reimbursements

---
*Last Updated: January 12, 2026*
