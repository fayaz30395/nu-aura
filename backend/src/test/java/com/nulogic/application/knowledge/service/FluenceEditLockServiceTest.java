package com.nulogic.application.knowledge.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nulogic.common.util.TenantTimeService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.time.LocalDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("FluenceEditLockService.requireNoConflictingLock")
class FluenceEditLockServiceTest {

    @Mock
    private StringRedisTemplate redisTemplate;
    @Mock
    private ValueOperations<String, String> valueOperations;
    @Mock
    private TenantTimeService tenantTimeService;

    private FluenceEditLockService service;
    private final UUID tenantId = UUID.randomUUID();
    private final UUID contentId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        service = new FluenceEditLockService(redisTemplate, new ObjectMapper(), tenantTimeService);
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
    }

    @Test
    @DisplayName("allows the update when no lock is held")
    void allowsWhenNoLock() {
        when(valueOperations.get(any())).thenReturn(null);

        assertThatCode(() -> service.requireNoConflictingLock(tenantId, "WIKI", contentId, UUID.randomUUID()))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("allows the update when the current user holds the lock")
    void allowsWhenOwnLock() {
        UUID userId = UUID.randomUUID();
        when(tenantTimeService.now(tenantId)).thenReturn(LocalDateTime.now());
        FluenceEditLockService.EditLockInfo lockInfo =
                service.acquireLock(tenantId, "WIKI", contentId, userId, "Bob");
        when(valueOperations.get(any())).thenReturn(
                "{\"userId\":\"" + lockInfo.userId() + "\",\"userName\":\"Bob\",\"lockedAt\":\"now\"}");

        assertThatCode(() -> service.requireNoConflictingLock(tenantId, "WIKI", contentId, userId))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("rejects the update when a different user holds the lock")
    void rejectsWhenLockedByAnotherUser() {
        when(valueOperations.get(any())).thenReturn(
                "{\"userId\":\"" + UUID.randomUUID() + "\",\"userName\":\"Alice\",\"lockedAt\":\"now\"}");

        assertThatThrownBy(() -> service.requireNoConflictingLock(tenantId, "WIKI", contentId, UUID.randomUUID()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Alice");
    }
}
