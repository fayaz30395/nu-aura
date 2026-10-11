package com.nulogic.common.security;

import com.nulogic.domain.user.User;
import com.nulogic.infrastructure.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("UserAuthStatusCache")
class UserAuthStatusCacheTest {

    @Mock private UserRepository userRepository;
    @Mock private StringRedisTemplate redisTemplate;
    @Mock private ValueOperations<String, String> valueOps;

    private UserAuthStatusCache cache;
    private final UUID tenantId = UUID.randomUUID();
    private final UUID userId = UUID.randomUUID();
    private final String key = "user:auth_status:" + tenantId + ":" + userId;

    @BeforeEach
    void setUp() {
        lenient().when(redisTemplate.opsForValue()).thenReturn(valueOps);
        cache = new UserAuthStatusCache(userRepository, redisTemplate);
    }

    private User user(User.UserStatus status, LocalDateTime anonymizedAt, UUID userTenant) {
        User u = new User();
        u.setId(userId);
        u.setTenantId(userTenant);
        u.setStatus(status);
        u.setAnonymizedAt(anonymizedAt);
        return u;
    }

    @Test
    @DisplayName("active user is allowed and the verdict is cached with the short TTL")
    void activeUser() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(user(User.UserStatus.ACTIVE, null, tenantId)));

        assertThat(cache.isActive(tenantId, userId)).isTrue();
        verify(valueOps).set(key, "1", UserAuthStatusCache.TTL);
    }

    @Test
    @DisplayName("inactive user is blocked")
    void inactiveUser() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(user(User.UserStatus.INACTIVE, null, tenantId)));

        assertThat(cache.isActive(tenantId, userId)).isFalse();
        verify(valueOps).set(key, "0", UserAuthStatusCache.TTL);
    }

    @Test
    @DisplayName("LOCKED (automatic failed-login lockout) keeps an existing session")
    void lockedUserKeepsSession() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(user(User.UserStatus.LOCKED, null, tenantId)));

        assertThat(cache.isActive(tenantId, userId)).isTrue();
    }

    @Test
    @DisplayName("SUSPENDED user is blocked")
    void suspendedUser() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(user(User.UserStatus.SUSPENDED, null, tenantId)));

        assertThat(cache.isActive(tenantId, userId)).isFalse();
    }

    @Test
    @DisplayName("PENDING_ACTIVATION user (cannot log in or refresh) is blocked")
    void pendingUser() {
        when(userRepository.findById(userId))
                .thenReturn(Optional.of(user(User.UserStatus.PENDING_ACTIVATION, null, tenantId)));

        assertThat(cache.isActive(tenantId, userId)).isFalse();
    }

    @Test
    @DisplayName("anonymised user is blocked even if status is LOCKED")
    void anonymisedLockedUser() {
        when(userRepository.findById(userId))
                .thenReturn(Optional.of(user(User.UserStatus.LOCKED, LocalDateTime.now(), tenantId)));

        assertThat(cache.isActive(tenantId, userId)).isFalse();
    }

    @Test
    @DisplayName("anonymised user is blocked even if status is ACTIVE")
    void anonymisedUser() {
        when(userRepository.findById(userId))
                .thenReturn(Optional.of(user(User.UserStatus.ACTIVE, LocalDateTime.now(), tenantId)));

        assertThat(cache.isActive(tenantId, userId)).isFalse();
    }

    @Test
    @DisplayName("missing (deleted or RLS-hidden) user is blocked")
    void missingUser() {
        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        assertThat(cache.isActive(tenantId, userId)).isFalse();
    }

    @Test
    @DisplayName("user of a different tenant than the token is blocked")
    void tenantMismatch() {
        when(userRepository.findById(userId))
                .thenReturn(Optional.of(user(User.UserStatus.ACTIVE, null, UUID.randomUUID())));

        assertThat(cache.isActive(tenantId, userId)).isFalse();
    }

    @Test
    @DisplayName("null ids are blocked without touching Redis or the DB")
    void nullIds() {
        assertThat(cache.isActive(tenantId, null)).isFalse();
        assertThat(cache.isActive(null, userId)).isFalse();
        verify(userRepository, never()).findById(any());
    }

    @Test
    @DisplayName("cached verdict is served without a DB read")
    void cacheHit() {
        when(valueOps.get(key)).thenReturn("0");

        assertThat(cache.isActive(tenantId, userId)).isFalse();
        verify(userRepository, never()).findById(any());
    }

    @Test
    @DisplayName("Redis failure falls through to the database")
    void redisFailure() {
        when(valueOps.get(anyString())).thenThrow(new RuntimeException("redis down"));
        org.mockito.Mockito.doThrow(new RuntimeException("redis down"))
                .when(valueOps).set(anyString(), anyString(), eq(UserAuthStatusCache.TTL));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user(User.UserStatus.INACTIVE, null, tenantId)));

        assertThat(cache.isActive(tenantId, userId)).isFalse();
    }

    @Test
    @DisplayName("evict deletes the cache key")
    void evict() {
        cache.evict(tenantId, userId);
        verify(redisTemplate).delete(key);
    }
}
