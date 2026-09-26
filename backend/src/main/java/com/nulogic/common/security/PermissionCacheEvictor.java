package com.nulogic.common.security;

import com.nulogic.common.config.CacheConfig;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.LinkedHashSet;
import java.util.Set;
import java.util.UUID;

/**
 * Targeted eviction of a single user's authorization cache entries.
 *
 * <p>Why this exists. {@link SecurityService#getCachedPermissionsForUser} and
 * {@link SecurityService#getCachedPermissionScopesForUser} are both {@code @Cacheable} in the
 * shared {@link CacheConfig#ROLE_PERMISSIONS} cache, and the scope map is what
 * {@code JwtAuthenticationFilter} turns into the authenticated principal's authorities. Explicit
 * role mutations evict it; implicit roles did not. {@code ImplicitRoleEngine} deactivated an
 * implicit role and then deleted the raw Redis key {@code "permissions:{tenantId}:{userId}"} —
 * but {@code CacheConfig} sets no prefix override, so Spring stores these entries under
 * {@code rolePermissions::permissions:...}. The raw key matched nothing, and a revoked implicit
 * role stayed authoritative until the 15-minute TTL.</p>
 *
 * <h2>Eviction happens AFTER COMMIT, never inside the transaction</h2>
 *
 * <p>An eviction issued mid-transaction is worse than no eviction at all. The write that
 * justifies it is not yet visible to anyone else: {@code ImplicitRoleEngine.recompute}
 * deactivates a managed {@code ImplicitUserRole} whose UPDATE flushes at commit. Evicting before
 * that point opens a window in which a concurrent authorization lookup reloads from a database
 * that still shows the role ACTIVE and re-populates the entry — which then survives for the full
 * TTL. That is exactly the staleness this class was introduced to remove, reintroduced as a race.
 *
 * <p>The window is not incidental. {@code ImplicitRoleEngine.recomputeAll} is itself
 * {@code @Transactional} and calls {@code recompute} on {@code this}, so self-invocation gives no
 * nested transaction: every user in the tenant would be evicted inside ONE transaction that
 * commits only after the whole loop finishes.
 *
 * <p>So when a transaction synchronization is active, the request is recorded and replayed from
 * {@link TransactionSynchronization#afterCompletion(int)} on {@code STATUS_COMMITTED} only:
 *
 * <ul>
 *   <li><b>Commit</b> evicts — the new authorization state is visible, so the reload is correct.</li>
 *   <li><b>Rollback</b> does not evict — nothing changed, and discarding a valid entry would only
 *   cost a needless reload.</li>
 *   <li><b>No transaction</b> evicts immediately; there is nothing to wait for.</li>
 * </ul>
 *
 * <p>{@code afterCompletion} rather than {@code afterCommit}: it is invoked for every outcome, so
 * the per-transaction accumulator is always unbound, and an exception here cannot be mistaken for
 * a commit failure by the caller.</p>
 *
 * <h2>Coalescing</h2>
 *
 * <p>Exactly ONE synchronization is registered per transaction, no matter how many users it
 * touches; requests accumulate into a {@link LinkedHashSet} that de-duplicates repeats. Past
 * {@link #MAX_TRACKED_USERS} distinct users the accumulator stops growing and the transaction
 * degrades to a single {@code allEntries} flush — bounded memory, and strictly MORE eviction than
 * was asked for, never less.</p>
 *
 * <h2>Two further deliberate choices</h2>
 * <ul>
 *   <li><b>The cache abstraction, not RedisTemplate.</b> {@link CacheManager} applies the same
 *   name prefix and serializer that {@code @Cacheable} used, so the key cannot drift from the
 *   annotation's. The key format itself has exactly one definition —
 *   {@link SecurityService#userPermissionsCacheKey} /
 *   {@link SecurityService#userPermissionScopesCacheKey} — and this class calls it rather than
 *   restating it.</li>
 *   <li><b>A collaborator, not {@code @CacheEvict} on the engine.</b> {@code @CacheEvict} on
 *   {@code recompute} would be bypassed by the proxy for every user in a batch recompute (the
 *   self-invocation above), silently, and exactly in the bulk-reorg case where revocations are
 *   most likely. It also fires relative to advisor ordering rather than to the commit, which is
 *   the ordering that actually matters. An explicit call has neither hole.</li>
 * </ul>
 */
@Slf4j
@Component
public class PermissionCacheEvictor {

    /**
     * Distinct users tracked per transaction before degrading to an {@code allEntries} flush.
     * Bounds the accumulator on a tenant-wide {@code recomputeAll} without ever evicting less.
     */
    static final int MAX_TRACKED_USERS = 1_000;

    private final ObjectProvider<CacheManager> cacheManagerProvider;

    public PermissionCacheEvictor(ObjectProvider<CacheManager> cacheManagerProvider) {
        this.cacheManagerProvider = cacheManagerProvider;
    }

    /** One user's two authorization cache entries, as the unit of de-duplication. */
    private record UserKey(UUID tenantId, UUID userId) {
    }

    /** Per-transaction accumulator; replayed once, on commit. */
    private static final class Pending {
        private final Set<UserKey> users = new LinkedHashSet<>();
        private boolean allEntries;

