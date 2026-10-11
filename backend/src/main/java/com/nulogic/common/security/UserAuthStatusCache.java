package com.nulogic.common.security;

import com.nulogic.domain.user.User;
import com.nulogic.infrastructure.user.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Optional;
import java.util.UUID;

/**
 * Short-TTL cache answering "may this principal still authenticate?" for
 * {@link JwtAuthenticationFilter} (SEC S10-E, GDPR Art. 17 guard).
 *
 * <p>A principal is allowed only when its {@code users} row is visible, is
 * ACTIVE (or LOCKED by the failed-login lockout), has no {@code anonymized_at}
 * marker and belongs to the JWT's tenant. Deactivated / anonymised / soft-deleted users
 * therefore lose access within {@link #TTL} instead of at access-token expiry.</p>
 *
 * <p>Uses {@link StringRedisTemplate} directly (like {@link TokenBlacklistService})
 * rather than {@code @Cacheable}, because the Redis cache manager's default TTL
 * is one hour and this check needs a short one. Only a one-character verdict is
 * stored, never user data. On Redis failure the lookup falls through to the
 * database, so availability of Redis never widens access.</p>
 *
 * <p>The {@code users} table has strict FORCE RLS: callers MUST have
 * {@link TenantContext} set to {@code tenantId} before calling
 * {@link #isActive(UUID, UUID)}, otherwise the row is invisible and the
 * principal is treated as inactive (fail closed).</p>
 */
@Component
@Slf4j
public class UserAuthStatusCache {

    static final Duration TTL = Duration.ofSeconds(30);
    private static final String KEY_PREFIX = "user:auth_status:";
    private static final String ACTIVE = "1";
    private static final String BLOCKED = "0";

    private final UserRepository userRepository;
    private final StringRedisTemplate redisTemplate;

    public UserAuthStatusCache(UserRepository userRepository, StringRedisTemplate redisTemplate) {
        this.userRepository = userRepository;
        this.redisTemplate = redisTemplate;
    }

    public boolean isActive(UUID tenantId, UUID userId) {
        if (tenantId == null || userId == null) {
            return false;
        }
        String key = key(tenantId, userId);
        try {
            String cached = redisTemplate.opsForValue().get(key);
            if (cached != null) {
                return ACTIVE.equals(cached);
            }
        } catch (RuntimeException e) {
            log.debug("User auth-status cache read failed for {}: {}", userId, e.getMessage());
        }

        boolean active = loadFromDatabase(tenantId, userId);
        try {
            redisTemplate.opsForValue().set(key, active ? ACTIVE : BLOCKED, TTL);
        } catch (RuntimeException e) {
            log.debug("User auth-status cache write failed for {}: {}", userId, e.getMessage());
        }
        return active;
    }

    /**
     * Drop the cached verdict so the next request re-reads the database. Call from
     * flows that deactivate or anonymise a user for immediate effect.
     */
    public void evict(UUID tenantId, UUID userId) {
        if (tenantId == null || userId == null) {
            return;
        }
        try {
            redisTemplate.delete(key(tenantId, userId));
        } catch (RuntimeException e) {
            log.warn("User auth-status cache evict failed for {}: {}", userId, e.getMessage());
        }
    }

    private boolean loadFromDatabase(UUID tenantId, UUID userId) {
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            return false;
        }
        User user = userOpt.get();
        return isSessionStatus(user.getStatus())
                && user.getAnonymizedAt() == null
                && tenantId.equals(user.getTenantId());
    }

    /**
     * LOCKED is only ever set by the automatic failed-login lockout
     * ({@link User#recordFailedLogin()}), which gates new logins. Ending live
     * sessions on it would let anyone log a victim out by failing five logins on
     * their email, so it does not withdraw an existing session. INACTIVE,
     * SUSPENDED and PENDING_ACTIVATION (which cannot log in or refresh) do.
     */
    private static boolean isSessionStatus(User.UserStatus status) {
        return status == User.UserStatus.ACTIVE || status == User.UserStatus.LOCKED;
    }

    private static String key(UUID tenantId, UUID userId) {
        return KEY_PREFIX + tenantId + ":" + userId;
    }
}
