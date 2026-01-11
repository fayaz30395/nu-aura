# NU-AURA HRMS Platform

Enterprise-grade, multi-tenant Human Resource Management System with integrated Project Management.

## Overview

NU-AURA is a comprehensive HRMS platform that streamlines HR operations, enhances employee engagement, and provides robust project tracking for organizations of all sizes.

**Status:** 90% Complete | Production Ready | 140+ E2E Tests

## Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Backend | Spring Boot | 3.4.1 |
| Frontend | Next.js | 14.2.35 |
| Database | PostgreSQL | 14+ |
| Cache | Redis | 6+ |
| Container | Docker/Kubernetes | Latest |
| Testing | Playwright | 1.57.0 |

## Repository Structure

```
nu-aura/
├── hrms-backend/        # Spring Boot REST API (Java 17)
├── hrms-frontend/       # Next.js 14 Web Application
├── pm-frontend/         # Project Management Frontend
├── modules/             # Shared backend modules
│   ├── common/          # Common utilities
│   └── pm/              # Project Management module
├── apps/                # Alternative backend (Java 21)
├── deployment/          # Docker, Kubernetes, GCP configs
│   ├── docker/          # Dockerfiles
│   ├── kubernetes/      # K8s manifests
│   └── cloudbuild.yaml  # CI/CD pipeline
├── monitoring/          # Prometheus, Grafana, AlertManager
├── docs/                # All documentation
│   ├── project/         # Project status & tracking
│   ├── architecture/    # System design docs
│   ├── api/             # API specifications
│   ├── operations/      # Deployment & testing
│   └── development/     # Developer guides
├── config/              # Environment configurations
├── tools/               # Utility scripts
├── pom.xml              # Maven parent POM
├── Dockerfile           # Main Dockerfile
└── README.md            # This file
```

## Core Modules

| Module | Features |
|--------|----------|
| **Employee Management** | CRUD, directory, hierarchy, documents, bulk import |
| **Attendance** | Check-in/out, geofencing, shifts, regularization |
| **Leave Management** | Policies, balances, approvals, calendar |
| **Payroll** | Salary structures, payslips, statutory compliance |
| **Performance** | OKRs, 360 feedback, reviews, 9-box grid |
| **Recruitment** | Job postings, ATS pipeline, interviews |
| **Projects** | Gantt charts, Kanban, tasks, time tracking |
| **Benefits** | Plans, enrollments, claims, wellness |
| **Training/LMS** | Courses, enrollments, certificates |
| **Expenses** | Claims, approvals, reimbursements |

## Quick Start

### Prerequisites

- Java 17+ (backend)
- Node.js 18+ (frontend)
- PostgreSQL 14+
- Redis 6+
- Docker (optional)

### Backend Setup

```bash
cd hrms-backend
cp .env.example .env  # Configure database & secrets
mvn clean install -DskipTests
mvn spring-boot:run
```

### Frontend Setup

```bash
cd hrms-frontend
cp .env.example .env.local  # Configure API URL
npm install
npm run dev
```

### Docker Setup

```bash
docker-compose up -d
```

## Documentation

All documentation is in the [docs/](docs/) folder:

| Document | Description |
|----------|-------------|
| [Setup Guide](docs/operations/SETUP_GUIDE.md) | Development environment setup |
| [Technical Architecture](docs/architecture/TECHNICAL_ARCHITECTURE.md) | System design |
| [API Specifications](docs/api/API_SPECIFICATIONS.md) | REST API reference |
| [Database Schema](docs/api/DATABASE_SCHEMA.md) | Data models |
| [Security](docs/architecture/SECURITY_REQUIREMENTS.md) | Security standards |
| [Deployment](docs/operations/DEPLOYMENT_GUIDE.md) | Deployment procedures |
| [Testing](docs/operations/TESTING_REQUIREMENTS.md) | Testing strategy |

## Key Features

- **Multi-tenant Architecture** - Row-level tenant isolation
- **300+ Permission Nodes** - Fine-grained RBAC with scopes
- **Real-time Updates** - WebSocket notifications
- **Google SSO** - OIDC with PKCE authentication
- **Responsive UI** - Desktop, tablet, and mobile support
- **Dark Mode** - Full dark theme support
- **140+ E2E Tests** - Comprehensive Playwright test suite

## API Documentation

- **Swagger UI**: `http://localhost:8080/swagger-ui.html`
- **OpenAPI Spec**: `http://localhost:8080/v3/api-docs`

## Environment Variables

See [config/.env.example](config/.env.example) for all required variables.

Key variables:
- `SPRING_DATASOURCE_URL` - PostgreSQL connection
- `JWT_SECRET` - JWT signing key (64+ chars)
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `NEXT_PUBLIC_API_URL` - Backend API URL

## Deployment Options

| Platform | Config File |
|----------|-------------|
| Kubernetes | `deployment/kubernetes/` |
| Google Cloud | `deployment/cloudbuild.yaml` |
| Railway | `railway.json` |
| Render | `render.yaml` |
| Docker | `docker-compose.yml` |

## Project Status

| Component | Status | Completion |
|-----------|--------|------------|
| Backend API | Production Ready | 95% |
| Frontend UI | In Progress | 85% |
| Infrastructure | Complete | 100% |
| Security (RBAC) | Complete | 100% |
| Testing | Complete | 95% |

See [docs/project/BACKLOG.md](docs/project/BACKLOG.md) for remaining work.

## Contributing

1. Check [docs/project/BACKLOG.md](docs/project/BACKLOG.md) for tasks
2. Follow [docs/development/DEVELOPER_GUIDE.md](docs/development/DEVELOPER_GUIDE.md)
3. Ensure tests pass before submitting PRs

## License

Proprietary - NuLogic Technologies

---

*Last Updated: January 2026*
