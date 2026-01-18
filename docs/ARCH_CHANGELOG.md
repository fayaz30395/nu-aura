# Architecture Change Log

Last Updated: 2026-01-15

## Purpose
Track core architecture and security changes (RBAC, schema, auth, tenancy).

## Template
Date:
Area:
Change:
Reason:
Impact:
Migration:
Rollback:
Owner:
Notes:

---

## 2026-01-15: Keka-Style RBAC Scope Implementation

### Date: 2026-01-15

### Area: RBAC / Security

### Change:
Implemented Keka-style RBAC with fine-grained scope support:

1. **RoleScope Enum Enhancement**
   - Added CUSTOM scope (joins ALL, LOCATION, DEPARTMENT, TEAM, SELF)
   - Scope hierarchy: ALL(100) > LOCATION(80) > DEPARTMENT(60) > TEAM(40) > SELF(20) > CUSTOM(10)
   - Legacy aliases: GLOBAL→ALL, OWN→SELF

2. **CustomScopeTarget Entity**
   - New entity for storing custom scope targets
   - Supports EMPLOYEE, DEPARTMENT, LOCATION target types
   - Linked to RolePermission via foreign key

3. **Database Migration (118-create-custom-scope-targets-table.xml)**
   - Created `custom_scope_targets` table
   - Indexes on role_permission_id and target_type/target_id

4. **DataScopeService Updates**
   - Added CUSTOM scope handling with target resolution
   - TEAM scope now includes indirect reports (recursive hierarchy)
   - New `getCustomPredicate()` method for custom target filtering

5. **ScopeContextService (New)**
   - Loads reportee IDs for TEAM scope (up to 10 levels deep)
   - Loads custom scope targets per permission
   - Called during JWT authentication filter

6. **JwtAuthenticationFilter Updates**
   - Calls ScopeContextService.populateScopeContext()
   - Populates SecurityContext with scope data on each request

7. **Service Layer Scope Filtering**
   - LetterService: getAllLetters(), getPendingApprovals() now use DataScopeService
   - ESignatureService: getAllSignatureRequests() now uses DataScopeService

8. **Controller Security Fixes**
   - LetterController: Replaced client-supplied IDs with SecurityContext
   - ESignatureController: Replaced client-supplied IDs with SecurityContext

### Reason:
- Keka parity for fine-grained data access control
- Support for custom target selection in role management
- TEAM scope must include skip-level reports per requirements

### Impact:
- All list endpoints now respect user's scope
- TEAM scope users see direct + indirect reports
- CUSTOM scope users see only selected targets
- Breaking: Client-supplied approver/creator IDs no longer accepted

### Migration:
- Run Liquibase migration 118 for custom_scope_targets table
- Existing GLOBAL→ALL, OWN→SELF handled by RoleScope.fromString()

### Rollback:
- Drop custom_scope_targets table
- Revert DataScopeService to ignore CUSTOM scope
- Restore client-supplied IDs in controllers (not recommended)

### Owner: Claude Code

### Notes:
- Frontend scope picker already exists in role management UI
- Custom target picker component pending implementation
- L1 approval routing pending (currently uses SecurityContext)

---

