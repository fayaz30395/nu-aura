package com.hrms.application.knowledge.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

/**
 * Redis-based edit lock service for NU-Fluence content.
 * Prevents concurrent editing conflicts by allowing only one user at a time
 * to hold an edit lock on a given piece of content.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class FluenceEditLockService {

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    private static final long LOCK_TTL_MINUTES = 5;
    private static final String KEY_PREFIX = "fluence:edit-lock:";

    /**
     * Attempt to acquire an edit lock on a piece of content.
     *
     * @param tenantId    tenant context
     * @param contentType WIKI or BLOG
     * @param contentId   ID of the content
     * @param userId      the user requesting the lock
     * @param userName    display name for lock holder info
     * @return lock info: if lock was acquired by this user, or who currently holds it
     */
    public EditLockInfo acquireLock(UUID tenantId, String contentType, UUID contentId,
                                    UUID userId, String userName) {
        String key = buildKey(tenantId, contentType, contentId);
        String existingValue = redisTemplate.opsForValue().get(key);

        if (existingValue != null) {
            EditLockInfo existing = deserialize(existingValue);
            if (existing != null && !existing.userId().equals(userId.toString())) {
                // Lock held by another user
                return existing;
            }
        }

        // Acquire or refresh the lock
        EditLockInfo lockInfo = new EditLockInfo(
                userId.toString(),
                userName,
                LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
        );
        redisTemplate.opsForValue().set(key, serialize(lockInfo), LOCK_TTL_MINUTES, TimeUnit.MINUTES);

        log.debug("Edit lock acquired for {} {} by user {} (tenant {})", contentType, contentId, userId, tenantId);
        return lockInfo;
    }

    /**
     * Release an edit lock, but only if the requesting user owns it.
     *
     * @param tenantId    tenant context
     * @param contentType WIKI or BLOG
     * @param contentId   ID of the content
     * @param userId      the user requesting release
     * @return true if the lock was released
     */
    public boolean releaseLock(UUID tenantId, String contentType, UUID contentId, UUID userId) {
        String key = buildKey(tenantId, contentType, contentId);
        String existingValue = redisTemplate.opsForValue().get(key);

        if (existingValue == null) {
            return true; // No lock to release
        }

        EditLockInfo existing = deserialize(existingValue);
        if (existing != null && existing.userId().equals(userId.toString())) {
            redisTemplate.delete(key);
            log.debug("Edit lock released for {} {} by user {} (tenant {})", contentType, contentId, userId, tenantId);
            return true;
        }

        log.warn("User {} attempted to release lock owned by {} for {} {} (tenant {})",
                userId, existing != null ? existing.userId() : "unknown", contentType, contentId, tenantId);
        return false;
    }

    /**
     * Get current lock holder information.
     *
     * @param tenantId    tenant context
     * @param contentType WIKI or BLOG
     * @param contentId   ID of the content
     * @return lock info or null if no lock exists
     */
    public EditLockInfo getLockInfo(UUID tenantId, String contentType, UUID contentId) {
        String key = buildKey(tenantId, contentType, contentId);
        String value = redisTemplate.opsForValue().get(key);

        if (value == null) {
            return null;
        }

        return deserialize(value);
    }

    /**
     * Refresh (extend) the TTL on an existing lock.
     * Only works if the user owns the lock.
     *
     * @param tenantId    tenant context
     * @param contentType WIKI or BLOG
     * @param contentId   ID of the content
     * @param userId      the user requesting the refresh
     * @return true if the lock was refreshed
     */
    public boolean refreshLock(UUID tenantId, String contentType, UUID contentId, UUID userId) {
        String key = buildKey(tenantId, contentType, contentId);
        String existingValue = redisTemplate.opsForValue().get(key);

        if (existingValue == null) {
            return false; // No lock to refresh
        }

        EditLockInfo existing = deserialize(existingValue);
        if (existing != null && existing.userId().equals(userId.toString())) {
            redisTemplate.expire(key, LOCK_TTL_MINUTES, TimeUnit.MINUTES);
            log.debug("Edit lock refreshed for {} {} by user {} (tenant {})", contentType, contentId, userId, tenantId);
            return true;
        }

        return false;
    }

    private String buildKey(UUID tenantId, String contentType, UUID contentId) {
        return KEY_PREFIX + tenantId + ":" + contentType + ":" + contentId;
    }

    private String serialize(EditLockInfo info) {
        try {
            return objectMapper.writeValueAsString(
                    Map.of("userId", info.userId(),
                            "userName", info.userName(),
                            "lockedAt", info.lockedAt()));
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize edit lock info", e);
            return "{}";
        }
    }

    private EditLockInfo deserialize(String json) {
        try {
            @SuppressWarnings("unchecked")
            Map<String, String> map = objectMapper.readValue(json, Map.class);
            return new EditLockInfo(
                    map.getOrDefault("userId", ""),
                    map.getOrDefault("userName", ""),
                    map.getOrDefault("lockedAt", ""));
        } catch (JsonProcessingException e) {
            log.error("Failed to deserialize edit lock info", e);
            return null;
        }
    }

    /**
     * Immutable record representing edit lock holder information.
     */
    public record EditLockInfo(String userId, String userName, String lockedAt) {
    }
}
