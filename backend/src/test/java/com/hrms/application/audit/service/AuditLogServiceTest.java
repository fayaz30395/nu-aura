package com.hrms.application.audit.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.audit.dto.AuditLogResponse;
import com.hrms.common.exception.BusinessException;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.audit.AuditLog;
import com.hrms.domain.audit.AuditLog.AuditAction;
import com.hrms.infrastructure.audit.repository.AuditLogRepository;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import org.junit.jupiter.api.*;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@MockitoSettings(strictness = Strictness.LENIENT)
@ExtendWith(MockitoExtension.class)
@DisplayName("AuditLogService Tests")
class AuditLogServiceTest {

    @Mock
    private AuditLogRepository auditLogRepository;

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private ObjectMapper objectMapper;

    @InjectMocks
    private AuditLogService auditLogService;

    private UUID tenantId;
    private UUID userId;
    private UUID entityId;
    private AuditLog testAuditLog;

    private static MockedStatic<TenantContext> tenantContextMock;
    private static MockedStatic<SecurityContext> securityContextMock;

    @BeforeAll
    static void setUpClass() {
        tenantContextMock = mockStatic(TenantContext.class);
        securityContextMock = mockStatic(SecurityContext.class);
    }

    @AfterAll
    static void tearDownClass() {
        tenantContextMock.close();
        securityContextMock.close();
    }

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
        userId = UUID.randomUUID();
        entityId = UUID.randomUUID();

        tenantContextMock.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
        securityContextMock.when(SecurityContext::getCurrentUserId).thenReturn(userId);
        securityContextMock.when(SecurityContext::getCurrentTenantId).thenReturn(tenantId);

