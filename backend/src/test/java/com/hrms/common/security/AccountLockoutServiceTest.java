package com.hrms.common.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Unit tests for AccountLockoutService.
 * Tests distributed account lockout functionality backed by Redis.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("AccountLockoutService Tests")
class AccountLockoutServiceTest {

    private static final String TEST_USERNAME = "test.user@example.com";
    private static final String ATTEMPTS_KEY = "lockout:attempts:" + TEST_USERNAME;
    private static final String LOCKED_KEY = "lockout:locked:" + TEST_USERNAME;

    @Mock
    private StringRedisTemplate redis;

    @Mock
    private ValueOperations<String, String> valueOperations;

    @InjectMocks
    private AccountLockoutService accountLockoutService;

    @Captor
    private ArgumentCaptor<Duration> durationCaptor;

    @BeforeEach
    void setUp() {
        lenient().when(redis.opsForValue()).thenReturn(valueOperations);
    }

    @Nested
    @DisplayName("loginFailed")
    class LoginFailed {

        @Test
        @DisplayName("Should increment attempt counter on first failure")
        void shouldIncrementAttemptCounterOnFirstFailure() {
            // Given
            when(valueOperations.increment(ATTEMPTS_KEY)).thenReturn(1L);

            // When
            accountLockoutService.loginFailed(TEST_USERNAME);

            // Then
            verify(valueOperations).increment(ATTEMPTS_KEY);
            verify(redis).expire(eq(ATTEMPTS_KEY), any(Duration.class));
            verify(valueOperations, never()).set(eq(LOCKED_KEY), anyString(), any(Duration.class));
        }

        @Test
        @DisplayName("Should not reset TTL on subsequent failures")
        void shouldNotResetTtlOnSubsequentFailures() {
            // Given
            when(valueOperations.increment(ATTEMPTS_KEY)).thenReturn(3L);

            // When
            accountLockoutService.loginFailed(TEST_USERNAME);

            // Then
            verify(valueOperations).increment(ATTEMPTS_KEY);
            verify(redis, never()).expire(anyString(), any(Duration.class));
            verify(valueOperations, never()).set(eq(LOCKED_KEY), anyString(), any(Duration.class));
        }

        @Test
        @DisplayName("Should lock account after 5 failed attempts")
        void shouldLockAccountAfterFiveFailedAttempts() {
            // Given
            when(valueOperations.increment(ATTEMPTS_KEY)).thenReturn(5L);

            // When
            accountLockoutService.loginFailed(TEST_USERNAME);

            // Then
            verify(valueOperations).increment(ATTEMPTS_KEY);
            verify(valueOperations).set(eq(LOCKED_KEY), eq("1"), durationCaptor.capture());
            assertThat(durationCaptor.getValue()).isEqualTo(Duration.ofMinutes(15));
        }

        @Test
        @DisplayName("Should lock account on more than 5 failed attempts")
        void shouldLockAccountOnMoreThanFiveAttempts() {
            // Given
            when(valueOperations.increment(ATTEMPTS_KEY)).thenReturn(10L);

            // When
            accountLockoutService.loginFailed(TEST_USERNAME);

            // Then
            verify(valueOperations).set(eq(LOCKED_KEY), eq("1"), any(Duration.class));
        }

        @Test
        @DisplayName("Should handle null increment result gracefully")
        void shouldHandleNullIncrementResultGracefully() {
            // Given
            when(valueOperations.increment(ATTEMPTS_KEY)).thenReturn(null);

            // When
            accountLockoutService.loginFailed(TEST_USERNAME);

            // Then
            verify(valueOperations).increment(ATTEMPTS_KEY);
            verify(redis, never()).expire(anyString(), any(Duration.class));
            verify(valueOperations, never()).set(anyString(), anyString(), any(Duration.class));
        }
    }

    @Nested
    @DisplayName("loginSucceeded")
    class LoginSucceeded {

        @Test
        @DisplayName("Should clear all lockout state on successful login")
        void shouldClearAllLockoutStateOnSuccess() {
            // When
            accountLockoutService.loginSucceeded(TEST_USERNAME);

            // Then
            verify(redis).delete(ATTEMPTS_KEY);
            verify(redis).delete(LOCKED_KEY);
        }

        @Test
        @DisplayName("Should handle deleting non-existent keys gracefully")
        void shouldHandleDeletingNonExistentKeysGracefully() {
            // Given
            when(redis.delete(anyString())).thenReturn(false);

            // When
            accountLockoutService.loginSucceeded(TEST_USERNAME);

            // Then - no exception thrown
            verify(redis, times(2)).delete(anyString());
        }
    }

    @Nested
    @DisplayName("isAccountLocked")
    class IsAccountLocked {

        @Test
        @DisplayName("Should return true when account is locked")
        void shouldReturnTrueWhenAccountLocked() {
            // Given
            when(redis.hasKey(LOCKED_KEY)).thenReturn(true);

            // When
            boolean result = accountLockoutService.isAccountLocked(TEST_USERNAME);

            // Then
            assertThat(result).isTrue();
        }

        @Test
        @DisplayName("Should return false when account is not locked")
        void shouldReturnFalseWhenAccountNotLocked() {
            // Given
            when(redis.hasKey(LOCKED_KEY)).thenReturn(false);

            // When
            boolean result = accountLockoutService.isAccountLocked(TEST_USERNAME);

            // Then
            assertThat(result).isFalse();
        }

        @Test
        @DisplayName("Should return false when hasKey returns null")
        void shouldReturnFalseWhenHasKeyReturnsNull() {
            // Given
            when(redis.hasKey(LOCKED_KEY)).thenReturn(null);

            // When
            boolean result = accountLockoutService.isAccountLocked(TEST_USERNAME);

            // Then
            assertThat(result).isFalse();
        }
    }

    @Nested
    @DisplayName("Integration Scenarios")
    class IntegrationScenarios {

        @Test
        @DisplayName("Should track multiple users independently")
        void shouldTrackMultipleUsersIndependently() {
            // Given
            String user1 = "user1@example.com";
            String user2 = "user2@example.com";
            when(valueOperations.increment("lockout:attempts:" + user1)).thenReturn(3L);
            when(valueOperations.increment("lockout:attempts:" + user2)).thenReturn(1L);

            // When
            accountLockoutService.loginFailed(user1);
            accountLockoutService.loginFailed(user2);

            // Then
            verify(valueOperations).increment("lockout:attempts:" + user1);
            verify(valueOperations).increment("lockout:attempts:" + user2);
            // Only user2 should have TTL set (first attempt)
            verify(redis).expire(eq("lockout:attempts:" + user2), any(Duration.class));
            verify(redis, never()).expire(eq("lockout:attempts:" + user1), any(Duration.class));
        }

        @Test
        @DisplayName("Should clear state and allow re-attempt after successful login")
        void shouldClearStateAndAllowReAttemptAfterSuccessfulLogin() {
            // Given - user is locked
            when(redis.hasKey(LOCKED_KEY)).thenReturn(true);
            assertThat(accountLockoutService.isAccountLocked(TEST_USERNAME)).isTrue();

            // When - successful login
            accountLockoutService.loginSucceeded(TEST_USERNAME);

            // Then - state cleared
            verify(redis).delete(ATTEMPTS_KEY);
            verify(redis).delete(LOCKED_KEY);
        }
    }
}
