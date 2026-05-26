package com.nulogic.common.util;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.UUID;

/**
 * Redis Pub/Sub subscriber for the {@link TenantTimeService#INVALIDATE_CHANNEL} channel.
 *
 * <p><strong>What this does.</strong> When any pod calls
 * {@link TenantTimeService#invalidate(UUID)}, it publishes the tenantId to
 * {@code tenant.timezone.invalidate}. Every pod (including the publisher itself) receives
 * the message and calls {@link TenantTimeService#invalidateLocal(UUID)} so the per-JVM
 * cache is evicted everywhere — closing the R1 cross-pod-staleness window described in
 * {@code backend/docs/audit/tenant-timezone-invalidate-review.md}.</p>
 *
 * <p><strong>Loop prevention.</strong> The subscriber path calls {@code invalidateLocal}
 * (no republish), never {@code invalidate}. Combined with the one-publish-per-write rule
 * in {@code TenantTimeService.invalidate}, no fan-in cycle can form: a Redis broadcast
 * never re-enters the publishing code path.</p>
 *
 * <p><strong>Profile guard.</strong> Excluded on the {@code render} profile (single-pod
 * free-tier deployment) — there's nothing to fan out to, and Render's plan doesn't include
 * Redis. Mirrors {@link com.nulogic.infrastructure.websocket.WebSocketRedisConfig}.</p>
 *
 * <p><strong>Wiring style.</strong> Self-contained: the bean owns its
 * {@link RedisMessageListenerContainer} and registers itself in {@link PostConstruct}.
 * This keeps the timezone-cache plumbing in one package next to {@link TenantTimeService}
 * rather than scattering a {@code @Bean} into a generic config class. The container is
 * started in {@link #subscribe()} and stopped in {@link #shutdown()} so its lifecycle is
 * deterministically scoped to this bean.</p>
 */
@Component
@Profile("!render")
@Slf4j
public class TenantTimezoneInvalidateSubscriber implements MessageListener {

    private final TenantTimeService tenantTimeService;
    private final RedisMessageListenerContainer listenerContainer;
    private final GenericJackson2JsonRedisSerializer jsonSerializer;

    /**
     * @param tenantTimeService  cache to evict on receipt
     * @param connectionFactory  shared Spring-managed Redis connection factory
     */
    public TenantTimezoneInvalidateSubscriber(TenantTimeService tenantTimeService,
                                              RedisConnectionFactory connectionFactory,
                                              GenericJackson2JsonRedisSerializer jsonSerializer) {
        this.tenantTimeService = tenantTimeService;
        this.jsonSerializer = jsonSerializer;

        // Own a dedicated listener container so this subscriber is isolated from
        // ws:relay's lifecycle. Both use the same connection factory under the hood.
        RedisMessageListenerContainer container = new RedisMessageListenerContainer();
        container.setConnectionFactory(connectionFactory);
        this.listenerContainer = container;
    }

    /**
     * Bind the listener to the channel and start the container.
     *
     * <p>The {@code @PostConstruct} timing is deliberate: by the time Spring calls this
     * method, {@link TenantTimeService} is fully injected, so any message that arrives
     * mid-startup can be safely dispatched. Without {@code @PostConstruct}, registering
     * inside the constructor would risk receiving a message before this object's
     * fields are visible to other threads.</p>
     */
    @PostConstruct
    public void subscribe() {
        ChannelTopic topic = new ChannelTopic(TenantTimeService.INVALIDATE_CHANNEL);
        listenerContainer.addMessageListener(this, topic);
        listenerContainer.afterPropertiesSet();
        listenerContainer.start();
        log.info("Subscribed to Redis channel '{}' for tenant timezone cache invalidation",
                TenantTimeService.INVALIDATE_CHANNEL);
    }

    /**
     * Decode the body as a UUID and evict the local cache entry. Never republishes
     * — that's enforced by routing through {@link TenantTimeService#invalidateLocal}.
     */
    @Override
    public void onMessage(Message message, byte[] pattern) {
        byte[] body = message.getBody();
        if (body == null || body.length == 0) {
            log.warn("Received empty payload on channel '{}'; ignoring",
                    TenantTimeService.INVALIDATE_CHANNEL);
            return;
        }

        UUID tenantId = decodeTenantId(body);
        if (tenantId == null) {
            // decodeTenantId already logged the reason; nothing more to do.
            return;
        }

        try {
            tenantTimeService.invalidateLocal(tenantId);
            log.debug("Locally evicted tenant {} from timezone cache (Redis broadcast)", tenantId);
        } catch (Exception e) { // Intentional broad catch — pub/sub error boundary
            log.error("Failed to apply invalidation for tenant {} from channel '{}'",
                    tenantId, TenantTimeService.INVALIDATE_CHANNEL, e);
        }
    }

    /**
     * Try the published format first (raw UTF-8 UUID string), then fall back to a
     * Jackson-wrapped string ("uuid"). Tolerating both keeps the wire format flexible
     * and lets ops use {@code redis-cli PUBLISH tenant.timezone.invalidate <uuid>} for
     * manual fan-outs during incident response.
     */
    private UUID decodeTenantId(byte[] body) {
        // RedisTemplate.convertAndSend in this codebase uses GenericJackson2JsonRedisSerializer,
        // so a String payload arrives as JSON-quoted bytes. Try that first.
        try {
            Object decoded = jsonSerializer.deserialize(body);
            if (decoded instanceof String s) {
                return UUID.fromString(s.trim());
            }
        } catch (Exception ignored) {
            // Fall through to the raw-UTF8 path below.
        }

        // Fallback: raw UTF-8 bytes (manual redis-cli PUBLISH, future plain-string producers).
        String raw = new String(body, StandardCharsets.UTF_8).trim();
        // Strip optional surrounding quotes left over from a JSON-string body when the
        // primary deserializer path was bypassed (e.g. caller used StringRedisSerializer).
        if (raw.length() >= 2 && raw.charAt(0) == '"' && raw.charAt(raw.length() - 1) == '"') {
            raw = raw.substring(1, raw.length() - 1);
        }
        try {
            return UUID.fromString(raw);
        } catch (IllegalArgumentException e) {
            log.warn("Ignoring malformed payload on channel '{}': '{}' is not a UUID",
                    TenantTimeService.INVALIDATE_CHANNEL, raw);
            return null;
        }
    }

    /**
     * Stop the owned listener container during context shutdown so the Redis subscription
     * thread releases its connection cleanly. Without this, integration-test contexts that
     * cycle would leak threads bound to the Lettuce/Jedis client pool.
     */
    @PreDestroy
    public void shutdown() {
        try {
            listenerContainer.stop();
            listenerContainer.destroy();
            log.info("Stopped Redis subscriber for channel '{}'",
                    TenantTimeService.INVALIDATE_CHANNEL);
        } catch (Exception e) { // Intentional broad catch — shutdown error boundary
            log.warn("Error stopping Redis subscriber for channel '{}': {}",
                    TenantTimeService.INVALIDATE_CHANNEL, e.getMessage());
        }
    }

    /**
     * Test seam — exposes the owned container so integration tests can introspect it.
     */
    RedisMessageListenerContainer getListenerContainer() {
        return listenerContainer;
    }
}
