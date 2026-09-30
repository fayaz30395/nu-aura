package com.nulogic.common.security;

import com.nulogic.common.config.CacheConfig;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionSynchronizationUtils;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Transaction semantics of {@link PermissionCacheEvictor}.
 *
 * <p>Regression for the remediation of 2026-09-26. The evictor originally evicted inline, and
 * {@code ImplicitRoleEngine.recompute} calls it from inside its own {@code @Transactional} method,
 * BEFORE the implicit-role deactivation flushes. In that window a concurrent authorization lookup
 * reloads from a database that still shows the role ACTIVE and re-populates the entry, which then
 * survives for the full 15-minute {@code rolePermissions} TTL — the exact staleness the evictor was
 * added to remove, reintroduced as a race.
 *
 * <p>It is not a narrow window either: {@code recomputeAll} is {@code @Transactional} and calls
 * {@code recompute} on {@code this}, so self-invocation means every user in the tenant is processed
 * inside ONE transaction that commits only after the whole loop finishes.
 *
 * <p>These tests drive {@link TransactionSynchronizationManager} directly rather than booting a
 * context, so the assertions are about the synchronization contract itself: nothing is evicted
 * before completion, a rollback evicts nothing, a commit evicts, and a batch registers exactly one
 * callback.</p>
 */
@DisplayName("PermissionCacheEvictor transaction semantics")
class PermissionCacheEvictorTransactionalTest {

    private static final UUID TENANT_ID = UUID.fromString("550e8400-e29b-41d4-a716-446655440000");
    private static final UUID USER_ID = UUID.fromString("48000000-e001-0000-0000-0000000000a1");
    private static final UUID OTHER_USER_ID = UUID.fromString("48000000-e001-0000-0000-0000000000a2");

    /** A key the evictor must never touch when evicting one user. */
    private static final String UNRELATED_KEY = "scopes:" + TENANT_ID + "::EMPLOYEE";

