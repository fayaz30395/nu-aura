package com.nulogic.common.security;

import com.nulogic.domain.user.Permission;
import com.nulogic.domain.user.Role;
import com.nulogic.domain.user.RolePermission;
import com.nulogic.domain.user.RoleScope;
import com.nulogic.infrastructure.user.repository.ImplicitUserRoleRepository;
import com.nulogic.infrastructure.user.repository.RoleRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.when;

/**
 * Guards the authorization defect where every database-loaded permission was assigned
 * {@code RoleScope.GLOBAL} (which aliases {@code RoleScope.ALL}), silently promoting every
 * SELF/TEAM/DEPARTMENT grant to tenant-wide access.
 *
 * <p>The practical impact was that {@code LEAVE:VIEW_SELF} — a grant whose entire meaning is
 * "your own records" — authorised reading any employee's leave request. The scope is the
 * authorization decision, so these tests assert it survives resolution intact.</p>
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("Permission scope resolution")
class PermissionScopeResolutionTest {

    private static final UUID TENANT_ID = UUID.randomUUID();

    @Mock
    private RoleRepository roleRepository;
    @Mock
    private ImplicitUserRoleRepository implicitUserRoleRepository;

    @InjectMocks
    private SecurityService securityService;

    @AfterEach
    void clearTenant() {
        TenantContext.clear();
    }

    private static Permission permission(String code) {
        Permission p = new Permission();
        p.setCode(code);
        return p;
    }

    private static Role roleWith(String code, Map<String, RoleScope> grants) {
        Role role = new Role();
        role.setId(UUID.randomUUID());
        role.setCode(code);
        role.setTenantId(TENANT_ID);
        java.util.Set<RolePermission> perms = new java.util.HashSet<>();
        grants.forEach((permCode, scope) -> {
            RolePermission rp = new RolePermission();
            rp.setPermission(permission(permCode));
            rp.setScope(scope);
            perms.add(rp);
        });
        role.setPermissions(perms);
        return role;
    }

    @Test
    @DisplayName("a SELF-scoped grant resolves as SELF, not ALL")
    void selfScopedGrantIsNotPromotedToAll() {
        TenantContext.setCurrentTenant(TENANT_ID);
        Role employee = roleWith("EMPLOYEE", Map.of(
                "LEAVE:VIEW_SELF", RoleScope.SELF,
                "LEAVE:REQUEST", RoleScope.SELF));
        when(roleRepository.findByCodeInAndTenantId(anyCollection(), any())).thenReturn(List.of(employee));

        Map<String, RoleScope> scopes = securityService.getCachedPermissionScopes(Set.of("EMPLOYEE"));

        assertThat(scopes).containsEntry("LEAVE:VIEW_SELF", RoleScope.SELF);
        assertThat(scopes.get("LEAVE:VIEW_SELF"))
                .as("SELF must not be promoted to ALL — that is the defect this guards")
                .isNotEqualTo(RoleScope.ALL);
    }

    @Test
    @DisplayName("RoleScope.GLOBAL is an alias for ALL, so it can never be a safe default")
    void globalAliasesAll() {
        // Documents WHY hardcoding GLOBAL was a privilege escalation rather than a neutral default.
        assertThat(RoleScope.GLOBAL).isSameAs(RoleScope.ALL);
    }

    @Test
    @DisplayName("distinct scopes are preserved per permission, not collapsed")
    void distinctScopesArePreserved() {
        TenantContext.setCurrentTenant(TENANT_ID);
        Role lead = roleWith("TEAM_LEAD", Map.of(
                "LEAVE:VIEW_SELF", RoleScope.SELF,
                "LEAVE:VIEW_TEAM", RoleScope.TEAM,
                "ANNOUNCEMENT:VIEW", RoleScope.ALL));
        when(roleRepository.findByCodeInAndTenantId(anyCollection(), any())).thenReturn(List.of(lead));

        Map<String, RoleScope> scopes = securityService.getCachedPermissionScopes(Set.of("TEAM_LEAD"));

        assertThat(scopes)
                .containsEntry("LEAVE:VIEW_SELF", RoleScope.SELF)
                .containsEntry("LEAVE:VIEW_TEAM", RoleScope.TEAM)
                .containsEntry("ANNOUNCEMENT:VIEW", RoleScope.ALL);
    }

    @Test
    @DisplayName("when one permission arrives via two roles, the broader scope wins")
    void broaderScopeWinsAcrossRoles() {
        TenantContext.setCurrentTenant(TENANT_ID);
        Role narrow = roleWith("EMPLOYEE", Map.of("LEAVE:VIEW_SELF", RoleScope.SELF));
        Role broad = roleWith("HR_ADMIN", Map.of("LEAVE:VIEW_SELF", RoleScope.ALL));
        when(roleRepository.findByCodeInAndTenantId(anyCollection(), any()))
                .thenReturn(List.of(narrow, broad));

        Map<String, RoleScope> scopes = securityService.getCachedPermissionScopes(Set.of("EMPLOYEE", "HR_ADMIN"));

        assertThat(scopes)
                .as("narrowing a scope the user legitimately holds would wrongly deny access")
                .containsEntry("LEAVE:VIEW_SELF", RoleScope.ALL);
    }

    @Test
    @DisplayName("no tenant context yields no permissions rather than a permissive default")
    void missingTenantContextDeniesRatherThanDefaults() {
        TenantContext.clear();

        Map<String, RoleScope> scopes = securityService.getCachedPermissionScopes(Set.of("EMPLOYEE"));

        assertThat(scopes).isEmpty();
    }
}
