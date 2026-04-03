package com.hrms.application.workflow.service;

import com.hrms.common.security.TenantContext;
import com.hrms.infrastructure.workflow.repository.StepExecutionRepository;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("ApprovalService Tests")
class ApprovalServiceTest {

    private static MockedStatic<TenantContext> tenantContextMock;
    @Mock
    private StepExecutionRepository stepExecutionRepository;
    @InjectMocks
    private ApprovalService approvalService;
    private UUID tenantId;
    private UUID userId;

    @BeforeAll
    static void setUpClass() {
        tenantContextMock = mockStatic(TenantContext.class);
    }

    @AfterAll
    static void tearDownClass() {
        tenantContextMock.close();
    }

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
        userId = UUID.randomUUID();

        tenantContextMock.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);
    }

    @Nested
    @DisplayName("GetPendingApprovalsCount Tests")
    class GetPendingApprovalsCountTests {

        @Test
        @DisplayName("Should return pending approvals count for user")
        void shouldReturnPendingApprovalsCount() {
            // Arrange
            long expectedCount = 5L;
            when(stepExecutionRepository.countPendingForUser(tenantId, userId))
                    .thenReturn(expectedCount);

            // Act
            int result = approvalService.getPendingApprovalsCount(userId);

            // Assert
            assertThat(result).isEqualTo(5);

            verify(stepExecutionRepository, times(1)).countPendingForUser(tenantId, userId);
        }

        @Test
        @DisplayName("Should return zero when user has no pending approvals")
        void shouldReturnZeroWhenNoPendingApprovals() {
            // Arrange
            when(stepExecutionRepository.countPendingForUser(tenantId, userId))
                    .thenReturn(0L);

            // Act
            int result = approvalService.getPendingApprovalsCount(userId);

            // Assert
            assertThat(result).isEqualTo(0);

            verify(stepExecutionRepository, times(1)).countPendingForUser(tenantId, userId);
        }

        @Test
        @DisplayName("Should return large count when pending approvals exceed Integer.MAX_VALUE")
        void shouldCapCountAtIntegerMaxValue() {
            // Arrange
            long hugeCount = Long.MAX_VALUE;
            when(stepExecutionRepository.countPendingForUser(tenantId, userId))
                    .thenReturn(hugeCount);

            // Act
            int result = approvalService.getPendingApprovalsCount(userId);

            // Assert
            assertThat(result).isEqualTo(Integer.MAX_VALUE);

            verify(stepExecutionRepository, times(1)).countPendingForUser(tenantId, userId);
        }

        @Test
        @DisplayName("Should handle count just below Integer.MAX_VALUE")
        void shouldHandleCountJustBelowIntegerMaxValue() {
            // Arrange
            long countBelowMax = Integer.MAX_VALUE - 1;
            when(stepExecutionRepository.countPendingForUser(tenantId, userId))
                    .thenReturn(countBelowMax);

            // Act
            int result = approvalService.getPendingApprovalsCount(userId);

            // Assert
            assertThat(result).isEqualTo(Integer.MAX_VALUE - 1);

            verify(stepExecutionRepository, times(1)).countPendingForUser(tenantId, userId);
        }

        @Test
        @DisplayName("Should call tenant context to get current tenant")
        void shouldCallTenantContextGetCurrentTenant() {
            // Arrange
            when(stepExecutionRepository.countPendingForUser(tenantId, userId))
                    .thenReturn(3L);

            // Act
            approvalService.getPendingApprovalsCount(userId);

            // Assert - TenantContext.requireCurrentTenant was called (verified via mockStatic)
            tenantContextMock.verify(TenantContext::requireCurrentTenant, atLeastOnce());
        }

        @Test
        @DisplayName("Should call repository with correct tenant and user IDs")
        void shouldCallRepositoryWithCorrectIds() {
            // Arrange
            when(stepExecutionRepository.countPendingForUser(tenantId, userId))
                    .thenReturn(2L);

            // Act
            approvalService.getPendingApprovalsCount(userId);

            // Assert
            verify(stepExecutionRepository, times(1)).countPendingForUser(tenantId, userId);
        }

        @Test
        @DisplayName("Should handle different user IDs correctly")
        void shouldHandleDifferentUserIds() {
            // Arrange
            UUID anotherUserId = UUID.randomUUID();
            when(stepExecutionRepository.countPendingForUser(tenantId, userId))
                    .thenReturn(5L);
            when(stepExecutionRepository.countPendingForUser(tenantId, anotherUserId))
                    .thenReturn(10L);

            // Act
            int result1 = approvalService.getPendingApprovalsCount(userId);
            int result2 = approvalService.getPendingApprovalsCount(anotherUserId);

            // Assert
            assertThat(result1).isEqualTo(5);
            assertThat(result2).isEqualTo(10);

            verify(stepExecutionRepository, times(1)).countPendingForUser(tenantId, userId);
            verify(stepExecutionRepository, times(1)).countPendingForUser(tenantId, anotherUserId);
        }

        @Test
        @DisplayName("Should handle count of 1")
        void shouldHandleCountOfOne() {
            // Arrange
            when(stepExecutionRepository.countPendingForUser(tenantId, userId))
                    .thenReturn(1L);

            // Act
            int result = approvalService.getPendingApprovalsCount(userId);

            // Assert
            assertThat(result).isEqualTo(1);
        }

        @Test
        @DisplayName("Should handle typical moderate count")
        void shouldHandleModerateCount() {
            // Arrange
            when(stepExecutionRepository.countPendingForUser(tenantId, userId))
                    .thenReturn(42L);

            // Act
            int result = approvalService.getPendingApprovalsCount(userId);

            // Assert
            assertThat(result).isEqualTo(42);
        }
    }
}
