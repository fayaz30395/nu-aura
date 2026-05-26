package com.nulogic.infrastructure.websocket;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@DisplayName("RedisWebSocketRelay")
class RedisWebSocketRelayTest {

    @Test
    @DisplayName("records degraded metric and delivers locally when Redis publish fails")
    void recordsDegradedMetricAndDeliversLocallyWhenRedisPublishFails() {
        RedisTemplate<String, Object> redisTemplate = mock(RedisTemplate.class);
        SimpMessagingTemplate messagingTemplate = mock(SimpMessagingTemplate.class);
        SimpleMeterRegistry meterRegistry = new SimpleMeterRegistry();
        RedisWebSocketRelay relay = new RedisWebSocketRelay(redisTemplate, messagingTemplate, meterRegistry);
        RedisConnectionFailureException failure = new RedisConnectionFailureException("redis unavailable");

        when(redisTemplate.convertAndSend(eq(RedisWebSocketRelay.WS_RELAY_CHANNEL), any()))
                .thenThrow(failure);

        relay.convertAndSend("/topic/tenant/tenant-1/notifications", "payload");

        Counter fallbackCounter = meterRegistry.find(RedisWebSocketRelay.FALLBACK_COUNTER_NAME)
                .tag("reason", "redis_unavailable")
                .counter();
        assertThat(fallbackCounter).isNotNull();
        assertThat(fallbackCounter.count()).isEqualTo(1.0);

        verify(messagingTemplate).convertAndSend("/topic/tenant/tenant-1/notifications", "payload");
    }

    @Test
    @DisplayName("does not record degraded metric when Redis publish succeeds")
    void doesNotRecordDegradedMetricWhenRedisPublishSucceeds() {
        RedisTemplate<String, Object> redisTemplate = mock(RedisTemplate.class);
        SimpMessagingTemplate messagingTemplate = mock(SimpMessagingTemplate.class);
        SimpleMeterRegistry meterRegistry = new SimpleMeterRegistry();
        RedisWebSocketRelay relay = new RedisWebSocketRelay(redisTemplate, messagingTemplate, meterRegistry);

        relay.convertAndSendToUser("user-1", "/queue/notifications", "payload");

        assertThat(meterRegistry.find(RedisWebSocketRelay.FALLBACK_COUNTER_NAME).counter()).isNull();
        verify(redisTemplate).convertAndSend(eq(RedisWebSocketRelay.WS_RELAY_CHANNEL), any());
    }
}
