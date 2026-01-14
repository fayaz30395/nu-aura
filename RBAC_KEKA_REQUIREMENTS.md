# Keka-Style RBAC Requirements for NU-AURA

## Overview

This document outlines the requirements for implementing a Keka-inspired Role-Based Access Control (RBAC) system in NU-AURA. The system provides fine-grained permission control with scope-based data access.

## Core Concepts

### 1. Permission Scopes

Each permission can be assigned with one of the following scopes:

| Scope | Description | Data Access |
|-------|-------------|-------------|
| **ALL** | Global access across the entire tenant | All records in the tenant |
| **LOCATION** | Access limited to user's office location(s) | Records matching user's location(s) |
| **DEPARTMENT** | Access limited to user's department | Records in user's department |
| **TEAM** | Access to direct and indirect reports | User's team hierarchy (including skip-level) |
| **SELF** | Access only to own data | Only user's own records |
| **CUSTOM** | Access to specific selected entities | Explicitly selected employees/departments/locations |

### 2. Scope Hierarchy (Most to Least Permissive)

```
ALL > LOCATION > DEPARTMENT > TEAM > SELF > CUSTOM (varies)
```

### 3. Multiple Roles Per User

- Users can have multiple roles assigned
- Each role has its own set of permissions with scopes
- **Effective permission** = Union of all permissions from all roles
- **Effective scope** = Most permissive scope among all roles for each permission
- **Custom targets** = Union of all custom targets from all roles

### 4. TEAM Scope - Indirect Reports

The TEAM scope must include:
- **Direct reports**: Employees where user is the `managerId`
- **Indirect reports**: All employees in the reporting chain below direct reports
- This enables managers to see their entire team hierarchy

### 5. CUSTOM Scope

The CUSTOM scope allows fine-grained access to:
- Specific employees (by employee ID)
- Specific departments (all employees in selected departments)
- Specific locations (all employees in selected locations)

Custom targets are stored separately and merged across roles.

## Permission Categories

### Employee Management
- `EMPLOYEE:READ` - View employee profiles
- `EMPLOYEE:CREATE` - Create new employees
- `EMPLOYEE:UPDATE` - Update employee information
- `EMPLOYEE:DELETE` - Delete/archive employees

### Recruitment/ATS
- `RECRUITMENT:VIEW` - View job openings
- `RECRUITMENT:CREATE` - Create job openings
- `RECRUITMENT:MANAGE` - Full recruitment management
- `CANDIDATE:VIEW` - View candidates
- `CANDIDATE:EVALUATE` - Evaluate/rate candidates
- `INTERVIEW:SCHEDULE` - Schedule interviews
- `INTERVIEW:CONDUCT` - Conduct interviews
- `OFFER:CREATE` - Create job offers
- `OFFER:APPROVE` - Approve job offers
- `OFFER:SEND` - Send offers to candidates

### Letter Management
- `LETTER:TEMPLATE:VIEW` - View letter templates
- `LETTER:TEMPLATE:CREATE` - Create letter templates
- `LETTER:TEMPLATE:MANAGE` - Manage all templates
- `LETTER:GENERATE` - Generate letters for employees
- `LETTER:APPROVE` - Approve generated letters
- `LETTER:ISSUE` - Issue approved letters
- `LETTER:VIEW` - View issued letters

### E-Signature
- `ESIGNATURE:VIEW` - View signature requests
- `ESIGNATURE:REQUEST` - Create signature requests
- `ESIGNATURE:SIGN` - Sign documents (self)
- `ESIGNATURE:MANAGE` - Manage all signature requests
- `ESIGNATURE:APPROVE` - Approve signature workflows

## Approval Workflow

### L1 Approval (Reporting Manager)
- All approvals route to the immediate reporting manager
- The system identifies the manager from `Employee.managerId`
- No multi-level approval chains in P0

## Data Model

### RolePermission with Scope
```java
@Entity
public class RolePermission {
    UUID roleId;
    UUID permissionId;
    RoleScope scope;  // ALL, LOCATION, DEPARTMENT, TEAM, SELF, CUSTOM
}
```

### CustomScopeTarget
```java
@Entity
public class CustomScopeTarget {
    UUID rolePermissionId;
    TargetType targetType;  // EMPLOYEE, DEPARTMENT, LOCATION
    UUID targetId;
}
```

### EffectivePermission (Computed)
```java
public class EffectivePermission {
    String permissionCode;
    RoleScope effectiveScope;
    Set<UUID> customEmployeeIds;
    Set<UUID> customDepartmentIds;
    Set<UUID> customLocationIds;
}
```

## API Requirements

### Role Management
- Create/update roles with permissions and scopes
- Support custom target selection in role assignment
- API to get effective permissions for a user

### Permission Enforcement
- All controllers must enforce scope-based filtering
- DataScopeService must handle CUSTOM scope
- Team scope must traverse reporting hierarchy

## UI Requirements

### Role Management Page
- Display permissions grouped by module
- Scope selector (dropdown) for each permission
- Custom target picker when CUSTOM scope selected
- Preview of effective access

### Permission Assignment
- Visual representation of scope levels
- Multi-select for custom targets
- Validation preventing conflicting scopes

## Migration Path

1. Add CUSTOM to RoleScope enum
2. Create custom_scope_targets table
3. Update DataScopeService for CUSTOM handling
4. Update Team scope for indirect reports
5. Migrate existing GLOBAL permissions to ALL
6. Update UI components

## Security Considerations

- Custom targets must be validated against tenant
- Scope changes require audit logging
- System roles cannot have scope modified
- Super admin bypasses all scope checks
