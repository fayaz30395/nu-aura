package com.nulogic.application.admin.service;

import com.nulogic.application.audit.service.AuditLogService;
import com.nulogic.application.document.service.StorageMetricsService;
import com.nulogic.application.notification.service.EmailNotificationService;
import com.nulogic.common.config.TenantCacheManager;
import com.nulogic.common.exception.ValidationException;
import com.nulogic.common.security.JwtTokenProvider;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.security.TenantFilter;
import com.nulogic.common.security.TokenBlacklistService;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.tenant.Tenant;
import com.nulogic.domain.tenant.Tenant.TenantStatus;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.tenant.repository.TenantRepository;
import com.nulogic.infrastructure.tenant.repository.TenantStatusCache;
import com.nulogic.infrastructure.user.repository.UserRepository;
import com.nulogic.infrastructure.workflow.repository.WorkflowExecutionRepository;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("SystemAdminService Tests")
class SystemAdminServiceTest {

    private static MockedStatic<SecurityContext> securityContextMock;

    @Mock
    private TenantRepository tenantRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private EmployeeRepository employeeRepository;
    @Mock
    private WorkflowExecutionRepository workflowExecutionRepository;
    @Mock
    private JwtTokenProvider jwtTokenProvider;
    @Mock
    private AuditLogService auditLogService;
    @Mock
    private TenantFilter tenantFilter;
    @Mock
    private TenantCacheManager tenantCacheManager;
    @Mock
    private StorageMetricsService storageMetricsService;
    @Mock
    private AiUsageService aiUsageService;
    @Mock
    private TenantStatusCache tenantStatusCache;
    @Mock
    private TokenBlacklistService tokenBlacklistService;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private EmailNotificationService emailNotificationService;
    @Mock
    private TenantTimeService tenantTimeService;
    @Mock
    private ImpersonationExchangeTokenService impersonationExchangeTokenService;
    @InjectMocks
    private SystemAdminService systemAdminService;

    private UUID tenantId;
    private UUID adminUserId;

    @BeforeAll
    static void setUpClass() {
        securityContextMock = mockStatic(SecurityContext.class);
    }

    @AfterAll
    static void tearDownClass() {
        securityContextMock.close();
    }

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
        adminUserId = UUID.randomUUID();
        securityContextMock.when(SecurityContext::getCurrentUserId).thenReturn(adminUserId);
    }

    private Tenant tenantIn(TenantStatus status) {
        return Tenant.builder()
                .name("Acme Corp")
                .status(status)
                .build();
    }

    @Nested
    @DisplayName("Suspend Tenant")
    class SuspendTenantTests {

        @Test
        @DisplayName("Should suspend an ACTIVE tenant and invalidate all caches")
        void shouldSuspendActiveTenant() {
            Tenant tenant = tenantIn(TenantStatus.ACTIVE);
            when(tenantRepository.findById(tenantId)).thenReturn(Optional.of(tenant));
            when(tenantRepository.save(any(Tenant.class))).thenAnswer(inv -> inv.getArgument(0));

            Tenant result = systemAdminService.suspendTenant(tenantId);

            assertThat(result.getStatus()).isEqualTo(TenantStatus.SUSPENDED);
            verify(tenantFilter).invalidateTenant(tenantId);
            verify(tenantCacheManager).invalidateTenantCaches(tenantId);
            verify(tenantStatusCache).evict(tenantId);
            verify(tokenBlacklistService).revokeAllTokensForTenant(eq(tenantId), any(Instant.class));
        }

        @Test
        @DisplayName("Should reject suspending a tenant that is not ACTIVE")
        void shouldRejectSuspendingNonActiveTenant() {
            Tenant tenant = tenantIn(TenantStatus.SUSPENDED);
            when(tenantRepository.findById(tenantId)).thenReturn(Optional.of(tenant));

            assertThatThrownBy(() -> systemAdminService.suspendTenant(tenantId))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("Cannot suspend tenant");
        }
    }

    @Nested
    @DisplayName("Activate Tenant")
    class ActivateTenantTests {

        @Test
        @DisplayName("Should re-activate a SUSPENDED tenant")
        void shouldActivateSuspendedTenant() {
            Tenant tenant = tenantIn(TenantStatus.SUSPENDED);
            when(tenantRepository.findById(tenantId)).thenReturn(Optional.of(tenant));
            when(tenantRepository.save(any(Tenant.class))).thenAnswer(inv -> inv.getArgument(0));

            Tenant result = systemAdminService.activateTenant(tenantId);

            assertThat(result.getStatus()).isEqualTo(TenantStatus.ACTIVE);
            verify(tenantStatusCache).evict(tenantId);
        }
    }

    @Nested
    @DisplayName("Update Tenant Timezone")
    class UpdateTenantTimezoneTests {

        @Test
        @DisplayName("Should reject an unknown IANA timezone before touching the DB")
        void shouldRejectUnknownTimezone() {
            assertThatThrownBy(() -> systemAdminService.updateTenantTimezone(tenantId, "Not/AZone"))
                    .isInstanceOf(ValidationException.class)
                    .hasMessageContaining("Unknown IANA timezone");
            verify(tenantRepository, never()).findById(any(UUID.class));
        }

        @Test
        @DisplayName("Should treat a same-value timezone update as a no-op")
        void shouldNoOpWhenTimezoneUnchanged() {
            Tenant tenant = tenantIn(TenantStatus.ACTIVE); // default timezone Asia/Kolkata
            when(tenantRepository.findById(tenantId)).thenReturn(Optional.of(tenant));

            Tenant result = systemAdminService.updateTenantTimezone(tenantId, "Asia/Kolkata");

            assertThat(result).isSameAs(tenant);
            verify(tenantRepository, never()).save(any(Tenant.class));
        }
    }
}