        void add(UserKey key) {
            if (allEntries) {
                return;
            }
            if (users.size() >= MAX_TRACKED_USERS) {
                // Degrade rather than grow without bound. Strictly broader, so still correct.
                users.clear();
                allEntries = true;
                return;
            }
            users.add(key);
        }

        void addAllEntries() {
            users.clear();
            allEntries = true;
        }
    }

    /**
     * Drop both authorization cache entries for one user, so the next authorization lookup
     * reloads from the database instead of waiting out the TTL.
     *
     * <p>Deferred to after commit when a transaction is active — see the class javadoc for why
     * evicting mid-transaction is unsafe. Null-safe and never throws: a failed eviction must not
     * roll back the role recompute that triggered it. The worst case on failure is the
     * pre-existing staleness window, and it is logged at WARN rather than swallowed.</p>
     */
    public void evictUserPermissions(UUID tenantId, UUID userId) {
        if (userId == null) {
            return;
        }
        if (deferUntilAfterCommit(pending -> pending.add(new UserKey(tenantId, userId)))) {
            log.debug("Deferred permission-cache eviction for user {} in tenant {} until commit",
                    userId, tenantId);
            return;
        }
        evictUserNow(tenantId, userId);
    }

    /**
     * Drop every entry in the authorization cache, after commit.
     *
     * <p>For mutations whose effect is not reachable from a single user key — an explicit role's
     * permission set changing, which alters authority for every holder of that role. Same
     * after-commit contract as {@link #evictUserPermissions}: a pre-commit flush would let any
     * concurrent request re-cache the pre-mutation state for the full TTL.</p>
     */
    public void evictAllPermissions() {
        if (deferUntilAfterCommit(Pending::addAllEntries)) {
            log.debug("Deferred full permission-cache flush until commit");
            return;
        }
        evictAllNow();
    }

    /**
     * Record the request on the current transaction's accumulator, registering the single
     * synchronization on first use.
     *
     * <p>The accumulator is a field of the synchronization rather than a
     * {@code TransactionSynchronizationManager} resource. {@code getSynchronizations()} is already
     * scoped to the current transaction and is cleared with it, so there is no separate
     * bind/unbind lifecycle to leak: a synchronization list that was cleared without completing
     * simply yields no match and the next request registers afresh. A bound resource, by contrast,
     * survives {@code clearSynchronization()} and would suppress registration for the NEXT
     * transaction on the same thread — silently dropping its evictions.</p>
     *
     * @return true when the work was deferred, false when there is no transaction to defer to
     */
    private boolean deferUntilAfterCommit(java.util.function.Consumer<Pending> request) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            return false;
        }
        EvictAfterCommit sync = null;
        for (TransactionSynchronization registered : TransactionSynchronizationManager.getSynchronizations()) {
            if (registered instanceof EvictAfterCommit existing) {
                sync = existing;
                break;
            }
        }
        if (sync == null) {
            sync = new EvictAfterCommit();
            TransactionSynchronizationManager.registerSynchronization(sync);
        }
        request.accept(sync.pending);
        return true;
    }

    /**
     * Replays the accumulated evictions once the transaction has actually committed.
     *
     * <p>{@code afterCompletion} rather than {@code afterCommit}: it runs for every outcome, and an
     * exception raised here cannot be mistaken by the caller for a commit failure. Only
     * {@code STATUS_COMMITTED} evicts.</p>
     */
    private final class EvictAfterCommit implements TransactionSynchronization {

        private final Pending pending = new Pending();

        @Override
        public void afterCompletion(int status) {
            if (status != STATUS_COMMITTED) {
                // Rolled back or unknown: nothing changed, so the cached entries are still valid.
                log.debug("Transaction did not commit (status {}); permission cache left intact", status);
                return;
            }
            if (pending.allEntries) {
                evictAllNow();
                return;
            }
            for (UserKey key : pending.users) {
                evictUserNow(key.tenantId(), key.userId());
            }
        }
    }

    private void evictUserNow(UUID tenantId, UUID userId) {
        Cache cache = resolveCache();
        if (cache == null) {
            return;
        }
        try {
            cache.evict(SecurityService.userPermissionsCacheKey(tenantId, userId));
            cache.evict(SecurityService.userPermissionScopesCacheKey(tenantId, userId));
            log.debug("Evicted permission and permission-scope cache entries for user {} in tenant {}",
                    userId, tenantId);
        } catch (RuntimeException e) {
            log.warn("Failed to evict permission cache for user {} in tenant {}: {}",
                    userId, tenantId, e.getMessage());
        }
    }

    private void evictAllNow() {
        Cache cache = resolveCache();
        if (cache == null) {
            return;
        }
        try {
            cache.clear();
            log.debug("Cleared cache {}", CacheConfig.ROLE_PERMISSIONS);
        } catch (RuntimeException e) {
            log.warn("Failed to clear cache {}: {}", CacheConfig.ROLE_PERMISSIONS, e.getMessage());
        }
    }

    private Cache resolveCache() {
        CacheManager cacheManager = cacheManagerProvider.getIfAvailable();
        if (cacheManager == null) {
            log.debug("No CacheManager available; nothing to evict");
            return null;
        }
        Cache cache = cacheManager.getCache(CacheConfig.ROLE_PERMISSIONS);
        if (cache == null) {
            log.warn("Cache {} is not configured; permission cache was not evicted",
                    CacheConfig.ROLE_PERMISSIONS);
        }
        return cache;
    }
}
