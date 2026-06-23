package com.nulogic.infrastructure.kafka;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * Pure Mockito unit tests for {@link IdempotencyService}.
 *
 * <p>Covers the atomic SETNX claim path, the duplicate path, release, and the
 * fail-open behavior when Redis throws. No Spring context, Redis, or Kafka —
 * the {@link StringRedisTemplate} and its {@link ValueOperations} are mocked.</p>
 */
@ExtendWith(MockitoExtension.class)
class IdempotencyServiceTest {

    private static final String PREFIX = "kafka:idempotent:";
    private static final long TTL_HOURS = 24;
    private static final String EVENT_ID = "evt-1234";

    @Mock
    private StringRedisTemplate redisTemplate;

    @Mock
    private ValueOperations<String, String> valueOperations;

    @Captor
    private ArgumentCaptor<String> keyCaptor;

    @Captor
    private ArgumentCaptor<String> valueCaptor;

    @Captor
    private ArgumentCaptor<Long> ttlCaptor;

    @Captor
    private ArgumentCaptor<TimeUnit> unitCaptor;

    private IdempotencyService service;

    @BeforeEach
    void setUp() {
        service = new IdempotencyService(redisTemplate);
    }

    // ── tryProcess ───────────────────────────────────────────────────────────

    @Test
    @DisplayName("tryProcess returns true when SETNX succeeds (first claimer)")
    void tryProcess_setnxTrue_returnsTrue() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.setIfAbsent(anyString(), anyString(), anyLong(), any()))
                .thenReturn(Boolean.TRUE);

        boolean result = service.tryProcess(EVENT_ID);

        assertThat(result).isTrue();
    }

    @Test
    @DisplayName("tryProcess returns false when SETNX fails (already claimed)")
    void tryProcess_setnxFalse_returnsFalse() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.setIfAbsent(anyString(), anyString(), anyLong(), any()))
                .thenReturn(Boolean.FALSE);

        boolean result = service.tryProcess(EVENT_ID);

        assertThat(result).isFalse();
    }

    @Test
    @DisplayName("tryProcess treats a null SETNX result as not-first-claimer (false)")
    void tryProcess_setnxNull_returnsFalse() {
        // Boolean.TRUE.equals(null) is false — defensive null handling.
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.setIfAbsent(anyString(), anyString(), anyLong(), any()))
                .thenReturn(null);

        boolean result = service.tryProcess(EVENT_ID);

        assertThat(result).isFalse();
    }

    @Test
    @DisplayName("tryProcess constructs the prefixed key, 'processed' value, 24h TTL")
    void tryProcess_buildsKeyValueAndTtl() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.setIfAbsent(anyString(), anyString(), anyLong(), any()))
                .thenReturn(Boolean.TRUE);

        service.tryProcess(EVENT_ID);

        verify(valueOperations).setIfAbsent(
                keyCaptor.capture(), valueCaptor.capture(), ttlCaptor.capture(), unitCaptor.capture());
        assertThat(keyCaptor.getValue()).isEqualTo(PREFIX + EVENT_ID);
        assertThat(valueCaptor.getValue()).isEqualTo("processed");
        assertThat(ttlCaptor.getValue()).isEqualTo(TTL_HOURS);
        assertThat(unitCaptor.getValue()).isEqualTo(TimeUnit.HOURS);
    }

    @Test
    @DisplayName("tryProcess fails open (returns true) when Redis throws")
    void tryProcess_redisThrows_failsOpenTrue() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.setIfAbsent(anyString(), anyString(), anyLong(), any()))
                .thenThrow(new RuntimeException("Redis connection refused"));

        boolean result = service.tryProcess(EVENT_ID);

        // Documented trade-off: allow potential duplicates over complete unavailability.
        assertThat(result).isTrue();
    }

    @Test
    @DisplayName("tryProcess fails open (returns true) when opsForValue itself throws")
    void tryProcess_opsForValueThrows_failsOpenTrue() {
        when(redisTemplate.opsForValue())
                .thenThrow(new RuntimeException("Redis pool exhausted"));

        boolean result = service.tryProcess(EVENT_ID);

        assertThat(result).isTrue();
    }

    // ── release ──────────────────────────────────────────────────────────────

    @Test
    @DisplayName("release deletes the prefixed idempotency key")
    void release_deletesPrefixedKey() {
        service.release(EVENT_ID);

        verify(redisTemplate).delete(eq(PREFIX + EVENT_ID));
        // release does not touch opsForValue.
        verify(redisTemplate, never()).opsForValue();
    }

    @Test
    @DisplayName("release swallows Redis failures (best-effort, never propagates)")
    void release_redisThrows_swallowed() {
        when(redisTemplate.delete(anyString()))
                .thenThrow(new RuntimeException("Redis down during release"));

        // Must not propagate — the original failure must never be masked.
        service.release(EVENT_ID);

        verify(redisTemplate).delete(PREFIX + EVENT_ID);
    }

    @Test
    @DisplayName("tryProcess does not interact with Redis delete")
    void tryProcess_doesNotDelete() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.setIfAbsent(anyString(), anyString(), anyLong(), any()))
                .thenReturn(Boolean.TRUE);

        service.tryProcess(EVENT_ID);

        verify(redisTemplate, never()).delete(anyString());
    }

    @Test
    @DisplayName("release never calls setIfAbsent on the value operations")
    void release_doesNotClaim() {
        service.release(EVENT_ID);

        verifyNoInteractions(valueOperations);
    }
}
