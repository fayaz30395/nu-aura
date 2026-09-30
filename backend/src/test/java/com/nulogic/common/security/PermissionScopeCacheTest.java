package com.nulogic.common.security;

import com.nulogic.application.user.service.RoleManagementService;
import com.nulogic.common.config.CacheConfig;
import com.nulogic.domain.user.Permission;
import com.nulogic.domain.user.Role;
import com.nulogic.domain.user.RolePermission;
import com.nulogic.domain.user.RoleScope;
import com.nulogic.infrastructure.user.repository.ImplicitUserRoleRepository;
import com.nulogic.infrastructure.user.repository.RoleRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;

import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * PERF/SEC regression for the permission-scope loaders on the authentication hot path.
 *
 * <p>When permissions were moved out of the JWT, {@code JwtAuthenticationFilter} began calling
 * {@link SecurityService#getCachedPermissionScopesForUser} on every cookie-authenticated
 * request. The scope-preserving rewrite (SEC-1) kept the "cached" name but dropped the
 * {@code @Cacheable} that the method it replaced carried, so each request re-ran
 * {@code findByTenantIdWithPermissions} — every role in the tenant joined to every
 * role_permissions and permissions row — plus an implicit-role lookup.</p>
 *
 * <p>These tests pin all three properties that have to hold together:
 * <ol>
 *   <li>repeated lookups for the same user hit the cache (one DB load, not N),</li>
 *   <li>a role/permission mutation evicts it, so SEC-1's scope fix cannot be served stale,</li>
 *   <li>the scope itself still survives the cached path — a SELF grant is never widened.</li>
 * </ol>
 * The context here is deliberately tiny: the real {@code @Cacheable} proxy over the real
 * service, with the repositories mocked, so a dropped or mis-keyed annotation fails loudly
 * instead of being masked by an application context that caches somewhere else.</p>
 */
@ExtendWith(SpringExtension.class)
@SpringJUnitConfig(PermissionScopeCacheTest.CachingTestConfig.class)
@DisplayName("Permission-scope cache on the auth hot path")
class PermissionScopeCacheTest {

    private static final UUID TENANT_ID = UUID.fromString("550e8400-e29b-41d4-a716-446655440000");
    private static final UUID USER_ID = UUID.fromString("48000000-e001-0000-0000-0000000000a1");
    private static final UUID OTHER_USER_ID = UUID.fromString("48000000-e001-0000-0000-0000000000a2");

    @Configuration
    @EnableCaching
    static class CachingTestConfig {

        @Bean
        CacheManager cacheManager() {
            return new ConcurrentMapCacheManager(CacheConfig.ROLE_PERMISSIONS);
        }

        @Bean
        RoleRepository roleRepository() {
            return Mockito.mock(RoleRepository.class);
        }

        @Bean
        ImplicitUserRoleRepository implicitUserRoleRepository() {
            return Mockito.mock(ImplicitUserRoleRepository.class);
        }

        @Bean
        SecurityService securityService(RoleRepository roleRepository,
                                        ImplicitUserRoleRepository implicitUserRoleRepository) {
            return new SecurityService(roleRepository, implicitUserRoleRepository);
        }

        @Bean
        PermissionCacheEvictor permissionCacheEvictor(
                org.springframework.beans.factory.ObjectProvider<CacheManager> cacheManagerProvider) {
            return new PermissionCacheEvictor(cacheManagerProvider);
        }
    }

    @Autowired
    private SecurityService securityService;
    @Autowired
    private RoleRepository roleRepository;
    @Autowired
    private ImplicitUserRoleRepository implicitUserRoleRepository;
    @Autowired
    private CacheManager cacheManager;
    @Autowired
    private PermissionCacheEvictor permissionCacheEvictor;

    @BeforeEach
    void setUp() {
        Mockito.reset(roleRepository, implicitUserRoleRepository);
        cacheManager.getCache(CacheConfig.ROLE_PERMISSIONS).clear();
        TenantContext.setCurrentTenant(TENANT_ID);

        Role employee = role("EMPLOYEE", "EXPENSE:VIEW", RoleScope.SELF);
        when(roleRepository.findByTenantIdWithPermissions(TENANT_ID)).thenReturn(List.of(employee));
        when(roleRepository.findByCodeInAndTenantId(anyCollection(), any())).thenReturn(List.of(employee));
        when(implicitUserRoleRepository.findByUserIdAndTenantIdAndIsActiveTrue(any(), any()))
                .thenReturn(List.of());
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    @DisplayName("repeated lookups for the same user hit the cache — one DB load, not one per request")
    void repeatedLookupsAreServedFromCache() {
        for (int i = 0; i < 5; i++) {
            securityService.getCachedPermissionScopesForUser(USER_ID, Set.of("EMPLOYEE"));
        }

        verify(roleRepository, times(1)).findByTenantIdWithPermissions(TENANT_ID);
        verify(implicitUserRoleRepository, times(1))
                .findByUserIdAndTenantIdAndIsActiveTrue(USER_ID, TENANT_ID);
    }

    @Test
    @DisplayName("a different user is a different cache entry")
    void differentUsersDoNotShareACacheEntry() {
        securityService.getCachedPermissionScopesForUser(USER_ID, Set.of("EMPLOYEE"));
        securityService.getCachedPermissionScopesForUser(OTHER_USER_ID, Set.of("EMPLOYEE"));

        verify(roleRepository, times(2)).findByTenantIdWithPermissions(TENANT_ID);
    }

    @Test
    @DisplayName("evicting the cache forces a reload — a role change cannot be served stale")
    void evictionForcesReload() {
        securityService.getCachedPermissionScopesForUser(USER_ID, Set.of("EMPLOYEE"));

        // What RoleManagementService's @CacheEvict(allEntries = true) does on every mutation.
        cacheManager.getCache(CacheConfig.ROLE_PERMISSIONS).clear();

        securityService.getCachedPermissionScopesForUser(USER_ID, Set.of("EMPLOYEE"));

        verify(roleRepository, times(2)).findByTenantIdWithPermissions(TENANT_ID);
    }

    @Test
    @DisplayName("SEC-1 holds through the cached path: a SELF grant is never widened to ALL")
    void cachedPathPreservesScope() {
        Map<String, RoleScope> first =
                securityService.getCachedPermissionScopesForUser(USER_ID, Set.of("EMPLOYEE"));
        Map<String, RoleScope> cached =
                securityService.getCachedPermissionScopesForUser(USER_ID, Set.of("EMPLOYEE"));

        assertThat(first).containsEntry("EXPENSE:VIEW", RoleScope.SELF);
        assertThat(cached)
                .as("the cached copy must carry the same narrow scope, not RoleScope.ALL")
                .containsEntry("EXPENSE:VIEW", RoleScope.SELF);
    }

    @Test
    @DisplayName("with no tenant context the result is empty and is not cached")
    void noTenantContextIsNotCached() {
        TenantContext.clear();

        Map<String, RoleScope> scopes =
                securityService.getCachedPermissionScopesForUser(USER_ID, Set.of("EMPLOYEE"));

        assertThat(scopes).isEmpty();
        assertThat(cacheManager.getCache(CacheConfig.ROLE_PERMISSIONS)
                .get("permissionScopes:NO_TENANT::" + USER_ID))
                .as("an empty no-tenant result must never be cached — it would deny a later "
                        + "request that does carry a tenant")
                .isNull();
    }

    @Test
    @DisplayName("the role-keyed scope loader normalises role order into one cache entry")
    void roleOrderDoesNotSplitTheCacheEntry() {
        securityService.getCachedPermissionScopes(List.of("EMPLOYEE", "MANAGER"));
        securityService.getCachedPermissionScopes(List.of("MANAGER", "EMPLOYEE"));

        verify(roleRepository, times(1)).findByCodeInAndTenantId(anyCollection(), any());
    }

    /**
     * The cache above is only safe because every mutating path evicts it. This asserts the
     * contract rather than trusting it: if a future edit drops {@code allEntries = true} or
     * points the eviction at another cache, a stale permission set could outlive a revocation.
     */
    @Test
    @DisplayName("every role mutation on RoleManagementService evicts the whole permission cache")
    void roleMutationsEvictThePermissionCache() {
        List<Method> evicting = Arrays.stream(RoleManagementService.class.getDeclaredMethods())
                .filter(m -> m.isAnnotationPresent(CacheEvict.class))
                .toList();

        assertThat(evicting)
                .as("RoleManagementService must still carry @CacheEvict on its mutating methods")
                .isNotEmpty();

        for (Method method : evicting) {
            CacheEvict evict = method.getAnnotation(CacheEvict.class);
            assertThat(evict.value())
                    .as("%s must evict the %s cache", method.getName(), CacheConfig.ROLE_PERMISSIONS)
                    .contains(CacheConfig.ROLE_PERMISSIONS);
            assertThat(evict.allEntries())
                    .as("%s must evict ALL entries — the user-keyed and role-keyed scope entries "
                            + "are not reachable from a single key", method.getName())
                    .isTrue();
        }
    }

    // ── implicit-role revocation (SEC: cache invalidation) ────────────────────────

    /**
     * The key the evictor builds must be byte-identical to the one {@code @Cacheable} wrote,
     * or eviction is a no-op that looks like it worked. This asserts the generated key directly
     * rather than inferring it: the entry is created through the real proxy, then looked up by
     * the key {@link SecurityService#userPermissionScopesCacheKey} produces.
     */
    @Test
    @DisplayName("the evictor's key is the same key @Cacheable generated")
    void evictorKeyMatchesTheGeneratedCacheKey() {
        securityService.getCachedPermissionScopesForUser(USER_ID, Set.of("EMPLOYEE"));
        securityService.getCachedPermissionsForUser(USER_ID, Set.of("EMPLOYEE"));

        Cache cache = cacheManager.getCache(CacheConfig.ROLE_PERMISSIONS);
        String scopesKey = SecurityService.userPermissionScopesCacheKey(TENANT_ID, USER_ID);
        String codesKey = SecurityService.userPermissionsCacheKey(TENANT_ID, USER_ID);

        assertThat(cache.get(scopesKey))
                .as("the scopes entry must be reachable at %s — if it is not, every eviction "
                        + "built from this key silently misses", scopesKey)
                .isNotNull();
        assertThat(cache.get(codesKey))
                .as("the codes entry must be reachable at %s", codesKey)
                .isNotNull();

        permissionCacheEvictor.evictUserPermissions(TENANT_ID, USER_ID);

        assertThat(cache.get(scopesKey)).as("scopes entry after eviction").isNull();
        assertThat(cache.get(codesKey)).as("codes entry after eviction").isNull();
    }

    /**
     * Pins the actual defect, so a revert to raw-key invalidation fails loudly: the key the old
     * code deleted ({@code "permissions:{tenantId}:{userId}"}, passed straight to RedisTemplate)
     * is not where the cache entry lives. Under RedisCacheManager the stored key is
     * {@code rolePermissions::permissions:...} because CacheConfig sets no prefix override; the
     * un-prefixed form addresses nothing at all.
     */
    @Test
    @DisplayName("the old raw-Redis key does not address the cached entry")
    void rawRedisKeyDoesNotMatchTheCacheEntry() {
        securityService.getCachedPermissionScopesForUser(USER_ID, Set.of("EMPLOYEE"));

        Cache cache = cacheManager.getCache(CacheConfig.ROLE_PERMISSIONS);
        String rawLegacyKey = String.format("permissions:%s:%s", TENANT_ID, USER_ID);

        // Evicting the legacy key leaves the real entry intact — which is exactly why a revoked
        // implicit role used to survive until the TTL.
        cache.evict(rawLegacyKey);

        assertThat(cache.get(SecurityService.userPermissionScopesCacheKey(TENANT_ID, USER_ID)))
                .as("the scopes entry must still be present: the legacy raw key never reached it")
                .isNotNull();

        // And the correct key does reach it.
        permissionCacheEvictor.evictUserPermissions(TENANT_ID, USER_ID);
        assertThat(cache.get(SecurityService.userPermissionScopesCacheKey(TENANT_ID, USER_ID))).isNull();
    }

    /**
     * The full revocation path, end to end, as it happens in production:
     * a user picks up a permission through an implicit role, the scope map is cached, the
     * implicit role is deactivated, the cache is evicted, and the very next authorization
     * lookup must already reflect the revocation — not 15 minutes later when the TTL expires.
     */
    @Test
    @DisplayName("a revoked implicit role is gone from the next lookup, not 15 minutes later")
    void revokedImplicitRoleIsReflectedImmediately() {
        Role managerRole = role("MANAGER", "EXPENSE:VIEW_TEAM", RoleScope.TEAM);
        when(roleRepository.findByTenantIdWithPermissions(TENANT_ID))
                .thenReturn(List.of(role("EMPLOYEE", "EXPENSE:VIEW", RoleScope.SELF), managerRole));
        when(roleRepository.findByCodeInAndTenantId(anyCollection(), any()))
                .thenReturn(List.of(role("EMPLOYEE", "EXPENSE:VIEW", RoleScope.SELF)));

        // 1. the user holds the elevated permission through an ACTIVE implicit role
        com.nulogic.domain.user.ImplicitUserRole implicit = new com.nulogic.domain.user.ImplicitUserRole();
        implicit.setRoleId(managerRole.getId());
        implicit.setUserId(USER_ID);
        implicit.setTenantId(TENANT_ID);
        implicit.setIsActive(true);
        when(implicitUserRoleRepository.findByUserIdAndTenantIdAndIsActiveTrue(USER_ID, TENANT_ID))
                .thenReturn(List.of(implicit));

        Map<String, RoleScope> granted =
                securityService.getCachedPermissionScopesForUser(USER_ID, Set.of("EMPLOYEE"));
        assertThat(granted)
                .as("the implicit MANAGER role must contribute its permission")
                .containsEntry("EXPENSE:VIEW_TEAM", RoleScope.TEAM);

        // 2. it is cached — a second lookup does not hit the database
        securityService.getCachedPermissionScopesForUser(USER_ID, Set.of("EMPLOYEE"));
        verify(implicitUserRoleRepository, times(1))
                .findByUserIdAndTenantIdAndIsActiveTrue(USER_ID, TENANT_ID);

        // 3. the implicit role is deactivated (what ImplicitRoleEngine does on recompute)
        when(implicitUserRoleRepository.findByUserIdAndTenantIdAndIsActiveTrue(USER_ID, TENANT_ID))
                .thenReturn(List.of());

        // 3a. without eviction the revocation is invisible — this is the bug being fixed
        assertThat(securityService.getCachedPermissionScopesForUser(USER_ID, Set.of("EMPLOYEE")))
                .as("a stale cache still serves the revoked permission")
                .containsKey("EXPENSE:VIEW_TEAM");

        // 4. the engine evicts through PermissionCacheEvictor
        permissionCacheEvictor.evictUserPermissions(TENANT_ID, USER_ID);

        // 5. the next authorization lookup reflects the revocation immediately
        Map<String, RoleScope> afterRevocation =
                securityService.getCachedPermissionScopesForUser(USER_ID, Set.of("EMPLOYEE"));
        assertThat(afterRevocation)
                .as("the revoked implicit permission must be gone on the very next lookup")
                .doesNotContainKey("EXPENSE:VIEW_TEAM");
        assertThat(afterRevocation)
                .as("the user's own explicit grant must survive the eviction")
                .containsEntry("EXPENSE:VIEW", RoleScope.SELF);
    }

    @Test
    @DisplayName("evicting one user does not evict another user's entry")
    void evictionIsScopedToOneUser() {
        securityService.getCachedPermissionScopesForUser(USER_ID, Set.of("EMPLOYEE"));
        securityService.getCachedPermissionScopesForUser(OTHER_USER_ID, Set.of("EMPLOYEE"));

        permissionCacheEvictor.evictUserPermissions(TENANT_ID, USER_ID);

        Cache cache = cacheManager.getCache(CacheConfig.ROLE_PERMISSIONS);
        assertThat(cache.get(SecurityService.userPermissionScopesCacheKey(TENANT_ID, USER_ID)))
                .isNull();
        assertThat(cache.get(SecurityService.userPermissionScopesCacheKey(TENANT_ID, OTHER_USER_ID)))
                .as("an implicit-role change for one user must not flush the auth hot-path cache "
                        + "for everyone else")
                .isNotNull();
    }

    /**
     * The user-keyed cache entries deliberately do not include {@code explicitRoleCodes} in the
     * key. That is only safe because the roles claim is not an independent input: the roles a
     * user has are themselves a function of the (tenantId, userId) rows this cache is keyed by,
     * and every path that changes them evicts. This pins the half of that argument which lives
     * in code — {@code assignRolesToUser} is the method that changes a user's explicit roles,
     * and it must evict.
     */
    @Test
    @DisplayName("assigning roles to a user evicts the cache, which is why the key omits the role codes")
    void userRoleAssignmentEvictsTheCache() throws NoSuchMethodException {
        Method assignRoles = RoleManagementService.class.getDeclaredMethod(
                "assignRolesToUser", UUID.class,
                com.nulogic.api.user.dto.AssignRolesRequest.class);

        CacheEvict evict = assignRoles.getAnnotation(CacheEvict.class);
        assertThat(evict)
                .as("assignRolesToUser changes the explicitRoleCodes that the cache key omits; "
                        + "without an eviction here the omission would be unsafe")
                .isNotNull();
        assertThat(evict.value()).contains(CacheConfig.ROLE_PERMISSIONS);
        assertThat(evict.allEntries()).isTrue();
    }

    /**
     * The cache-key design depends on EVERY path that changes a user's explicit roles evicting.
     * There are two such paths, not one: {@code RoleManagementService.assignRolesToUser} (the
     * tenant role-management API) and {@code AdminService.updateUserRole} (the SuperAdmin admin
     * API). The second was missed — it mutated {@code user.setRoles(...)} and saved with no
     * eviction at all, so a demotion made through the admin API kept serving the old role's
     * permissions until the 15-minute TTL, and a re-login inside that window hit the same stale
     * entry. This test names both paths so a future edit cannot drop either one silently.
     */
    @Test
    @DisplayName("the tenant role-management path still evicts via @CacheEvict")
    void tenantRoleManagementPathEvicts() throws NoSuchMethodException {
        Method tenantPath = RoleManagementService.class.getDeclaredMethod(
                "assignRolesToUser", UUID.class,
                com.nulogic.api.user.dto.AssignRolesRequest.class);

        CacheEvict evict = tenantPath.getAnnotation(CacheEvict.class);
        assertThat(evict)
                .as("assignRolesToUser mutates a user's explicit roles, so it must evict the "
                        + "authorization cache — otherwise the cache key's omission of "
                        + "explicitRoleCodes is unsafe through this path")
                .isNotNull();
        assertThat(evict.value()).contains(CacheConfig.ROLE_PERMISSIONS);
        assertThat(evict.allEntries())
                .as("assignRolesToUser must evict ALL entries")
                .isTrue();
    }

    /**
     * The admin path is asserted behaviourally, not by annotation shape.
     *
     * <p>{@code AdminService.updateUserRole} deliberately no longer carries {@code @CacheEvict}: the
     * annotation fires relative to advisor ordering, and {@code CacheEvictTransactionOrderingTest}
     * shows that ordering is unspecified here (cache and transaction advisors both sit at
     * {@code LOWEST_PRECEDENCE}). It now calls {@link PermissionCacheEvictor#evictAllPermissions()},
     * which defers to after commit. {@code AdminServiceRoleUpdateCacheEvictionTest} verifies the
     * call actually happens; this test only pins that the dependency is wired, so the admin path
     * cannot lose its eviction by having the collaborator quietly dropped.</p>
     */
    @Test
    @DisplayName("the admin path holds a PermissionCacheEvictor — see AdminServiceRoleUpdateCacheEvictionTest")
    void adminPathIsWiredToTheEvictor() {
        assertThat(com.nulogic.application.admin.service.AdminService.class.getDeclaredFields())
                .as("AdminService.updateUserRole must still have a way to evict the authorization cache")
                .anyMatch(field -> field.getType().equals(PermissionCacheEvictor.class));
    }

    // ── fixtures ──────────────────────────────────────────────────────────────────

    private static Role role(String code, String permissionCode, RoleScope scope) {
        Permission permission = new Permission();
        permission.setCode(permissionCode);

        RolePermission rolePermission = new RolePermission();
        rolePermission.setPermission(permission);
        rolePermission.setScope(scope);

        Role role = new Role();
        role.setId(UUID.randomUUID());
        role.setCode(code);
        role.setTenantId(TENANT_ID);
        role.setPermissions(new java.util.HashSet<>(Set.of(rolePermission)));
        return role;
    }
}
