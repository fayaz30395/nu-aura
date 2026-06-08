package com.nulogic.application.admin.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.data.redis.core.StringRedisTemplate;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link ImpersonationExchangeTokenService}.
 *
 * <p>Covers the four security properties that the service must enforce:
 * <ol>
 *   <li>Token generation stores metadata in Redis with the correct TTL.</li>
 *   <li>Token consumption is single-use (second call with same token returns null).</li>
 *   <li>Expired / non-existent tokens are rejected.</li>
 *   <li>Redis unavailability causes fail-closed behaviour (exception).</li>
 * </ol></p>
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("ImpersonationExchangeTokenService")
class ImpersonationExchangeTokenServiceTest {

    @Mock
    private StringRedisTemplate redisTemplate;

    @Mock
    private ValueOperations<String, String> valueOps;

    private ImpersonationExchangeTokenService service;

    private static final UUID ADMIN_ID = UUID.randomUUID();
    private static final UUID TENANT_ID = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        // lenient: the blank-token early-return path never touches opsForValue(),
        // so this shared stub is unused there under strict stubbing.
        lenient().when(redisTemplate.opsForValue()).thenReturn(valueOps);
        service = new ImpersonationExchangeTokenService(redisTemplate);
    }

    // ==================== generateExchangeToken ====================

    @Nested
    @DisplayName("generateExchangeToken")
    class GenerateExchangeToken {

        @Test
        @DisplayName("Returns a non-blank URL-safe token of expected length")
        void returnsNonBlankToken() {
            when(valueOps.setIfAbsent(anyString(), anyString(), anyLong(), any(TimeUnit.class)))
                    .thenReturn(Boolean.TRUE);

            String token = service.generateExchangeToken(ADMIN_ID, TENANT_ID);

            assertThat(token).isNotBlank();
            // 32 bytes base64url (no padding) = 43 chars
            assertThat(token).hasSize(43);
            // URL-safe characters only
            assertThat(token).matches("[A-Za-z0-9_-]+");
        }

        @Test
        @DisplayName("Stores admin + tenant IDs in Redis under the expected key prefix")
        void storesCorrectPayloadInRedis() {
            when(valueOps.setIfAbsent(anyString(), anyString(), anyLong(), any(TimeUnit.class)))
                    .thenReturn(Boolean.TRUE);

            String token = service.generateExchangeToken(ADMIN_ID, TENANT_ID);

            ArgumentCaptor<String> keyCaptor = ArgumentCaptor.forClass(String.class);
            ArgumentCaptor<String> valueCaptor = ArgumentCaptor.forClass(String.class);
            ArgumentCaptor<Long> ttlCaptor = ArgumentCaptor.forClass(Long.class);
            ArgumentCaptor<TimeUnit> unitCaptor = ArgumentCaptor.forClass(TimeUnit.class);

            verify(valueOps).setIfAbsent(keyCaptor.capture(), valueCaptor.capture(),
                    ttlCaptor.capture(), unitCaptor.capture());

            assertThat(keyCaptor.getValue()).startsWith("impersonate:exchange:");
            assertThat(keyCaptor.getValue()).endsWith(token);
            assertThat(valueCaptor.getValue()).isEqualTo(ADMIN_ID + ":" + TENANT_ID);
            assertThat(ttlCaptor.getValue()).isEqualTo(ImpersonationExchangeTokenService.TTL_SECONDS);
            assertThat(unitCaptor.getValue()).isEqualTo(TimeUnit.SECONDS);
        }

        @Test
        @DisplayName("Throws IllegalStateException when Redis is unavailable (fail-closed)")
        void throwsWhenRedisUnavailable() {
            when(valueOps.setIfAbsent(anyString(), anyString(), anyLong(), any(TimeUnit.class)))
                    .thenThrow(new org.springframework.data.redis.RedisConnectionFailureException("down"));

            assertThatThrownBy(() -> service.generateExchangeToken(ADMIN_ID, TENANT_ID))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("unreachable");
        }
    }

    // ==================== consumeExchangeToken ====================

    @Nested
    @DisplayName("consumeExchangeToken")
    class ConsumeExchangeToken {

        private final String VALID_TOKEN = "abc123validtoken_xyzXYZ-0123456789ABCDEF12";

        @Test
        @DisplayName("Returns admin and tenant IDs when token is valid")
        void returnsPayloadForValidToken() {
            String storedValue = ADMIN_ID + ":" + TENANT_ID;
            when(valueOps.getAndDelete(contains(VALID_TOKEN))).thenReturn(storedValue);

            Map<String, UUID> result = service.consumeExchangeToken(VALID_TOKEN);

            assertThat(result).isNotNull();
            assertThat(result.get("adminId")).isEqualTo(ADMIN_ID);
            assertThat(result.get("targetTenantId")).isEqualTo(TENANT_ID);
        }

        @Test
        @DisplayName("Single-use: returns null when token already consumed (second call returns null from Redis)")
        void returnNullOnReplay() {
            // First call: token exists and is consumed
            when(valueOps.getAndDelete(contains(VALID_TOKEN)))
                    .thenReturn(ADMIN_ID + ":" + TENANT_ID) // first call
                    .thenReturn(null);                       // second call — already deleted

            // First consumption succeeds
            assertThat(service.consumeExchangeToken(VALID_TOKEN)).isNotNull();
            // Second attempt is rejected
            assertThat(service.consumeExchangeToken(VALID_TOKEN)).isNull();
        }

        @Test
        @DisplayName("Returns null when token does not exist (expired or never issued)")
        void returnsNullForExpiredOrMissingToken() {
            when(valueOps.getAndDelete(anyString())).thenReturn(null);

            assertThat(service.consumeExchangeToken("nonexistent-token")).isNull();
        }

        @Test
        @DisplayName("Returns null for blank or null token without touching Redis")
        void returnNullForBlankToken() {
            assertThat(service.consumeExchangeToken(null)).isNull();
            assertThat(service.consumeExchangeToken("  ")).isNull();
            verifyNoInteractions(valueOps);
        }

        @Test
        @DisplayName("Returns null when Redis value has malformed payload")
        void returnsNullForMalformedRedisValue() {
            when(valueOps.getAndDelete(anyString())).thenReturn("malformed-not-uuid:uuid");

            // Should not throw; returns null defensively
            assertThat(service.consumeExchangeToken(VALID_TOKEN)).isNull();
        }

        @Test
        @DisplayName("Throws IllegalStateException when Redis is unavailable during consume (fail-closed)")
        void throwsWhenRedisUnavailableDuringConsume() {
            when(valueOps.getAndDelete(anyString()))
                    .thenThrow(new org.springframework.data.redis.RedisConnectionFailureException("down"));

            assertThatThrownBy(() -> service.consumeExchangeToken(VALID_TOKEN))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("unreachable");
        }
    }
}
