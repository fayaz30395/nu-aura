package com.hrms.common.security;

import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;

import java.util.concurrent.ConcurrentHashMap;
import java.util.Map;

@Service
public class AccountLockoutService {

    private final int MAX_ATTEMPTS = 5;
    private final long LOCK_TIME_DURATION = 15 * 60 * 1000; // 15 minutes

    // Using in-memory map for demo; ideally replace with Redis
    private final Map<String, Integer> attemptsCache = new ConcurrentHashMap<>();
    private final Map<String, Long> lockoutCache = new ConcurrentHashMap<>();

    public void loginFailed(String username) {
        int attempts = attemptsCache.getOrDefault(username, 0) + 1;
        attemptsCache.put(username, attempts);
        if (attempts >= MAX_ATTEMPTS) {
            lockoutCache.put(username, System.currentTimeMillis() + LOCK_TIME_DURATION);
        }
    }

    public void loginSucceeded(String username) {
        attemptsCache.remove(username);
        lockoutCache.remove(username);
    }

    public boolean isAccountLocked(String username) {
        if (!lockoutCache.containsKey(username)) {
            return false;
        }
        long lockTime = lockoutCache.get(username);
        if (System.currentTimeMillis() > lockTime) {
            // Lock expired
            attemptsCache.remove(username);
            lockoutCache.remove(username);
            return false;
        }
        return true;
    }
}
