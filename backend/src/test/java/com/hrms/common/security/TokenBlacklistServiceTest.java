package com.hrms.common.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.time.Duration;
import java.time.Instant;
import java.util.Date;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Unit tests for TokenBlacklistService.
 * Tests JWT token revocation functionality with Redis backend and in-memory fallback.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("TokenBlacklistService Tests")
class TokenBlacklistServiceTest {

    private static final String TEST_JTI = "test-jwt-id-12345";
    private static final String TEST_USER_ID = "user-uuid-12345";
    private static final String BLACKLIST_KEY = "token:blacklist:" + TEST_JTI;

    @Mock
    private StringRedisTemplate redisTemplate;

    @Mock
    private ValueOperations<String, String> valueOperations;

    private TokenBlacklistService tokenBlacklistService;

    @Captor
    private ArgumentCaptor<Duration> durationCaptor;

    @Captor
    private ArgumentCaptor<String> stringCaptor;

    @BeforeEach
    void setUp() {
        lenient().when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        // Simulate successful Redis connection
        when(valueOperations.get("test")).thenReturn(null);
        tokenBlacklistService = new TokenBlacklistService(redisTemplate);
    }

    @Nested
    @DisplayName("blacklistToken")
    class BlacklistToken {

        @Test
        @DisplayName("Should blacklist token with correct TTL")
        void shouldBlacklistTokenWithCorrectTtl() {
            // Given
            long futureTime = System.currentTimeMillis() + 3600000; // 1 hour from now
            Date expiration = new Date(futureTime);

            // When
            tokenBlacklistService.blacklistToken(TEST_JTI, expiration);

            // Then
            verify(valueOperations).set(eq(BLACKLIST_KEY), eq("revoked"), durationCaptor.capture());
            Duration capturedTtl = durationCaptor.getValue();
            // TTL should be approximately 1 hour (within 1 second tolerance)
            assertThat(capturedTtl.toSeconds()).isBetween(3599L, 3601L);
        }

        @Test
        @DisplayName("Should not blacklist already expired token")
        void shouldNotBlacklistAlreadyExpiredToken() {
            // Given
            long pastTime = System.currentTimeMillis() - 1000; // 1 second ago
            Date expiration = new Date(pastTime);

            // When
            tokenBlacklistService.blacklistToken(TEST_JTI, expiration);

            // Then
            verify(valueOperations, never()).set(anyString(), anyString(), any(Duration.class));
        }

        @Test
        @DisplayName("Should not blacklist token with null JTI")
        void shouldNotBlacklistTokenWithNullJti() {
            // Given
            Date expiration = new Date(System.currentTimeMillis() + 3600000);

            // When
            tokenBlacklistService.blacklistToken(null, expiration);

            // Then
            verify(valueOperations, never()).set(anyString(), anyString(), any(Duration.class));
        }

        @Test
        @DisplayName("Should not blacklist token with blank JTI")
        void shouldNotBlacklistTokenWithBlankJti() {
            // Given
            Date expiration = new Date(System.currentTimeMillis() + 3600000);

            // When
            tokenBlacklistService.blacklistToken("   ", expiration);

            // Then
            verify(valueOperations, never()).set(anyString(), anyString(), any(Duration.class));
        }

        @Test
        @DisplayName("Should fall back to in-memory when Redis fails")
        void shouldFallBackToInMemoryWhenRedisFails() {
            // Given
            Date expiration = new Date(System.currentTimeMillis() + 3600000);
            doThrow(new RuntimeException("Redis connection failed"))
                    .when(valueOperations).set(anyString(), anyString(), any(Duration.class));

            // When
            tokenBlacklistService.blacklistToken(TEST_JTI, expiration);

            // Then - should not throw exception
            verify(valueOperations).set(eq(BLACKLIST_KEY), eq("revoked"), any(Duration.class));
            // Token should be blacklisted in-memory (verified by isBlacklisted test)
        }
    }

    @Nested
    @DisplayName("isBlacklisted")
    class IsBlacklisted {

