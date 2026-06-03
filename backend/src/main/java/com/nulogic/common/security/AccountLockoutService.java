package com.nulogic.common.security;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Distributed account lockout service backed by Redis.
 *
 * <p>State is stored in Redis so that lockouts are consistent across all
 * application instances in a cluster (Kubernetes, auto-scaled environments).
 *
 * <p>Keys:
 * <ul>
 *   <li>{@code lockout:attempts:{username}} — integer fail count, TTL = lock window</li>
 *   <li>{@code lockout:locked:{username}}   — presence flag, TTL = lock duration</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AccountLockoutService {

    private static final int MAX_ATTEMPTS = 5;
    private static final Duration ATTEMPTS_WINDOW = Duration.ofMinutes(15);
    private static final Duration LOCK_DURATION = Duration.ofMinutes(15);
    private static final String ATTEMPTS_KEY_PREFIX = "lockout:attempts:";
    private static final String LOCKED_KEY_PREFIX = "lockout:locked:";

    /**
     * Pre-computed BCrypt hash of a static dummy password. Used by
     * {@link #equalizeTiming()} so a "locked" response takes roughly the same
     * wall-clock time as a "wrong password" response, mitigating timing oracles
     * for account-existence and lockout-state enumeration.
     */
    // M-8: cost-12 dummy hash so the timing-equalization bcrypt computation matches
    // the cost of real password verification (now cost 12 in SecurityConfig).
    private static final String DUMMY_HASH =
            "$2a$12$oa9M5BRCTMoTHPdIYdn12OyuQVLnInItNTPdTGuVGZEZZY4x9Uh62";

    private final BCryptPasswordEncoder timingEncoder = new BCryptPasswordEncoder(12);

    private final StringRedisTemplate redis;

    private final Map<String, LocalLockoutState> localLockouts = new ConcurrentHashMap<>();

    @Value("${app.account-lockout.use-redis:true}")
    private boolean useRedis = true;

    /**
     * Records a failed login attempt. Locks the account if {@code MAX_ATTEMPTS}
     * consecutive failures occur within the sliding window.
     */
    public void loginFailed(String username) {
        if (useRedis) {
            try {
                loginFailedRedis(username);
                return;
            } catch (DataAccessException redisDown) {
                log.warn("Redis unavailable for account lockout; using local fallback for {}: {}",
                        username, redisDown.getMessage());
            }
        }
        loginFailedLocal(username);
    }

    private void loginFailedRedis(String username) {
        String attemptsKey = ATTEMPTS_KEY_PREFIX + username;
        String lockedKey = LOCKED_KEY_PREFIX + username;

        Long attempts = redis.opsForValue().increment(attemptsKey);
        // Set / refresh TTL on first write to enforce the sliding window
        if (attempts != null && attempts == 1) {
            redis.expire(attemptsKey, ATTEMPTS_WINDOW);
        }

        if (attempts != null && attempts >= MAX_ATTEMPTS) {
            redis.opsForValue().set(lockedKey, "1", LOCK_DURATION);
            log.warn("Account locked after {} failed attempts: {}", attempts, username);
        } else {
            log.debug("Failed login attempt {}/{} for user: {}", attempts, MAX_ATTEMPTS, username);
        }
    }

    /**
     * Clears all lockout state on successful authentication.
     */
    public void loginSucceeded(String username) {
        if (useRedis) {
            try {
                redis.delete(ATTEMPTS_KEY_PREFIX + username);
                redis.delete(LOCKED_KEY_PREFIX + username);
            } catch (DataAccessException redisDown) {
                log.warn("Redis unavailable while clearing lockout state for {}: {}",
                        username, redisDown.getMessage());
            }
        }
        localLockouts.remove(username);
        log.debug("Lockout state cleared for user: {}", username);
    }

    /**
     * Returns {@code true} if the account is currently locked.
     * Redis TTL handles automatic expiry — no manual time comparison needed.
     */
    public boolean isAccountLocked(String username) {
        if (useRedis) {
            try {
                Boolean locked = redis.hasKey(LOCKED_KEY_PREFIX + username);
                return Boolean.TRUE.equals(locked);
            } catch (DataAccessException redisDown) {
                log.warn("Redis unavailable for account lockout check; using local fallback for {}: {}",
                        username, redisDown.getMessage());
            }
        }
        return isAccountLockedLocal(username);
    }

    /**
     * Burn time equivalent to a real BCrypt comparison so a "locked" or
     * "user-not-found" response cannot be timed apart from a "wrong password"
     * response. Callers should invoke this immediately before throwing the
     * locked / not-found exception.
     *
     * <p>The result is intentionally discarded — only the wall-clock cost matters.
     */
    public void equalizeTiming() {
        // result intentionally ignored; only the BCrypt CPU cost matters here
        boolean ignored = timingEncoder.matches("dummy-password-for-timing", DUMMY_HASH);
        if (ignored) {
            // Unreachable: dummy hash never matches the dummy password.
            log.trace("equalizeTiming() matched (unexpected — DUMMY_HASH may have been corrupted)");
        }
    }

    private void loginFailedLocal(String username) {
        long now = System.currentTimeMillis();
        LocalLockoutState state = localLockouts.compute(username, (key, current) -> {
            LocalLockoutState next = current;
            if (next == null || next.attemptsExpireAtMs <= now) {
                next = new LocalLockoutState();
                next.attemptsExpireAtMs = now + ATTEMPTS_WINDOW.toMillis();
            }

            next.attempts++;
            if (next.attempts >= MAX_ATTEMPTS) {
                next.lockedUntilMs = now + LOCK_DURATION.toMillis();
            }
            return next;
        });

        if (state != null && state.lockedUntilMs > now) {
            log.warn("Account locally locked after {} failed attempts: {}", state.attempts, username);
        } else if (state != null) {
            log.debug("Local failed login attempt {}/{} for user: {}", state.attempts, MAX_ATTEMPTS, username);
        }
    }

    private boolean isAccountLockedLocal(String username) {
        LocalLockoutState state = localLockouts.get(username);
        if (state == null) {
            return false;
        }

        long now = System.currentTimeMillis();
        if (state.lockedUntilMs > now) {
            return true;
        }
        if (state.attemptsExpireAtMs <= now) {
            localLockouts.remove(username);
        }
        return false;
    }

    private static final class LocalLockoutState {
        private int attempts;
        private long attemptsExpireAtMs;
        private long lockedUntilMs;
    }
}