        testAuditLog = AuditLog.builder()
                .id(UUID.randomUUID())
                .entityType("EMPLOYEE")
                .entityId(entityId)
                .action(AuditAction.CREATE)
                .actorId(userId)
                .actorEmail("actor@company.com")
                .oldValue(null)
                .newValue("{\"name\":\"John\"}")
                .changes("Employee created")
                .ipAddress("192.168.1.1")
                .userAgent("Mozilla/5.0")
                .build();
        testAuditLog.setTenantId(tenantId);
        testAuditLog.setCreatedAt(LocalDateTime.now());
    }

    @Nested
    @DisplayName("LogAction Tests")
    class LogActionTests {

        @Test
        @DisplayName("Should log action with all parameters")
        void shouldLogActionWithAllParameters() throws Exception {
            // Arrange
            Map<String, String> oldValue = Map.of("name", "Old Name");
            Map<String, String> newValue = Map.of("name", "New Name");
            String description = "Name updated";

            when(objectMapper.writeValueAsString(oldValue))
                    .thenReturn("{\"name\":\"Old Name\"}");
            when(objectMapper.writeValueAsString(newValue))
                    .thenReturn("{\"name\":\"New Name\"}");
            when(auditLogRepository.save(any(AuditLog.class)))
                    .thenAnswer(invocation -> {
                        AuditLog log = invocation.getArgument(0);
                        log.setId(UUID.randomUUID());
                        return log;
                    });

            // Act
            AuditLog result = auditLogService.logAction(
                    "EMPLOYEE", entityId, AuditAction.UPDATE, oldValue, newValue, description
            );

            // Assert
            assertThat(result)
                    .isNotNull()
                    .extracting(
                            AuditLog::getEntityType,
                            AuditLog::getEntityId,
                            AuditLog::getAction,
                            AuditLog::getActorId,
                            AuditLog::getChanges
                    )
                    .containsExactly("EMPLOYEE", entityId, AuditAction.UPDATE, userId, description);

            assertThat(result.getTenantId()).isEqualTo(tenantId);
            verify(auditLogRepository, times(1)).save(any(AuditLog.class));
        }

        @Test
        @DisplayName("Should log action without old/new values")
        void shouldLogActionWithoutValues() {
            // Arrange
            when(auditLogRepository.save(any(AuditLog.class)))
                    .thenAnswer(invocation -> {
                        AuditLog log = invocation.getArgument(0);
                        log.setId(UUID.randomUUID());
                        return log;
                    });

            // Act
            AuditLog result = auditLogService.logAction("EMPLOYEE", entityId, AuditAction.DELETE);

            // Assert
            assertThat(result)
                    .isNotNull()
                    .extracting(
                            AuditLog::getOldValue,
                            AuditLog::getNewValue,
                            AuditLog::getChanges
                    )
                    .containsExactly(null, null, null);

            verify(auditLogRepository, times(1)).save(any(AuditLog.class));
        }

        @Test
        @DisplayName("Should handle JSON serialization exception")
        void shouldHandleJsonSerializationException() throws Exception {
            // Arrange
            Map<String, String> oldValue = Map.of("key", "value");

            when(objectMapper.writeValueAsString(oldValue))
                    .thenThrow(new com.fasterxml.jackson.core.JsonProcessingException("Serialization error") {});

            // Act & Assert
            assertThatThrownBy(() -> auditLogService.logAction(
                    "EMPLOYEE", entityId, AuditAction.UPDATE, oldValue, null, null
            ))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("Failed to create audit log");

            verify(auditLogRepository, never()).save(any());
        }

        @Test
        @DisplayName("Should truncate user agent if too long")
        void shouldTruncateUserAgent() throws Exception {
            // Arrange
            when(objectMapper.writeValueAsString(any()))
                    .thenReturn("{}");
            when(auditLogRepository.save(any(AuditLog.class)))
                    .thenAnswer(invocation -> {
                        AuditLog log = invocation.getArgument(0);
                        log.setId(UUID.randomUUID());
                        return log;
                    });

            String longUserAgent = "A".repeat(600);

            // Act
            AuditLog result = auditLogService.logAction(
                    "EMPLOYEE", entityId, AuditAction.CREATE, null, null, null
            );

            // Assert
            assertThat(result).isNotNull();
            verify(auditLogRepository, times(1)).save(any(AuditLog.class));
        }

        @Test
        @DisplayName("Should log security event")
        void shouldLogSecurityEvent() {
            // Arrange
            when(auditLogRepository.save(any(AuditLog.class)))
                    .thenAnswer(invocation -> {
                        AuditLog log = invocation.getArgument(0);
                        log.setId(UUID.randomUUID());
                        return log;
                    });

            // Act
            AuditLog result = auditLogService.logSecurityEvent(
                    AuditAction.LOGIN, userId, "User logged in"
            );

            // Assert
            assertThat(result)
                    .isNotNull()
                    .extracting(
                            AuditLog::getEntityType,
                            AuditLog::getEntityId,
                            AuditLog::getAction
                    )
                    .containsExactly("USER", userId, AuditAction.LOGIN);

            verify(auditLogRepository, times(1)).save(any(AuditLog.class));
        }
    }

    @Nested
    @DisplayName("GetAllAuditLogs Tests")
    class GetAllAuditLogsTests {

        @Test
        @DisplayName("Should return paginated audit logs")
        void shouldReturnPaginatedAuditLogs() {
            // Arrange
            Pageable pageable = PageRequest.of(0, 10);
            Page<AuditLog> logsPage = new PageImpl<>(
                    Collections.singletonList(testAuditLog),
                    pageable,
                    1
            );

            when(auditLogRepository.findAllByTenantIdOrderByCreatedAtDesc(tenantId, pageable))
                    .thenReturn(logsPage);

            // Act
            Page<AuditLogResponse> result = auditLogService.getAllAuditLogs(pageable);

            // Assert
            assertThat(result)
                    .isNotNull()
                    .hasSize(1);

            verify(auditLogRepository, times(1))
                    .findAllByTenantIdOrderByCreatedAtDesc(tenantId, pageable);
        }

        @Test
        @DisplayName("Should return empty page when no logs exist")
        void shouldReturnEmptyPageWhenNoLogs() {
            // Arrange
            Pageable pageable = PageRequest.of(0, 10);
            Page<AuditLog> emptyPage = new PageImpl<>(Collections.emptyList(), pageable, 0);

            when(auditLogRepository.findAllByTenantIdOrderByCreatedAtDesc(tenantId, pageable))
                    .thenReturn(emptyPage);

            // Act
            Page<AuditLogResponse> result = auditLogService.getAllAuditLogs(pageable);

            // Assert
            assertThat(result)
                    .isNotNull()
                    .isEmpty();
        }
    }

    @Nested
    @DisplayName("GetAuditLogsByEntityType Tests")
    class GetAuditLogsByEntityTypeTests {

        @Test
        @DisplayName("Should return audit logs by entity type")
        void shouldReturnLogsByEntityType() {
            // Arrange
            Pageable pageable = PageRequest.of(0, 10);
            Page<AuditLog> logsPage = new PageImpl<>(
                    Collections.singletonList(testAuditLog),
                    pageable,
                    1
            );

            when(auditLogRepository.findByTenantIdAndEntityTypeOrderByCreatedAtDesc(
                    tenantId, "EMPLOYEE", pageable))
                    .thenReturn(logsPage);

            // Act
            Page<AuditLogResponse> result = auditLogService.getAuditLogsByEntityType("EMPLOYEE", pageable);

            // Assert
            assertThat(result)
                    .isNotNull()
                    .hasSize(1);

            verify(auditLogRepository, times(1))
                    .findByTenantIdAndEntityTypeOrderByCreatedAtDesc(tenantId, "EMPLOYEE", pageable);
        }
    }

    @Nested
    @DisplayName("GetAuditLogsByEntity Tests")
    class GetAuditLogsByEntityTests {

        @Test
        @DisplayName("Should return audit logs by entity ID")
        void shouldReturnLogsByEntity() {
            // Arrange
            Pageable pageable = PageRequest.of(0, 10);
            Page<AuditLog> logsPage = new PageImpl<>(
                    Collections.singletonList(testAuditLog),
                    pageable,
                    1
            );

            when(auditLogRepository.findByTenantIdAndEntityTypeAndEntityIdOrderByCreatedAtDesc(
                    tenantId, "EMPLOYEE", entityId, pageable))
                    .thenReturn(logsPage);

            // Act
            Page<AuditLogResponse> result = auditLogService.getAuditLogsByEntity("EMPLOYEE", entityId, pageable);

            // Assert
            assertThat(result)
                    .isNotNull()
                    .hasSize(1);

            verify(auditLogRepository, times(1))
                    .findByTenantIdAndEntityTypeAndEntityIdOrderByCreatedAtDesc(
                            tenantId, "EMPLOYEE", entityId, pageable
                    );
        }
    }

    @Nested
    @DisplayName("GetAuditLogsByActor Tests")
    class GetAuditLogsByActorTests {

        @Test
        @DisplayName("Should return audit logs by actor ID")
        void shouldReturnLogsByActor() {
            // Arrange
            Pageable pageable = PageRequest.of(0, 10);
            Page<AuditLog> logsPage = new PageImpl<>(
                    Collections.singletonList(testAuditLog),
                    pageable,
                    1
            );

            when(auditLogRepository.findByTenantIdAndActorIdOrderByCreatedAtDesc(tenantId, userId, pageable))
                    .thenReturn(logsPage);

            // Act
            Page<AuditLogResponse> result = auditLogService.getAuditLogsByActor(userId, pageable);

            // Assert
            assertThat(result)
                    .isNotNull()
                    .hasSize(1);

            verify(auditLogRepository, times(1))
                    .findByTenantIdAndActorIdOrderByCreatedAtDesc(tenantId, userId, pageable);
        }
    }

    @Nested
    @DisplayName("GetAuditLogsByAction Tests")
    class GetAuditLogsByActionTests {

        @Test
        @DisplayName("Should return audit logs by action")
        void shouldReturnLogsByAction() {
            // Arrange
            Pageable pageable = PageRequest.of(0, 10);
            Page<AuditLog> logsPage = new PageImpl<>(
                    Collections.singletonList(testAuditLog),
                    pageable,
                    1
            );

            when(auditLogRepository.findByTenantIdAndActionOrderByCreatedAtDesc(tenantId, AuditAction.CREATE, pageable))
                    .thenReturn(logsPage);

            // Act
            Page<AuditLogResponse> result = auditLogService.getAuditLogsByAction(AuditAction.CREATE, pageable);

            // Assert
            assertThat(result)
                    .isNotNull()
                    .hasSize(1);

            verify(auditLogRepository, times(1))
                    .findByTenantIdAndActionOrderByCreatedAtDesc(tenantId, AuditAction.CREATE, pageable);
        }
    }

    @Nested
    @DisplayName("GetRecentAuditLogsForEntity Tests")
    class GetRecentAuditLogsForEntityTests {

        @Test
        @DisplayName("Should return recent audit logs for entity")
        void shouldReturnRecentLogsForEntity() {
            // Arrange
            when(auditLogRepository.findTop10ByTenantIdAndEntityTypeAndEntityIdOrderByCreatedAtDesc(
                    tenantId, "EMPLOYEE", entityId))
                    .thenReturn(Collections.singletonList(testAuditLog));

            // Act
            List<AuditLogResponse> result = auditLogService.getRecentAuditLogsForEntity("EMPLOYEE", entityId);

            // Assert
            assertThat(result)
                    .isNotNull()
                    .hasSize(1);

            verify(auditLogRepository, times(1))
                    .findTop10ByTenantIdAndEntityTypeAndEntityIdOrderByCreatedAtDesc(
                            tenantId, "EMPLOYEE", entityId
                    );
        }

        @Test
        @DisplayName("Should return empty list when no recent logs exist")
        void shouldReturnEmptyListWhenNoRecentLogs() {
            // Arrange
            when(auditLogRepository.findTop10ByTenantIdAndEntityTypeAndEntityIdOrderByCreatedAtDesc(
                    tenantId, "EMPLOYEE", entityId))
                    .thenReturn(Collections.emptyList());

            // Act
            List<AuditLogResponse> result = auditLogService.getRecentAuditLogsForEntity("EMPLOYEE", entityId);

            // Assert
            assertThat(result)
                    .isNotNull()
                    .isEmpty();
        }
    }

    @Nested
    @DisplayName("GetAuditSummary Tests")
    class GetAuditSummaryTests {

        @Test
        @DisplayName("Should return audit summary")
        void shouldReturnAuditSummary() {
            // Arrange
            when(auditLogRepository.countByTenantId(tenantId))
                    .thenReturn(100L);
            when(auditLogRepository.countByTenantIdAndDateRange(eq(tenantId), any(LocalDateTime.class), any(LocalDateTime.class)))
                    .thenReturn(10L);

            // Act
            Map<String, Long> result = auditLogService.getAuditSummary();

            // Assert
            assertThat(result)
                    .isNotNull()
                    .containsKey("totalEvents");

            assertThat(result.get("totalEvents")).isEqualTo(100L);
            verify(auditLogRepository, times(1)).countByTenantId(tenantId);
        }
    }
}