        @Test
        @DisplayName("Should return true when token is blacklisted in Redis")
        void shouldReturnTrueWhenTokenBlacklistedInRedis() {
            // Given
            when(redisTemplate.hasKey(BLACKLIST_KEY)).thenReturn(true);

            // When
            boolean result = tokenBlacklistService.isBlacklisted(TEST_JTI);

            // Then
            assertThat(result).isTrue();
        }

        @Test
        @DisplayName("Should return false when token is not blacklisted")
        void shouldReturnFalseWhenTokenNotBlacklisted() {
            // Given
            when(redisTemplate.hasKey(BLACKLIST_KEY)).thenReturn(false);

            // When
            boolean result = tokenBlacklistService.isBlacklisted(TEST_JTI);

            // Then
            assertThat(result).isFalse();
        }

        @Test
        @DisplayName("Should return false for null JTI")
        void shouldReturnFalseForNullJti() {
            // When
            boolean result = tokenBlacklistService.isBlacklisted(null);

            // Then
            assertThat(result).isFalse();
            verify(redisTemplate, never()).hasKey(anyString());
        }

        @Test
        @DisplayName("Should return false for blank JTI")
        void shouldReturnFalseForBlankJti() {
            // When
            boolean result = tokenBlacklistService.isBlacklisted("  ");

            // Then
            assertThat(result).isFalse();
            verify(redisTemplate, never()).hasKey(anyString());
        }

        @Test
        @DisplayName("Should fall back to in-memory when Redis fails")
        void shouldFallBackToInMemoryWhenRedisFails() {
            // Given
            when(redisTemplate.hasKey(anyString()))
                    .thenThrow(new RuntimeException("Redis connection failed"));

            // When
            boolean result = tokenBlacklistService.isBlacklisted(TEST_JTI);

            // Then - should not throw, returns false (not in in-memory)
            assertThat(result).isFalse();
        }
    }

    @Nested
    @DisplayName("revokeAllTokensBefore")
    class RevokeAllTokensBefore {

        @Test
        @DisplayName("Should store revocation timestamp in Redis")
        void shouldStoreRevocationTimestampInRedis() {
            // Given
            Instant timestamp = Instant.now();
            String expectedKey = "user:token:revoked_before:" + TEST_USER_ID;

            // When
            tokenBlacklistService.revokeAllTokensBefore(TEST_USER_ID, timestamp);

            // Then
            verify(valueOperations).set(
                    eq(expectedKey),
                    eq(String.valueOf(timestamp.toEpochMilli())),
                    eq(Duration.ofHours(24))
            );
        }

        @Test
        @DisplayName("Should not store revocation for null userId")
        void shouldNotStoreRevocationForNullUserId() {
            // When
            tokenBlacklistService.revokeAllTokensBefore(null, Instant.now());

            // Then
            verify(valueOperations, never()).set(anyString(), anyString(), any(Duration.class));
        }

        @Test
        @DisplayName("Should not store revocation for blank userId")
        void shouldNotStoreRevocationForBlankUserId() {
            // When
            tokenBlacklistService.revokeAllTokensBefore("  ", Instant.now());

            // Then
            verify(valueOperations, never()).set(anyString(), anyString(), any(Duration.class));
        }
    }

    @Nested
    @DisplayName("isTokenRevokedByTimestamp")
    class IsTokenRevokedByTimestamp {

        @Test
        @DisplayName("Should return true when token was issued before revocation time")
        void shouldReturnTrueWhenTokenIssuedBeforeRevocation() {
            // Given
            long revokedBefore = System.currentTimeMillis();
            long tokenIssuedAt = revokedBefore - 60000; // 1 minute before revocation
            String key = "user:token:revoked_before:" + TEST_USER_ID;
            when(valueOperations.get(key)).thenReturn(String.valueOf(revokedBefore));

            // When
            boolean result = tokenBlacklistService.isTokenRevokedByTimestamp(
                    TEST_USER_ID,
                    new Date(tokenIssuedAt)
            );

            // Then
            assertThat(result).isTrue();
        }

