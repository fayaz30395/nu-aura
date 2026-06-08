package com.nulogic.application.admin.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.util.Base64;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

/**
 * Short-lived, single-use opaque exchange token for the two-phase impersonation flow.
 *
 * <h3>Why a two-phase exchange?</h3>
 * <p>The old single-phase flow returned a 15-min impersonation JWT directly in the
 * HTTP response body. The frontend never consumed it, so the JWT sat in JS-readable
 * memory. Even when the frontend <em>did</em> try to use it, it would have been
 * transported as an Authorization header — client-side storage is XSS-gated lateral
 * movement. The two-phase approach eliminates both risks:</p>
 * <ol>
 *   <li><strong>Phase 1 (generate):</strong> a 60-second opaque random exchange token
 *       is stored server-side in Redis. Only the opaque token is returned to the
 *       SuperAdmin's browser — the impersonation JWT is never on the wire yet.</li>
 *   <li><strong>Phase 2 (consume):</strong> the frontend immediately POSTs the opaque
 *       token back to {@code POST /impersonate/consume}. The backend atomically deletes
 *       the Redis entry (single-use enforcement), mints the impersonation JWT, and sets
 *       it as an httpOnly cookie. The opaque token is therefore never persisted and
 *       is consumed before it expires.</li>
 * </ol>
 *
 * <h3>Threat model</h3>
 * <ul>
 *   <li><strong>Replay:</strong> atomic Redis DEL — second use returns null and is
 *       rejected with 403.</li>
 *   <li><strong>Expiry bypass:</strong> TTL enforced by Redis; GET after TTL returns
 *       null, rejected with 403.</li>
 *   <li><strong>Token leak:</strong> opaque 32-byte random token has 256 bits of
 *       entropy; brute force is infeasible. Even if leaked, it expires in 60 s.</li>
 *   <li><strong>Privilege escalation:</strong> metadata stored in Redis includes the
 *       issuing admin's user ID; consume endpoint verifies issuer is still SYSTEM_ADMIN
 *       at consumption time (via {@code @RequiresPermission(revalidate=true)}).</li>
 *   <li><strong>Redis outage:</strong> fail-closed — if Redis is unavailable, both
 *       generate and consume return a service-unavailable error. Impersonation is
 *       an administrative function; availability is secondary to security here.</li>
 * </ul>
 *
 * <h3>Redis key schema</h3>
 * <pre>
 *   impersonate:exchange:{token}  →  JSON  {adminId, targetTenantId}  TTL 60 s
 * </pre>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ImpersonationExchangeTokenService {

    private static final String KEY_PREFIX = "impersonate:exchange:";
    /**
     * 60-second TTL — long enough for the browser round-trip but short enough
     * that a leaked token self-destructs almost immediately.
     */
    static final long TTL_SECONDS = 60L;

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final StringRedisTemplate redisTemplate;

    /**
     * Generate a single-use opaque exchange token linked to the admin and target tenant.
     *
     * @param adminUserId    the SuperAdmin's user ID (stored in Redis for verification)
     * @param targetTenantId the tenant to impersonate
     * @return 43-char URL-safe Base64 exchange token (256 bits of entropy)
     * @throws IllegalStateException if Redis is unavailable (fail-closed)
     */
    public String generateExchangeToken(UUID adminUserId, UUID targetTenantId) {
        byte[] tokenBytes = new byte[32];
        SECURE_RANDOM.nextBytes(tokenBytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(tokenBytes);

        String key = KEY_PREFIX + token;
        // Compact JSON stored inline to avoid a Jackson dependency in this service.
        String value = adminUserId.toString() + ":" + targetTenantId.toString();

        try {
            Boolean stored = redisTemplate.opsForValue().setIfAbsent(key, value, TTL_SECONDS, TimeUnit.SECONDS);
            if (!Boolean.TRUE.equals(stored)) {
                // UUID collision — astronomically unlikely but handle gracefully
                log.warn("Exchange token key collision for admin {} tenant {} — this should never happen",
                        adminUserId, targetTenantId);
                throw new IllegalStateException("Exchange token generation collision; please retry");
            }
        } catch (org.springframework.data.redis.RedisConnectionFailureException e) {
            log.error("Redis unavailable during impersonation exchange token generation: {}", e.getMessage());
            throw new IllegalStateException("Impersonation unavailable: token store is unreachable");
        }

        log.info("Impersonation exchange token generated for admin={} targetTenant={} TTL={}s",
                adminUserId, targetTenantId, TTL_SECONDS);
        return token;
    }

    /**
     * Atomically consume (delete) the exchange token and return its payload.
     *
     * <p>Uses a Redis GETDEL-style atomic delete to prevent replay. If the token
     * does not exist (expired or already consumed), returns {@code null}.</p>
     *
     * @param exchangeToken the opaque token returned by {@link #generateExchangeToken}
     * @return metadata map with {@code adminId} and {@code targetTenantId}, or
     *         {@code null} if the token was not found / already consumed / expired
     */
    public Map<String, UUID> consumeExchangeToken(String exchangeToken) {
        if (exchangeToken == null || exchangeToken.isBlank()) {
            return null;
        }

        String key = KEY_PREFIX + exchangeToken;

        try {
            // Atomic GET-then-DELETE: use getAndDelete which maps to GETDEL in Redis 6.2+.
            // Spring Data Redis provides this via opsForValue().getAndDelete(key).
            String value = redisTemplate.opsForValue().getAndDelete(key);
            if (value == null) {
                log.warn("Impersonation exchange token not found (expired or already consumed): {}",
                        exchangeToken.substring(0, Math.min(8, exchangeToken.length())) + "...");
                return null;
            }

            String[] parts = value.split(":");
            if (parts.length != 2) {
                log.error("Malformed exchange token value in Redis for key prefix: {}",
                        exchangeToken.substring(0, 8));
                return null;
            }

            UUID adminId = UUID.fromString(parts[0]);
            UUID targetTenantId = UUID.fromString(parts[1]);
            log.info("Impersonation exchange token consumed: admin={} targetTenant={}", adminId, targetTenantId);
            return Map.of("adminId", adminId, "targetTenantId", targetTenantId);

        } catch (org.springframework.data.redis.RedisConnectionFailureException e) {
            log.error("Redis unavailable during impersonation exchange token consumption: {}", e.getMessage());
            throw new IllegalStateException("Impersonation unavailable: token store is unreachable");
        } catch (IllegalArgumentException e) {
            log.error("Exchange token payload contained invalid UUID: {}", e.getMessage());
            return null;
        }
    }
}
