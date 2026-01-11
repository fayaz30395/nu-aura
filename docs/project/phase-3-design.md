# PHASE 3 — Design Document

## Table of Contents
1. [Architecture Overview](#1-architecture-overview)
2. [RBAC Model & Policy Evaluation](#2-rbac-model--policy-evaluation)
3. [Domain Model & Data Schema](#3-domain-model--data-schema)
4. [API Contracts](#4-api-contracts)
5. [Sample Flows](#5-sample-flows)
6. [Google Integrations Design](#6-google-integrations-design)
7. [Audit Logging Strategy](#7-audit-logging-strategy)
8. [Error Handling](#8-error-handling)
9. [Security Checklist](#9-security-checklist)
10. [Testing Strategy](#10-testing-strategy)
11. [DevOps & Infrastructure](#11-devops--infrastructure)

---

## 1. Architecture Overview

### 1.1 System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                   CLIENTS                                        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                  │
│  │   Web Browser   │  │   Mobile (P2)   │  │   Admin CLI     │                  │
│  │  (Vite+React)   │  │                 │  │                 │                  │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘                  │
└───────────┼─────────────────────┼─────────────────────┼──────────────────────────┘
            │                     │                     │
            └─────────────────────┼─────────────────────┘
                                  │ HTTPS (JWT Bearer)
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              API GATEWAY / NGINX                                 │
│  • TLS Termination  • Rate Limiting  • Request Logging  • CORS                  │
└─────────────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         SPRING BOOT APPLICATION                                  │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │                         SECURITY LAYER                                    │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │   │
│  │  │ JWT Filter  │  │ Auth Filter │  │Rate Limiter │  │ Audit Filter│      │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘      │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │                      AUTHORIZATION SERVICE                                │   │
│  │  • Policy Evaluation  • Scope Resolution  • Permission Cache              │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                         API CONTROLLERS                                  │    │
│  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌─────┐│    │
│  │  │ IAM  │ │ EMP  │ │ ORG  │ │LEAVE │ │ ATT  │ │ DOC  │ │ ANN  │ │ REP ││    │
│  │  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └─────┘│    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                         SERVICE LAYER                                    │    │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐             │    │
│  │  │ Domain Services│  │ Integration Svc│  │ Notification   │             │    │
│  │  │ (Business Logic│  │ (Google APIs)  │  │ Service        │             │    │
│  │  └────────────────┘  └────────────────┘  └────────────────┘             │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                      PERSISTENCE LAYER                                   │    │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐             │    │
│  │  │ JPA Repositories│ │ Query Builders │  │ Outbox Pattern │             │    │
│  │  └────────────────┘  └────────────────┘  └────────────────┘             │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────────┘
          │                    │                    │
          ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   PostgreSQL    │  │     Redis       │  │  Google APIs    │
│   • Entities    │  │  • Sessions     │  │  • Drive        │
│   • Audit Logs  │  │  • Permission   │  │  • Gmail        │
│   • Outbox      │  │    Cache        │  │  • Calendar     │
│                 │  │  • Rate Limits  │  │  • OAuth/OIDC   │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

### 1.2 Component Responsibilities

| Component | Responsibility |
|-----------|----------------|
| **Frontend (Vite+React+TS)** | SPA with routing, state management (Zustand/Redux), API client, form validation, role-based UI gating |
| **API Gateway (Nginx)** | TLS termination, rate limiting (token bucket), request logging, CORS headers, static asset serving |
| **JWT Filter** | Extract & validate JWT from Authorization header; populate SecurityContext |
| **Auth Filter** | Extract route's `(module, action, scope)` annotation; invoke AuthorizationService |
| **Rate Limiter** | Per-user/IP rate limiting using Redis sliding window |
| **Audit Filter** | Capture request/response metadata; write to audit log asynchronously |
| **Authorization Service** | Policy evaluation engine; scope resolution; permission caching |
| **Domain Services** | Business logic per module; transaction boundaries; validation |
| **Integration Services** | Google API clients (Drive, Gmail, Calendar); token management; retry/backoff |
| **Notification Service** | Orchestrate in-app + email notifications; template rendering |
| **Outbox Processor** | Poll outbox table; dispatch external side-effects (email, calendar); handle retries |
| **PostgreSQL** | Primary datastore; audit logs; outbox table for reliable messaging |
| **Redis** | Session store (refresh tokens); permission cache; rate limit counters |

### 1.3 Key Design Principles

1. **Authorization at Service Layer**: All access control enforced server-side before business logic
2. **SQL-Level Filtering**: List endpoints filter by scope in SQL (no in-memory filtering)
3. **Outbox Pattern**: External side-effects (email/calendar/drive) written to outbox, processed async
4. **Idempotency**: All mutations have idempotency keys; external calls use correlation IDs
5. **Audit Everything**: Every privileged action logged with full context
6. **Fail Secure**: Default deny; errors don't leak internal details

---

## 2. RBAC Model & Policy Evaluation

### 2.1 Core Concepts

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│    User     │──M:N─│    Role     │──M:N─│ Permission  │
└─────────────┘      └─────────────┘      └─────────────┘
                                                 │
                           ┌─────────────────────┼─────────────────────┐
                           │                     │                     │
                           ▼                     ▼                     ▼
                      ┌─────────┐           ┌─────────┐           ┌─────────┐
                      │ Module  │           │ Action  │           │  Scope  │
                      └─────────┘           └─────────┘           └─────────┘
```

### 2.2 Permission Structure

```java
Permission {
    module: Enum    // IAM, EMP, ORG, LEAVE, ATT, DOC, ANN, REP, AUDIT, SET, INTEG
    action: Enum    // VIEW, CREATE, UPDATE, DELETE, APPROVE, EXPORT, MANAGE
    scope:  Enum    // SELF, TEAM, DEPARTMENT, ORG
}
```

### 2.3 Scope Hierarchy

```
ORG > DEPARTMENT > TEAM > SELF

Resolution: If user has multiple permissions for same (module, action),
            effective scope = MAX(scopes)
```

### 2.4 Default Roles & Permission Matrix

#### SUPER_ADMIN (Full System Access)
| Module | VIEW | CREATE | UPDATE | DELETE | APPROVE | EXPORT | MANAGE |
|--------|------|--------|--------|--------|---------|--------|--------|
| IAM    | ORG  | ORG    | ORG    | ORG    | -       | ORG    | ORG    |
| EMP    | ORG  | ORG    | ORG    | ORG    | -       | ORG    | -      |
| ORG    | ORG  | ORG    | ORG    | ORG    | -       | ORG    | -      |
| LEAVE  | ORG  | ORG    | ORG    | ORG    | ORG     | ORG    | -      |
| ATT    | ORG  | ORG    | ORG    | ORG    | ORG     | ORG    | -      |
| DOC    | ORG  | ORG    | ORG    | ORG    | -       | ORG    | -      |
| ANN    | ORG  | ORG    | ORG    | ORG    | -       | -      | -      |
| REP    | ORG  | -      | -      | -      | -       | ORG    | -      |
| AUDIT  | ORG  | -      | -      | -      | -       | ORG    | -      |
| SET    | ORG  | ORG    | ORG    | ORG    | -       | -      | ORG    |
| INTEG  | ORG  | ORG    | ORG    | ORG    | -       | -      | ORG    |

#### HR_ADMIN (HR Operations)
| Module | VIEW | CREATE | UPDATE | DELETE | APPROVE | EXPORT | MANAGE |
|--------|------|--------|--------|--------|---------|--------|--------|
| IAM    | ORG  | -      | ORG*   | -      | -       | -      | -      |
| EMP    | ORG  | ORG    | ORG    | -      | -       | ORG    | -      |
| ORG    | ORG  | ORG    | ORG    | -      | -       | ORG    | -      |
| LEAVE  | ORG  | ORG    | ORG    | -      | ORG     | ORG    | -      |
| ATT    | ORG  | ORG    | ORG    | -      | ORG     | ORG    | -      |
| DOC    | ORG  | ORG    | ORG    | -      | -       | ORG    | -      |
| ANN    | ORG  | ORG    | ORG    | ORG    | -       | -      | -      |
| REP    | ORG  | -      | -      | -      | -       | ORG    | -      |
| AUDIT  | ORG  | -      | -      | -      | -       | ORG    | -      |
| SET    | ORG  | ORG    | ORG    | -      | -       | -      | -      |
| INTEG  | ORG  | -      | -      | -      | -       | -      | -      |

*IAM UPDATE (ORG): Can assign roles except SUPER_ADMIN

#### MANAGER (Team Management)
| Module | VIEW | CREATE | UPDATE | DELETE | APPROVE | EXPORT | MANAGE |
|--------|------|--------|--------|--------|---------|--------|--------|
| IAM    | SELF | -      | -      | -      | -       | -      | -      |
| EMP    | TEAM | -      | SELF   | -      | -       | -      | -      |
| ORG    | ORG  | -      | -      | -      | -       | -      | -      |
| LEAVE  | TEAM | SELF   | SELF   | SELF   | TEAM    | -      | -      |
| ATT    | TEAM | SELF   | SELF   | -      | TEAM    | -      | -      |
| DOC    | TEAM*| SELF   | SELF   | -      | -       | -      | -      |
| ANN    | ORG  | -      | -      | -      | -       | -      | -      |
| REP    | TEAM | -      | -      | -      | -       | -      | -      |
| AUDIT  | -    | -      | -      | -      | -       | -      | -      |
| SET    | ORG  | -      | -      | -      | -       | -      | -      |
| INTEG  | -    | -      | -      | -      | -       | -      | -      |

*DOC VIEW (TEAM): Non-confidential documents only

#### EMPLOYEE (Self-Service)
| Module | VIEW | CREATE | UPDATE | DELETE | APPROVE | EXPORT | MANAGE |
|--------|------|--------|--------|--------|---------|--------|--------|
| IAM    | SELF | -      | -      | -      | -       | -      | -      |
| EMP    | SELF | -      | SELF*  | -      | -       | -      | -      |
| ORG    | ORG  | -      | -      | -      | -       | -      | -      |
| LEAVE  | SELF | SELF   | SELF   | SELF   | -       | -      | -      |
| ATT    | SELF | SELF   | SELF   | -      | -       | -      | -      |
| DOC    | SELF | SELF** | -      | -      | -       | -      | -      |
| ANN    | ORG  | -      | -      | -      | -       | -      | -      |
| REP    | -    | -      | -      | -      | -       | -      | -      |
| AUDIT  | -    | -      | -      | -      | -       | -      | -      |
| SET    | ORG  | -      | -      | -      | -       | -      | -      |
| INTEG  | -    | -      | -      | -      | -       | -      | -      |

*EMP UPDATE (SELF): Limited to allowed fields (phone, emergency contact, address)
**DOC CREATE (SELF): Limited to self-service document types

### 2.5 Policy Evaluation Algorithm

```java
class AuthorizationService {

    /**
     * Main authorization check
     * @return true if allowed, false if denied
     */
    boolean hasPermission(
        User user,
        Module module,
        Action action,
        Scope requiredScope,
        Long targetEmployeeId,    // nullable for non-employee targets
        Long targetDepartmentId   // nullable
    ) {
        // 1. Get effective permissions (union of all roles)
        Set<Permission> permissions = getEffectivePermissions(user);

        // 2. Find matching permission for (module, action)
        Optional<Permission> match = permissions.stream()
            .filter(p -> p.module == module && p.action == action)
            .max(Comparator.comparing(p -> p.scope.ordinal()));

        if (match.isEmpty()) {
            auditDenied(user, module, action, "NO_PERMISSION");
            return false;
        }

        Scope grantedScope = match.get().scope;

        // 3. Scope resolution
        boolean allowed = resolveScope(user, grantedScope, targetEmployeeId, targetDepartmentId);

        if (!allowed) {
            auditDenied(user, module, action, "SCOPE_VIOLATION");
        }

        return allowed;
    }

    /**
     * Scope resolution logic
     */
    boolean resolveScope(User user, Scope grantedScope, Long targetEmployeeId, Long targetDepartmentId) {
        Employee actor = user.getEmployee();

        switch (grantedScope) {
            case SELF:
                return targetEmployeeId != null && targetEmployeeId.equals(actor.getId());

            case TEAM:
                if (targetEmployeeId == null) return false;
                Employee target = employeeRepository.findById(targetEmployeeId);
                return target != null && actor.getId().equals(target.getManagerId());

            case DEPARTMENT:
                if (targetEmployeeId != null) {
                    Employee target = employeeRepository.findById(targetEmployeeId);
                    return target != null && actor.getDepartmentId().equals(target.getDepartmentId());
                }
                if (targetDepartmentId != null) {
                    return actor.getDepartmentId().equals(targetDepartmentId);
                }
                return false;

            case ORG:
                return true; // Org-wide access granted

            default:
                return false;
        }
    }

    /**
     * Get effective permissions with caching
     */
    Set<Permission> getEffectivePermissions(User user) {
        String cacheKey = "perms:" + user.getId();

        // Check Redis cache
        Set<Permission> cached = redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) return cached;

        // Compute from roles
        Set<Permission> permissions = user.getRoles().stream()
            .flatMap(role -> role.getPermissions().stream())
            .collect(Collectors.toSet());

        // Merge scopes: for same (module, action), keep widest scope
        Map<String, Permission> merged = new HashMap<>();
        for (Permission p : permissions) {
            String key = p.module + ":" + p.action;
            Permission existing = merged.get(key);
            if (existing == null || p.scope.ordinal() > existing.scope.ordinal()) {
                merged.put(key, p);
            }
        }

        Set<Permission> effective = new HashSet<>(merged.values());

        // Cache for 5 minutes
        redisTemplate.opsForValue().set(cacheKey, effective, Duration.ofMinutes(5));

        return effective;
    }

    /**
     * Invalidate cache on role change
     */
    void invalidatePermissionCache(Long userId) {
        redisTemplate.delete("perms:" + userId);
    }
}
```

### 2.6 SQL-Level Scope Filtering for List Endpoints

```sql
-- Example: Get employees visible to a user based on their scope

-- For SELF scope
SELECT * FROM employees WHERE id = :actorEmployeeId;

-- For TEAM scope (direct reports)
SELECT * FROM employees WHERE manager_id = :actorEmployeeId;

-- For DEPARTMENT scope
SELECT * FROM employees WHERE department_id = :actorDepartmentId;

-- For ORG scope
SELECT * FROM employees WHERE status IN ('ACTIVE', 'PENDING_ONBOARDING');

-- Dynamic query builder in repository
@Query("""
    SELECT e FROM Employee e
    WHERE (:scope = 'ORG')
       OR (:scope = 'DEPARTMENT' AND e.departmentId = :actorDeptId)
       OR (:scope = 'TEAM' AND e.managerId = :actorEmpId)
       OR (:scope = 'SELF' AND e.id = :actorEmpId)
    """)
List<Employee> findByScope(
    @Param("scope") String scope,
    @Param("actorEmpId") Long actorEmpId,
    @Param("actorDeptId") Long actorDeptId
);
```

### 2.7 Confidential Field Access

```java
/**
 * Field-level confidentiality policy
 */
enum ConfidentialField {
    SALARY("EMP", Set.of("HR_ADMIN", "SUPER_ADMIN")),
    BANK_DETAILS("EMP", Set.of("HR_ADMIN", "SUPER_ADMIN", "SELF")),
    TAX_ID("EMP", Set.of("HR_ADMIN", "SUPER_ADMIN", "SELF")),
    MEDICAL_DOCS("DOC", Set.of("HR_ADMIN", "SUPER_ADMIN"));

    String module;
    Set<String> allowedRoles; // "SELF" = owner can access

    boolean canAccess(User user, Long targetEmployeeId) {
        if (allowedRoles.contains("SELF") &&
            user.getEmployee().getId().equals(targetEmployeeId)) {
            return true;
        }
        return user.getRoles().stream()
            .anyMatch(r -> allowedRoles.contains(r.getCode()));
    }
}
```

---

## 3. Domain Model & Data Schema

### 3.1 Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              ORGANIZATION CONTEXT                                │
│                                                                                  │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐                     │
│  │   Location   │     │  Department  │     │ Designation  │                     │
│  ├──────────────┤     ├──────────────┤     ├──────────────┤                     │
│  │ id           │     │ id           │     │ id           │                     │
│  │ name         │◄────│ location_id  │     │ name         │                     │
│  │ country      │     │ parent_id    │     │ level        │                     │
│  │ timezone     │     │ working_days │     │ band         │                     │
│  │ working_days │     │ status       │     └──────────────┘                     │
│  └──────────────┘     └──────────────┘            ▲                             │
│         ▲                    ▲                    │                             │
└─────────┼────────────────────┼────────────────────┼─────────────────────────────┘
          │                    │                    │
          │    ┌───────────────┴────────────────────┘
          │    │
┌─────────┼────┼──────────────────────────────────────────────────────────────────┐
│         │    │           EMPLOYEE CONTEXT                                        │
│         │    │                                                                   │
│  ┌──────┴────┴───┐                    ┌──────────────┐                          │
│  │   Employee    │                    │     User     │                          │
│  ├───────────────┤                    ├──────────────┤                          │
│  │ id            │◄───────────────────│ employee_id  │                          │
│  │ employee_code │    1:1             │ id           │                          │
│  │ email         │                    │ google_sub   │                          │
│  │ first_name    │                    │ email        │                          │
│  │ last_name     │                    │ status       │                          │
│  │ department_id │                    │ last_login   │                          │
│  │ designation_id│                    │ last_login_ip│                          │
│  │ location_id   │                    └──────┬───────┘                          │
│  │ manager_id    │───┐ (self-ref)            │                                  │
│  │ date_of_join  │   │                       │ M:N                              │
│  │ status        │◄──┘                       │                                  │
│  │ phone         │                    ┌──────┴───────┐                          │
│  │ ...           │                    │  user_roles  │                          │
│  └───────────────┘                    ├──────────────┤                          │
│         │                             │ user_id      │                          │
│         │ 1:N                         │ role_id      │                          │
│         ▼                             └──────┬───────┘                          │
│  ┌───────────────┐                           │                                  │
│  │EmployeeBank   │                           │                                  │
│  │EmployeeTax    │                    ┌──────┴───────┐                          │
│  │(Confidential) │                    │    Role      │                          │
│  └───────────────┘                    ├──────────────┤                          │
│                                       │ id           │                          │
│                                       │ code         │                          │
│                                       │ name         │                          │
│                                       │ is_system    │                          │
│                                       └──────┬───────┘                          │
│                                              │ M:N                              │
│                                       ┌──────┴───────┐                          │
│                                       │role_permissions                         │
│                                       ├──────────────┤                          │
│                                       │ role_id      │                          │
│                                       │ permission_id│                          │
│                                       └──────┬───────┘                          │
│                                              │                                  │
│                                       ┌──────┴───────┐                          │
│                                       │ Permission   │                          │
│                                       ├──────────────┤                          │
│                                       │ id           │                          │
│                                       │ module       │                          │
│                                       │ action       │                          │
│                                       │ scope        │                          │
│                                       └──────────────┘                          │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                              LEAVE CONTEXT                                       │
│                                                                                  │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐                     │
│  │  LeaveType   │     │ LeaveBalance │     │ LeaveRequest │                     │
│  ├──────────────┤     ├──────────────┤     ├──────────────┤                     │
│  │ id           │◄────│ leave_type_id│◄────│ leave_type_id│                     │
│  │ code         │     │ employee_id  │     │ employee_id  │                     │
│  │ name         │     │ year         │     │ start_date   │                     │
│  │ accrual_type │     │ total        │     │ end_date     │                     │
│  │ accrual_amt  │     │ used         │     │ days         │                     │
│  │ carryover_max│     │ pending      │     │ status       │                     │
│  │ requires_bal │     │ available    │     │ reason       │                     │
│  └──────────────┘     └──────────────┘     │ approved_by  │                     │
│                                            │ approved_at  │                     │
│                                            │ calendar_evtid                     │
│                                            └──────────────┘                     │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                            ATTENDANCE CONTEXT                                    │
│                                                                                  │
│  ┌──────────────┐     ┌──────────────────┐     ┌──────────────────┐             │
│  │    Shift     │     │    Attendance    │     │  Regularization  │             │
│  ├──────────────┤     ├──────────────────┤     ├──────────────────┤             │
│  │ id           │◄────│ shift_id         │     │ id               │             │
│  │ name         │     │ id               │◄────│ attendance_id    │             │
│  │ start_time   │     │ employee_id      │     │ employee_id      │             │
│  │ end_time     │     │ date             │     │ date             │             │
│  │ grace_mins   │     │ check_in         │     │ type             │             │
│  └──────────────┘     │ check_out        │     │ reason           │             │
│                       │ status           │     │ status           │             │
│                       │ is_late          │     │ approved_by      │             │
│                       │ hours_worked     │     └──────────────────┘             │
│                       │ ip_address       │                                      │
│                       │ user_agent       │                                      │
│                       └──────────────────┘                                      │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                            DOCUMENT CONTEXT                                      │
│                                                                                  │
│  ┌──────────────┐     ┌──────────────────┐                                      │
│  │ DocumentType │     │    Document      │                                      │
│  ├──────────────┤     ├──────────────────┤                                      │
│  │ id           │◄────│ document_type_id │                                      │
│  │ code         │     │ id               │                                      │
│  │ name         │     │ employee_id      │                                      │
│  │ is_confid    │     │ drive_file_id    │                                      │
│  │ self_upload  │     │ drive_folder_id  │                                      │
│  │ required     │     │ file_name        │                                      │
│  └──────────────┘     │ mime_type        │                                      │
│                       │ size_bytes       │                                      │
│                       │ classification   │                                      │
│                       │ version          │                                      │
│                       │ uploaded_by      │                                      │
│                       │ status           │                                      │
│                       └──────────────────┘                                      │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                        NOTIFICATION & AUDIT CONTEXT                              │
│                                                                                  │
│  ┌──────────────┐     ┌──────────────────┐     ┌──────────────────┐             │
│  │ Announcement │     │   Notification   │     │    AuditLog      │             │
│  ├──────────────┤     ├──────────────────┤     ├──────────────────┤             │
│  │ id           │     │ id               │     │ id               │             │
│  │ title        │     │ user_id          │     │ actor_user_id    │             │
│  │ content      │     │ type             │     │ actor_roles      │             │
│  │ target_scope │     │ title            │     │ action           │             │
│  │ target_id    │     │ message          │     │ target_type      │             │
│  │ publish_at   │     │ data             │     │ target_id        │             │
│  │ status       │     │ is_read          │     │ request_id       │             │
│  │ created_by   │     │ created_at       │     │ ip_address       │             │
│  └──────────────┘     └──────────────────┘     │ user_agent       │             │
│         │                                      │ result           │             │
│         │ M:N                                  │ details          │             │
│  ┌──────┴───────┐                              │ created_at       │             │
│  │announcement_ │                              └──────────────────┘             │
│  │read_status   │                                                               │
│  └──────────────┘                                                               │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                            OUTBOX & SETTINGS                                     │
│                                                                                  │
│  ┌──────────────────┐     ┌──────────────┐     ┌──────────────────┐             │
│  │     Outbox       │     │   Holiday    │     │   OrgSettings    │             │
│  ├──────────────────┤     ├──────────────┤     ├──────────────────┤             │
│  │ id               │     │ id           │     │ id               │             │
│  │ aggregate_type   │     │ name         │     │ key              │             │
│  │ aggregate_id     │     │ date         │     │ value            │             │
│  │ event_type       │     │ type         │     │ description      │             │
│  │ payload          │     │ location_id  │     └──────────────────┘             │
│  │ correlation_id   │     └──────────────┘                                      │
│  │ status           │                                                           │
│  │ retry_count      │     ┌──────────────────┐                                  │
│  │ next_retry_at    │     │ RefreshToken     │                                  │
│  │ error_message    │     ├──────────────────┤                                  │
│  │ created_at       │     │ id               │                                  │
│  │ processed_at     │     │ user_id          │                                  │
│  └──────────────────┘     │ token_hash       │                                  │
│                           │ expires_at       │                                  │
│                           │ revoked          │                                  │
│                           └──────────────────┘                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 DDL Schema (PostgreSQL)

See `backend/src/main/resources/db/migration/` for complete Flyway migrations.

Key tables:
- `locations`, `departments`, `designations` - Organization structure
- `employees`, `users`, `employee_bank_details`, `employee_tax_details`, `employee_salary` - Employee data
- `roles`, `permissions`, `role_permissions`, `user_roles` - RBAC
- `leave_types`, `leave_balances`, `leave_requests` - Leave management
- `shifts`, `attendance`, `regularizations` - Attendance tracking
- `document_types`, `documents` - Document management
- `announcements`, `announcement_read_status`, `notifications` - Communication
- `audit_logs` - Audit trail
- `outbox` - Reliable messaging
- `refresh_tokens`, `email_templates`, `email_logs`, `calendar_events` - Supporting tables
- `holidays`, `org_settings` - Configuration

---

## 4. API Contracts

### 4.1 API Design Principles

- **REST** with resource-oriented URLs
- **JSON** request/response bodies
- **JWT Bearer** authentication
- **Problem+JSON** (RFC 7807) for errors
- **Pagination** via `page`, `size`, `sort` query params
- **Filtering** via query params per endpoint
- **Versioning** via URL path (`/api/v1/`)

### 4.2 Common Headers

```
Request:
  Authorization: Bearer <jwt>
  X-Request-ID: <uuid>  (optional, generated if not provided)
  Content-Type: application/json

Response:
  Content-Type: application/json
  X-Request-ID: <uuid>
  X-RateLimit-Limit: 100
  X-RateLimit-Remaining: 99
  X-RateLimit-Reset: 1609459200
```

### 4.3 Endpoint Summary

| Module | Base Path | Key Endpoints |
|--------|-----------|---------------|
| Auth | `/api/v1/auth` | `POST /google`, `POST /refresh`, `POST /logout` |
| IAM | `/api/v1/iam` | `GET/POST /roles`, `GET/PUT /roles/{id}`, `GET /permissions`, `POST /users/{id}/roles` |
| Employee | `/api/v1/employees` | `GET/POST /`, `GET/PATCH /{id}`, `POST /import`, `GET /directory`, `GET /my-team` |
| Org | `/api/v1/org` | `GET/POST /departments`, `/designations`, `/locations` |
| Leave | `/api/v1/leave` | `GET /types`, `GET /my-balance`, `POST /requests`, `POST /requests/{id}/approve` |
| Attendance | `/api/v1/attendance` | `GET /my-attendance`, `POST /check-in`, `POST /check-out`, `POST /regularizations` |
| Documents | `/api/v1/documents` | `POST /`, `GET /{id}/download`, `GET /{id}/view` |
| Announcements | `/api/v1/announcements` | `GET/POST /`, `POST /{id}/read` |
| Reports | `/api/v1/reports` | `GET /employee-directory`, `/leave-balance`, `/attendance-summary` |
| Audit | `/api/v1/audit` | `GET /logs`, `GET /logs/export` |
| Settings | `/api/v1/settings` | `GET/POST /holidays`, `GET/PATCH /org`, `GET/POST /shifts` |
| Integrations | `/api/v1/integrations` | `GET /status`, `POST /{service}/test` |

See API documentation for detailed request/response schemas.

---

## 5. Sample Flows

### 5.1 Google SSO Login + Provisioning
1. User clicks "Sign in with Google"
2. Frontend redirects to Google OAuth
3. User consents, Google returns ID token
4. Frontend sends ID token to `POST /auth/google`
5. Backend validates token (iss, aud, hd, exp)
6. Backend finds/links user by google_sub or email
7. Backend generates JWT + refresh token
8. Backend logs LOGIN_SUCCESS audit event
9. Frontend stores tokens, redirects to dashboard

### 5.2 Admin Creates Role
1. SUPER_ADMIN navigates to Role Management
2. Frontend fetches `GET /iam/permissions` for matrix
3. Admin selects permissions, enters role name
4. Frontend sends `POST /iam/roles`
5. Backend validates SUPER_ADMIN permission
6. Backend creates role with permissions
7. Backend logs ROLE_CREATED audit event

### 5.3 HR Creates Employee + Onboarding
1. HR_ADMIN fills employee form
2. Frontend sends `POST /employees`
3. Backend validates domain, creates Employee + User
4. Backend assigns EMPLOYEE role
5. Backend writes outbox entry for onboarding email
6. Outbox processor sends email via Gmail API
7. Backend logs USER_CREATED + EMAIL_SENT audit events

### 5.4 Leave Apply → Approve → Calendar
1. Employee submits leave request
2. Backend validates balance, creates PENDING request
3. Backend notifies manager (in-app + email)
4. Manager approves via `POST /leave/requests/{id}/approve`
5. Backend updates balance, creates outbox for calendar
6. Calendar processor creates Google Calendar event
7. Backend logs all audit events

### 5.5 Attendance Regularization
1. Employee submits regularization (WFH, missed punch)
2. Backend validates within 7-day window
3. Backend creates PENDING regularization, notifies manager
4. Manager approves, backend updates attendance record
5. Backend logs REGULARIZATION_APPROVED audit event

### 5.6 Document Upload to Drive
1. HR_ADMIN uploads document for employee
2. Backend validates MIME type, size, extension
3. Backend creates employee folder in Drive (if needed)
4. Backend uploads file via Drive API (resumable)
5. Backend stores metadata with drive_file_id
6. Backend logs DOC_UPLOAD audit event
7. Document access always proxied through backend with RBAC check

---

## 6. Google Integrations Design

### 6.1 Integration Model
- **Domain-Wide Delegation (DWD)** with service account
- Single system user: `hrms-system@nulogic.io`
- Least privilege scopes per API

### 6.2 OAuth Scopes
```
# OIDC (Login)
openid, profile, email

# Drive
https://www.googleapis.com/auth/drive.file

# Gmail
https://www.googleapis.com/auth/gmail.send

# Calendar
https://www.googleapis.com/auth/calendar.events
```

### 6.3 Services
- **GoogleAuthService**: OIDC token validation, domain allowlist
- **GoogleDriveService**: File upload/download, folder management
- **GoogleGmailService**: Email sending with templates
- **GoogleCalendarService**: Event create/update/cancel
- **GoogleCredentialsManager**: DWD credential building

### 6.4 Reliability Patterns
- Outbox pattern for all external operations
- Exponential backoff with jitter
- Idempotency keys for calendar events
- Circuit breaker for API outages
- Dead letter queue for failed operations

---

## 7. Audit Logging Strategy

### 7.1 Event Categories
- **Auth**: LOGIN_SUCCESS, LOGIN_FAILED, LOGOUT
- **IAM**: USER_CREATED, ROLE_CREATED, ROLE_ASSIGNED
- **Employee**: EMPLOYEE_CREATED, EMPLOYEE_UPDATED, BULK_IMPORT
- **Leave**: LEAVE_APPLIED, LEAVE_APPROVED, LEAVE_REJECTED
- **Attendance**: ATTENDANCE_CHECKIN, REGULARIZATION_APPROVED
- **Document**: DOC_UPLOADED, DOC_DOWNLOADED, DOC_ACCESS_DENIED
- **Integration**: EMAIL_SENT, CAL_EVENT_CREATED

### 7.2 Audit Log Schema
```json
{
  "actor_user_id": 5,
  "actor_roles": "HR_ADMIN",
  "action": "LEAVE_APPROVED",
  "target_type": "LeaveRequest",
  "target_id": "100",
  "request_id": "uuid",
  "ip_address": "192.168.1.50",
  "user_agent": "Mozilla/5.0...",
  "result": "SUCCESS",
  "details": { "employee_id": 10, "days": 2 },
  "created_at": "2024-02-10T12:00:00Z"
}
```

---

## 8. Error Handling

### 8.1 Problem+JSON (RFC 7807)
```json
{
  "type": "https://hrms.nulogic.io/errors/validation-error",
  "title": "Validation Error",
  "status": 400,
  "detail": "The request contains invalid data",
  "instance": "/api/v1/employees",
  "request_id": "abc123",
  "errors": [
    { "field": "email", "code": "INVALID_FORMAT", "message": "..." }
  ]
}
```

### 8.2 Error Types
- `validation-error` (400)
- `unauthorized` (401)
- `forbidden` (403)
- `not-found` (404)
- `conflict` (409)
- `unprocessable-entity` (422)
- `rate-limited` (429)
- `internal-error` (500)
- `service-unavailable` (503)

---

## 9. Security Checklist

### Authentication & Authorization
- [x] Google OIDC validation (iss, aud, exp, hd)
- [x] Domain allowlist via `hd` claim
- [x] Short-lived JWT (15m) with refresh tokens
- [x] RBAC enforcement on every endpoint
- [x] SQL-level scope filtering
- [x] Last SUPER_ADMIN protection

### Data Protection
- [x] Field-level confidentiality policies
- [x] PII encryption at rest
- [x] No raw Drive URLs exposed
- [x] All document access audited

### Infrastructure
- [x] TLS everywhere
- [x] CORS allowlist
- [x] Rate limiting
- [x] Secrets in environment variables

---

## 10. Testing Strategy

### Test Pyramid
- **Unit Tests (70%)**: Service layer, domain logic, utilities
- **Integration Tests (25%)**: API endpoints, repository queries, security
- **E2E Tests (5%)**: Critical user flows

### Key Test Areas
- Permission evaluation logic
- Scope filtering in queries
- Google API integration (mocked)
- Security (auth, authorization, access denial)

---

## 11. DevOps & Infrastructure

### Docker Compose
- PostgreSQL 15
- Redis 7
- Spring Boot backend
- Vite React frontend

### Database Migrations
- Flyway for version-controlled migrations
- Seed data for permissions, roles, leave types

### Environment Variables
- `GOOGLE_CLIENT_ID`, `GOOGLE_APPLICATION_CREDENTIALS`
- `SPRING_DATASOURCE_*`, `SPRING_REDIS_*`
- `JWT_SECRET`, `ALLOWED_DOMAINS`
