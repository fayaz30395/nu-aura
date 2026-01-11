# NU-AURA HRMS - Documentation Hub

This folder contains all project documentation organized by category.

## Documentation Structure

```
docs/
├── README.md                    # This file - documentation index
├── REQUIREMENTS_INDEX.md        # Requirements overview
│
├── project/                     # Project Management & Status
│   ├── PROJECT_STATUS.md        # Current project status
│   ├── IMPLEMENTATION_STATUS.md # Feature implementation tracking
│   ├── BACKLOG.md               # Prioritized backlog (P0-P3)
│   ├── TECH_DEBT.md             # Technical debt items
│   ├── FEATURES.md              # Feature descriptions
│   ├── FEATURES_STATUS.md       # Feature completion status
│   ├── IMPROVEMENTS.md          # Improvement suggestions
│   ├── phase-3-design.md        # Phase 3 design document
│   ├── phase-4-tasks.md         # Phase 4 task breakdown
│   └── ...                      # Additional project docs
│
├── architecture/                # System Architecture
│   ├── TECHNICAL_ARCHITECTURE.md # System design & patterns
│   ├── ARCHITECTURE.md          # High-level architecture
│   ├── SECURITY_REQUIREMENTS.md # Security standards
│   ├── RBAC_DOCUMENTATION.md    # RBAC system documentation
│   └── RBAC_CONTROLLER_EXAMPLES.md # RBAC implementation examples
│
├── api/                         # API & Data Documentation
│   ├── API_SPECIFICATIONS.md    # REST API documentation
│   ├── BACKEND_API_REFERENCE.md # Backend API reference
│   ├── DATABASE_SCHEMA.md       # Database schema (comprehensive)
│   ├── BACKEND_DATABASE_SCHEMA.md # Backend-specific schema
│   └── FUNCTIONAL_REQUIREMENTS.md # Feature specifications
│
├── operations/                  # Operations & DevOps
│   ├── SETUP_GUIDE.md           # Development setup guide
│   ├── DEPLOYMENT_GUIDE.md      # Deployment procedures
│   └── TESTING_REQUIREMENTS.md  # Testing strategy
│
├── development/                 # Development Guides
│   ├── DEVELOPER_GUIDE.md       # Developer onboarding
│   ├── BACKEND_README.md        # Backend-specific guide
│   ├── FRONTEND_README.md       # Frontend-specific guide
│   ├── LAYOUT_SYSTEM_OVERVIEW.md # UI layout documentation
│   ├── LAYOUT_COMPONENTS_SUMMARY.md # UI components
│   ├── UI_COMPONENTS_SUMMARY.md # UI component reference
│   └── SESSION_NOTES.md         # Development session notes
│
└── assets/                      # Reference Documents
    └── *.pdf                    # PDF specifications
```

## Quick Links

### Getting Started
- [Setup Guide](./operations/SETUP_GUIDE.md) - Local development setup
- [Developer Guide](./development/DEVELOPER_GUIDE.md) - Development workflow
- [Backend README](./development/BACKEND_README.md) - Backend specifics
- [Frontend README](./development/FRONTEND_README.md) - Frontend specifics

### Architecture
- [Technical Architecture](./architecture/TECHNICAL_ARCHITECTURE.md) - System design
- [Security Requirements](./architecture/SECURITY_REQUIREMENTS.md) - Security standards
- [RBAC Documentation](./architecture/RBAC_DOCUMENTATION.md) - Permission system

### API & Database
- [API Specifications](./api/API_SPECIFICATIONS.md) - REST API reference
- [Database Schema](./api/DATABASE_SCHEMA.md) - Data models
- [Functional Requirements](./api/FUNCTIONAL_REQUIREMENTS.md) - Feature specs

### Operations
- [Deployment Guide](./operations/DEPLOYMENT_GUIDE.md) - How to deploy
- [Testing Requirements](./operations/TESTING_REQUIREMENTS.md) - Testing strategy

### Project Status
- [Project Status](./project/PROJECT_STATUS.md) - Current status
- [Implementation Status](./project/IMPLEMENTATION_STATUS.md) - Feature tracking
- [Backlog](./project/BACKLOG.md) - Remaining work

## Document Categories

| Category | Purpose | Audience |
|----------|---------|----------|
| **project/** | Project management, status tracking | PMs, Leads |
| **architecture/** | System design decisions | Architects, Senior Devs |
| **api/** | API contracts, data models | All Developers |
| **operations/** | Setup, deployment, testing | DevOps, All Devs |
| **development/** | Coding guides, conventions | All Developers |
| **assets/** | Reference PDFs, specs | All Team Members |

## Updating Documentation

1. Place new docs in the appropriate category folder
2. Update this README with links to new docs
3. Follow markdown formatting standards
4. Include version/date in documents when appropriate

---

*Last Updated: January 11, 2026*
