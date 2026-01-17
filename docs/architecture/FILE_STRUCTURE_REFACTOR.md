# File Structure Refactor Documentation

## Overview

This document details the structural refactoring performed on the nu-aura HRMS codebase to ensure consistent architecture across all modules.

## New Directory Structure

### Backend (`backend/src/main/java/com/hrms/`)

```
com/hrms/
├── api/                           # REST API Layer
│   └── <module>/
│       ├── controller/            # REST Controllers
│       └── dto/                   # Request/Response DTOs
│
├── application/                   # Application/Service Layer
│   └── <module>/
│       └── service/               # Business logic services
│
├── domain/                        # Domain Layer
│   └── <module>/
│       └── model/                 # JPA Entities & Domain models
│
├── infrastructure/                # Infrastructure Layer
│   └── <module>/
│       └── repository/            # Spring Data JPA Repositories
│
├── common/                        # Shared Cross-cutting Concerns
│   ├── config/                    # Spring configuration
│   ├── entity/                    # Base entities
│   ├── exception/                 # Exception handling
│   ├── export/                    # Export utilities
│   ├── logging/                   # Logging configuration
│   ├── metrics/                   # Metrics collection
│   ├── security/                  # Security utilities, permissions
│   ├── service/                   # Shared services
│   ├── validation/                # Validation utilities
│   └── websocket/                 # WebSocket configuration
│
└── config/                        # Application configuration
```

### Frontend (`frontend/`)

```
frontend/
├── app/                           # Next.js App Router pages
│   └── <module>/                  # Feature-based routing
│
├── lib/                           # Shared library code
│   ├── api/                       # API client layer
│   ├── services/                  # Service classes for API calls
│   ├── types/                     # TypeScript type definitions
│   ├── hooks/                     # React hooks
│   │   └── queries/               # React Query integration
│   ├── contexts/                  # React context providers
│   ├── theme/                     # Theming utilities
│   ├── utils/                     # Utility functions
│   └── constants/                 # Application constants
│
├── components/                    # Reusable React components
│   ├── ui/                        # Base UI components
│   ├── layout/                    # Layout components
│   ├── charts/                    # Chart components
│   └── <feature>/                 # Feature-specific components
│
├── e2e/                           # Playwright E2E tests
├── public/                        # Static assets
└── playwright/                    # Playwright configuration
```

## Naming Conventions

### Backend

| Layer | Package Pattern | Class Naming |
|-------|-----------------|--------------|
| API | `com.hrms.api.<module>.controller` | `<Entity>Controller` |
| API | `com.hrms.api.<module>.dto` | `<Entity>Request`, `<Entity>Response` |
| Application | `com.hrms.application.<module>.service` | `<Entity>Service` |
| Domain | `com.hrms.domain.<module>.model` | `<Entity>` (JPA Entity) |
| Infrastructure | `com.hrms.infrastructure.<module>.repository` | `<Entity>Repository` |

### Frontend

| Type | Location | Naming |
|------|----------|--------|
| Page | `app/<module>/page.tsx` | PascalCase component |
| Service | `lib/services/<module>.service.ts` | camelCase export |
| Types | `lib/types/<module>.ts` | PascalCase interfaces |
| Components | `components/<feature>/` | PascalCase files |

## Module Boundaries

Each business module follows the hexagonal architecture pattern with four layers:

1. **API Layer** (`api/<module>/`): Handles HTTP requests, validation, and response formatting
2. **Application Layer** (`application/<module>/`): Contains business logic and orchestrates domain operations
3. **Domain Layer** (`domain/<module>/`): Defines entities and domain-specific logic
4. **Infrastructure Layer** (`infrastructure/<module>/`): Implements persistence and external integrations

### Dependency Rules

- API → Application → Domain ← Infrastructure
- Domain layer has no external dependencies
- Infrastructure depends on Domain for entity definitions
- Application orchestrates between layers

## Refactored Files Summary

### Files Moved (Source → Destination)

| # | Source | Destination |
|---|--------|-------------|
| 1 | `domain/wall/repository/WallPostRepository.java` | `infrastructure/wall/repository/WallPostRepository.java` |
| 2 | `domain/wall/repository/PostReactionRepository.java` | `infrastructure/wall/repository/PostReactionRepository.java` |
| 3 | `domain/wall/repository/PostCommentRepository.java` | `infrastructure/wall/repository/PostCommentRepository.java` |
| 4 | `domain/wall/repository/PollOptionRepository.java` | `infrastructure/wall/repository/PollOptionRepository.java` |
| 5 | `domain/wall/repository/PollVoteRepository.java` | `infrastructure/wall/repository/PollVoteRepository.java` |
| 6 | `domain/user/repository/UserNotificationPreferencesRepository.java` | `infrastructure/user/repository/UserNotificationPreferencesRepository.java` |

### Import Updates

| File | Old Import | New Import |
|------|------------|------------|
| `WallService.java` | `com.hrms.domain.wall.repository.*` | `com.hrms.infrastructure.wall.repository.*` |
| `NotificationPreferencesService.java` | `com.hrms.domain.user.repository.UserNotificationPreferencesRepository` | `com.hrms.infrastructure.user.repository.UserNotificationPreferencesRepository` |

## Exceptions (Files Not Moved)

The following are intentionally excluded from the module-based structure:

### Configuration Files
- `backend/pom.xml` - Maven build configuration
- `backend/src/main/resources/application*.yml` - Spring configuration
- `frontend/tsconfig.json` - TypeScript configuration
- `frontend/next.config.js` - Next.js configuration
- `frontend/package.json` - NPM dependencies

### Database Migrations
- `backend/src/main/resources/db/changelog/` - Liquibase migration files
- Migration files maintain their existing naming and ordering

### Build Artifacts
- `backend/target/` - Maven build output
- `frontend/.next/` - Next.js build output
- `frontend/node_modules/` - NPM packages

### Protected Modules (Not Touched)
- All `payroll` module files across all layers
- All `compensation` and related financial modules
- All `tax` and `statutory` modules

## Validation Results

### Backend Compilation
```
mvn -pl backend -DskipTests compile
```
Result: [To be filled after running]

### Frontend Build
```
cd frontend && npm run build
```
Result: [To be filled after running]

## Notes

1. **Git History Preserved**: All file moves were performed using `git mv` to preserve version history
2. **No Behavioral Changes**: This refactor is purely structural; no business logic was modified
3. **API Routes Unchanged**: All public REST endpoints remain at their original paths
4. **Database Schema Unchanged**: No migrations were added or modified