    private CacheManager cacheManager;
    private PermissionCacheEvictor evictor;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        cacheManager = new ConcurrentMapCacheManager(CacheConfig.ROLE_PERMISSIONS);
        ObjectProvider<CacheManager> provider = Mockito.mock(ObjectProvider.class);
        Mockito.when(provider.getIfAvailable()).thenReturn(cacheManager);
        evictor = new PermissionCacheEvictor(provider);
        seedAuthorizationEntries(USER_ID);
        seedAuthorizationEntries(OTHER_USER_ID);
        cache().put(UNRELATED_KEY, "role-keyed entry");
    }

    @AfterEach
    void tearDown() {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }

    private Cache cache() {
        return cacheManager.getCache(CacheConfig.ROLE_PERMISSIONS);
    }

    private void seedAuthorizationEntries(UUID userId) {
        cache().put(SecurityService.userPermissionsCacheKey(TENANT_ID, userId), "codes");
        cache().put(SecurityService.userPermissionScopesCacheKey(TENANT_ID, userId), "scopes");
    }

    private boolean cachedFor(UUID userId) {
        return cache().get(SecurityService.userPermissionsCacheKey(TENANT_ID, userId)) != null
                || cache().get(SecurityService.userPermissionScopesCacheKey(TENANT_ID, userId)) != null;
    }

    /** Stand in for the transaction manager's completion trigger. */
    private void complete(int status) {
        TransactionSynchronizationUtils.invokeAfterCompletion(
                TransactionSynchronizationManager.getSynchronizations(), status);
        TransactionSynchronizationManager.clearSynchronization();
    }

    @Test
    @DisplayName("1. nothing is evicted before the transaction completes")
    void notEvictedBeforeCommit() {
        TransactionSynchronizationManager.initSynchronization();

        evictor.evictUserPermissions(TENANT_ID, USER_ID);

        assertThat(cachedFor(USER_ID))
                .as("evicting mid-transaction lets a concurrent reader re-cache the pre-commit state")
                .isTrue();
        assertThat(TransactionSynchronizationManager.getSynchronizations())
                .as("the eviction must be deferred via exactly one synchronization")
                .hasSize(1);
    }

    @Test
    @DisplayName("2. rollback evicts nothing — the cached entry was still valid")
    void rollbackPreservesCache() {
        TransactionSynchronizationManager.initSynchronization();
        evictor.evictUserPermissions(TENANT_ID, USER_ID);

        complete(TransactionSynchronization.STATUS_ROLLED_BACK);

        assertThat(cachedFor(USER_ID))
                .as("no state changed, so discarding a valid entry would only cost a needless reload")
                .isTrue();
    }

    @Test
    @DisplayName("3. commit evicts the stale authorization state, and only that user's keys")
    void commitEvicts() {
        TransactionSynchronizationManager.initSynchronization();
        evictor.evictUserPermissions(TENANT_ID, USER_ID);

        complete(TransactionSynchronization.STATUS_COMMITTED);

        assertThat(cachedFor(USER_ID)).as("both entries for the user must be gone").isFalse();
        assertThat(cachedFor(OTHER_USER_ID)).as("another user must be untouched").isTrue();
        assertThat(cache().get(UNRELATED_KEY))
                .as("per-user eviction must not disturb role-keyed entries")
                .isNotNull();
    }

    @Test
    @DisplayName("4. a batch recompute registers ONE callback and leaves no user stale after commit")
    void bulkRecomputeCoalescesAndEvictsEveryUser() {
        TransactionSynchronizationManager.initSynchronization();

        UUID[] users = new UUID[50];
        for (int i = 0; i < users.length; i++) {
            users[i] = UUID.randomUUID();
            seedAuthorizationEntries(users[i]);
            evictor.evictUserPermissions(TENANT_ID, users[i]);
            // Repeat requests for the same user must not add another callback or another entry.
            evictor.evictUserPermissions(TENANT_ID, users[i]);
        }

        assertThat(TransactionSynchronizationManager.getSynchronizations())
                .as("recomputeAll runs in one transaction; it must not register one callback per user")
                .hasSize(1);
        for (UUID user : users) {
            assertThat(cachedFor(user)).as("not evicted before commit").isTrue();
        }

        complete(TransactionSynchronization.STATUS_COMMITTED);

        for (UUID user : users) {
            assertThat(cachedFor(user)).as("every user in the batch must be evicted after commit").isFalse();
        }
    }

    @Test
    @DisplayName("5. cache keys are unchanged — the evictor uses the @Cacheable key builders verbatim")
    void keysAreTheCacheableKeys() {
        assertThat(SecurityService.userPermissionsCacheKey(TENANT_ID, USER_ID))
                .isEqualTo("permissions:" + TENANT_ID + ":" + USER_ID);
        assertThat(SecurityService.userPermissionScopesCacheKey(TENANT_ID, USER_ID))
                .isEqualTo("permissionScopes:" + TENANT_ID + ":" + USER_ID);

        TransactionSynchronizationManager.initSynchronization();
        evictor.evictUserPermissions(TENANT_ID, USER_ID);
        complete(TransactionSynchronization.STATUS_COMMITTED);

        // Proves the eviction addressed those exact keys, not a near-miss.
        assertThat(cache().get(SecurityService.userPermissionsCacheKey(TENANT_ID, USER_ID))).isNull();
        assertThat(cache().get(SecurityService.userPermissionScopesCacheKey(TENANT_ID, USER_ID))).isNull();
    }

    @Test
    @DisplayName("outside a transaction the eviction is immediate — nothing to wait for")
    void noTransactionEvictsImmediately() {
        assertThat(TransactionSynchronizationManager.isSynchronizationActive()).isFalse();

        evictor.evictUserPermissions(TENANT_ID, USER_ID);

        assertThat(cachedFor(USER_ID)).isFalse();
    }

    @Test
    @DisplayName("evictAllPermissions is deferred too, and flushes the whole cache on commit")
    void evictAllIsDeferredUntilCommit() {
        TransactionSynchronizationManager.initSynchronization();

        evictor.evictAllPermissions();
        assertThat(cachedFor(USER_ID)).as("a pre-commit flush would let readers re-cache old roles").isTrue();

        complete(TransactionSynchronization.STATUS_COMMITTED);

        assertThat(cachedFor(USER_ID)).isFalse();
        assertThat(cachedFor(OTHER_USER_ID)).isFalse();
        assertThat(cache().get(UNRELATED_KEY)).as("allEntries covers role-keyed entries too").isNull();
    }

    @Test
    @DisplayName("past the tracking cap the transaction degrades to a full flush, never to less eviction")
    void exceedingTrackingCapDegradesToFullFlush() {
        TransactionSynchronizationManager.initSynchronization();

        for (int i = 0; i <= PermissionCacheEvictor.MAX_TRACKED_USERS; i++) {
            evictor.evictUserPermissions(TENANT_ID, UUID.randomUUID());
        }
        evictor.evictUserPermissions(TENANT_ID, USER_ID);

        assertThat(TransactionSynchronizationManager.getSynchronizations()).hasSize(1);

        complete(TransactionSynchronization.STATUS_COMMITTED);

        assertThat(cachedFor(USER_ID)).as("degrading must still evict the requested user").isFalse();
        assertThat(cachedFor(OTHER_USER_ID)).as("a full flush is broader, which is the safe direction").isFalse();
    }

    @Test
    @DisplayName("a null userId is a no-op and does not register a callback")
    void nullUserIsIgnored() {
        TransactionSynchronizationManager.initSynchronization();

        evictor.evictUserPermissions(TENANT_ID, null);

        assertThat(TransactionSynchronizationManager.getSynchronizations()).isEmpty();
        assertThat(cachedFor(USER_ID)).isTrue();
    }
}
