package com.hrms.common.security;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

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

    private static final int      MAX_ATTEMPTS          = 5;
    private static final Duration ATTEMPTS_WINDOW       = Duration.ofMinutes(15);
    private static final Duration LOCK_DURATION         = Duration.ofMinutes(15);
    private static final String   ATTEMPTS_KEY_PREFIX   = "lockout:attempts:";
    private static final String   LOCKED_KEY_PREFIX     = "lockout:locked:";

    private final StringRedisTemplate redis;

    /**
     * Records a failed login attempt. Locks the account if {@code MAX_ATTEMPTS}
     * consecutive failures occur within the sliding window.
     */
    public void loginFailed(String username) {
        String attemptsKey = ATTEMPTS_KEY_PREFIX + username;
        String lockedKey   = LOCKED_KEY_PREFIX   + username;

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
        redis.delete(ATTEMPTS_KEY_PREFIX + username);
        redis.delete(LOCKED_KEY_PREFIX   + username);
        log.debug("Lockout state cleared for user: {}", username);
    }

    /**
     * Returns {@code true} if the account is currently locked.
     * Redis TTL handles automatic expiry — no manual time comparison needed.
     */
    public boolean isAccountLocked(String username) {
        Boolean locked = redis.hasKey(LOCKED_KEY_PREFIX + username);
        return Boolean.TRUE.equals(locked);
    }
}