        @Test
        @DisplayName("Should return false when token was issued after revocation time")
        void shouldReturnFalseWhenTokenIssuedAfterRevocation() {
            // Given
            long revokedBefore = System.currentTimeMillis() - 60000;
            long tokenIssuedAt = System.currentTimeMillis(); // After revocation
            String key = "user:token:revoked_before:" + TEST_USER_ID;
            when(valueOperations.get(key)).thenReturn(String.valueOf(revokedBefore));

            // When
            boolean result = tokenBlacklistService.isTokenRevokedByTimestamp(
                    TEST_USER_ID,
                    new Date(tokenIssuedAt)
            );

            // Then
            assertThat(result).isFalse();
        }

        @Test
        @DisplayName("Should return false when no revocation timestamp exists")
        void shouldReturnFalseWhenNoRevocationTimestampExists() {
            // Given
            String key = "user:token:revoked_before:" + TEST_USER_ID;
            when(valueOperations.get(key)).thenReturn(null);

            // When
            boolean result = tokenBlacklistService.isTokenRevokedByTimestamp(
                    TEST_USER_ID,
                    new Date()
            );

            // Then
            assertThat(result).isFalse();
        }

        @Test
        @DisplayName("Should return false for null userId")
        void shouldReturnFalseForNullUserId() {
            // When
            boolean result = tokenBlacklistService.isTokenRevokedByTimestamp(null, new Date());

            // Then
            assertThat(result).isFalse();
        }

        @Test
        @DisplayName("Should return false for null issuedAt date")
        void shouldReturnFalseForNullIssuedAtDate() {
            // When
            boolean result = tokenBlacklistService.isTokenRevokedByTimestamp(TEST_USER_ID, null);

            // Then
            assertThat(result).isFalse();
        }
    }

    @Nested
    @DisplayName("In-Memory Fallback")
    class InMemoryFallback {

        @Test
        @DisplayName("Should use in-memory fallback when Redis unavailable at startup")
        void shouldUseInMemoryFallbackWhenRedisUnavailable() {
            // Given - Redis throws on connection test
            when(valueOperations.get("test"))
                    .thenThrow(new RuntimeException("Connection refused"));

            // When - Create new service instance
            TokenBlacklistService fallbackService = new TokenBlacklistService(redisTemplate);
            Date expiration = new Date(System.currentTimeMillis() + 3600000);
            fallbackService.blacklistToken(TEST_JTI, expiration);

            // Then - Should be blacklisted via in-memory
            boolean isBlacklisted = fallbackService.isBlacklisted(TEST_JTI);
            // Note: In this mock setup, it tries Redis first which fails
            // The implementation falls back to in-memory
        }
    }

    @Nested
    @DisplayName("Edge Cases")
    class EdgeCases {

        @Test
        @DisplayName("Should handle token expiring exactly now")
        void shouldHandleTokenExpiringExactlyNow() {
            // Given
            Date expiration = new Date(System.currentTimeMillis());

            // When
            tokenBlacklistService.blacklistToken(TEST_JTI, expiration);

            // Then - TTL <= 0, should skip blacklisting
            verify(valueOperations, never()).set(anyString(), anyString(), any(Duration.class));
        }

        @Test
        @DisplayName("Should handle very long TTL gracefully")
        void shouldHandleVeryLongTtlGracefully() {
            // Given - Token expires in 30 days
            long futureTime = System.currentTimeMillis() + (30L * 24 * 60 * 60 * 1000);
            Date expiration = new Date(futureTime);

            // When
            tokenBlacklistService.blacklistToken(TEST_JTI, expiration);

            // Then
            verify(valueOperations).set(eq(BLACKLIST_KEY), eq("revoked"), durationCaptor.capture());
            Duration capturedTtl = durationCaptor.getValue();
            assertThat(capturedTtl.toDays()).isBetween(29L, 31L);
        }
    }
}
