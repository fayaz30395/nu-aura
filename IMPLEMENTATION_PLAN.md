# Keka-Style RBAC Implementation Plan

## Phase 1: Backend Core (Days 1-3)

### 1.1 Update RoleScope Enum
- Add `CUSTOM` scope to existing enum
- Rename `GLOBAL` to `ALL` for Keka alignment
- Rename `OWN` to `SELF` for Keka alignment
- Add backward compatibility mapping

### 1.2 Create CustomScopeTarget Entity
- New entity to store custom scope targets
- Fields: rolePermissionId, targetType, targetId
- TargetType enum: EMPLOYEE, DEPARTMENT, LOCATION

### 1.3 Database Migrations
- Add `custom_scope_targets` table
- Add indexes for efficient querying
- Migration for renaming scope values

### 1.4 Update DataScopeService
- Add CUSTOM scope handling
- Update TEAM scope for indirect reports
- Add recursive reporting chain traversal
- Implement scope merging for multiple roles

## Phase 2: Permission Updates (Days 4-5)

### 2.1 Add New Permissions
- Letter management permissions (LETTER:*)
- E-Signature permissions (ESIGNATURE:*)
- Recruitment permissions (OFFER:*, INTERVIEW:*)

### 2.2 Update Controllers
- LetterController: DOCUMENT_* -> LETTER_*
- ESignatureController: DOCUMENT_* -> ESIGNATURE_*
- RecruitmentController: Add OFFER_* permissions

### 2.3 Seed Permission Data
- Add new permissions to seed data
- Map default permissions per role matrix

## Phase 3: Service Layer (Days 5-6)

### 3.1 Update RoleManagementService
- Support scope selection in permission assignment
- Support custom target storage
- Implement permission retrieval with scopes

### 3.2 Create EffectivePermissionService
- Compute effective permissions across roles
- Merge scopes (most permissive wins)
- Union custom targets

### 3.3 Update SecurityContext
- Store effective permissions with scopes
- Store merged custom targets
- Add scope-aware permission checks

## Phase 4: Frontend Updates (Days 7-8)

### 4.1 Update Role Management UI
- Add scope selector dropdown per permission
- Add custom target picker component
- Visual indication of scope levels

### 4.2 Update Permission Display
- Show scope badges on permissions
- Group permissions by module
- Search/filter functionality

### 4.3 API Client Updates
- Update role types for scope support
- Add custom target API methods
- Update permission assignment calls

## Phase 5: Testing & Documentation (Days 9-10)

### 5.1 Integration Tests
- Test scope filtering for each scope type
- Test indirect reports in TEAM scope
- Test custom scope target resolution
- Test multi-role permission merging

### 5.2 Unit Tests
- DataScopeService tests
- EffectivePermissionService tests
- SecurityContext tests

### 5.3 Documentation
- Update API documentation
- Update RBAC documentation
- Add scope configuration guide

## Technical Specifications

### Database Schema

```sql
-- Update role_permissions table
ALTER TABLE role_permissions
  ALTER COLUMN scope TYPE VARCHAR(20);

-- Migrate existing values
UPDATE role_permissions SET scope = 'ALL' WHERE scope = 'GLOBAL';
UPDATE role_permissions SET scope = 'SELF' WHERE scope = 'OWN';

-- Create custom_scope_targets table
CREATE TABLE custom_scope_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    role_permission_id UUID NOT NULL REFERENCES role_permissions(id) ON DELETE CASCADE,
    target_type VARCHAR(20) NOT NULL,
    target_id UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID,
    UNIQUE(role_permission_id, target_type, target_id)
);

CREATE INDEX idx_custom_scope_targets_role_permission
    ON custom_scope_targets(role_permission_id);
CREATE INDEX idx_custom_scope_targets_target
    ON custom_scope_targets(target_type, target_id);
```

### API Endpoints

```
# Role Permission Management
PUT  /api/v1/roles/{roleId}/permissions
     Body: { permissions: [{ code: "EMPLOYEE:READ", scope: "TEAM", customTargets: [...] }] }

# Get Effective Permissions
GET  /api/v1/users/{userId}/effective-permissions
     Response: { permissions: [{ code, scope, customTargets }] }

# Custom Target Management
POST /api/v1/roles/{roleId}/permissions/{permissionId}/custom-targets
     Body: { targetType: "EMPLOYEE", targetIds: [...] }

DELETE /api/v1/roles/{roleId}/permissions/{permissionId}/custom-targets/{targetId}
```

### Key Classes

```java
// Updated RoleScope enum
public enum RoleScope {
    ALL,        // Entire tenant (was GLOBAL)
    LOCATION,   // User's location(s)
    DEPARTMENT, // User's department
    TEAM,       // Direct + indirect reports
    SELF,       // Only own data (was OWN)
    CUSTOM      // Specific targets (NEW)
}

// New entity for custom targets
@Entity
@Table(name = "custom_scope_targets")
public class CustomScopeTarget extends TenantAware {
    @ManyToOne
    private RolePermission rolePermission;

    @Enumerated(EnumType.STRING)
    private TargetType targetType;

    private UUID targetId;
}

// Target type enum
public enum TargetType {
    EMPLOYEE,
    DEPARTMENT,
    LOCATION
}

// Effective permission DTO
public record EffectivePermission(
    String permissionCode,
    RoleScope effectiveScope,
    Set<UUID> customEmployeeIds,
    Set<UUID> customDepartmentIds,
    Set<UUID> customLocationIds
) {}
```

## Risk Mitigation

### Breaking Changes
- Maintain backward compatibility with GLOBAL/OWN values
- Add database migration for scope value updates
- Version API endpoints if needed

### Performance
- Cache effective permissions per user
- Use batch queries for custom targets
- Index custom_scope_targets properly

### Security
- Validate custom targets belong to tenant
- Audit all permission changes
- Test scope bypass scenarios

## Success Criteria

1. All scope types filter data correctly
2. TEAM scope includes indirect reports
3. CUSTOM scope resolves to correct targets
4. Multiple roles merge permissions correctly
5. UI allows scope and custom target selection
6. All existing functionality continues working
7. Performance impact < 50ms per request
