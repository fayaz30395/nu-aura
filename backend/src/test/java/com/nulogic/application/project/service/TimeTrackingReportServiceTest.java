package com.nulogic.application.project.service;

import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.security.TenantContext;
import com.nulogic.infrastructure.project.repository.ProjectTimeEntryRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("TimeTrackingReportService employee scope (audit #6)")
class TimeTrackingReportServiceTest {

    private static final LocalDate START = LocalDate.of(2026, 5, 1);
    private static final LocalDate END = LocalDate.of(2026, 5, 31);

    @Mock
    private ProjectTimeEntryRepository timeEntryRepository;
    @InjectMocks
    private TimeTrackingReportService service;

    private MockedStatic<SecurityContext> securityContextMock;
    private MockedStatic<TenantContext> tenantContextMock;
    private final UUID tenantId = UUID.randomUUID();
    private final UUID callerId = UUID.randomUUID();
    private final UUID otherId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        securityContextMock = mockStatic(SecurityContext.class);
        tenantContextMock = mockStatic(TenantContext.class);
        tenantContextMock.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
        securityContextMock.when(SecurityContext::getCurrentEmployeeId).thenReturn(callerId);
        securityContextMock.when(SecurityContext::isSuperAdmin).thenReturn(false);
        securityContextMock.when(() -> SecurityContext.hasAnyPermission(any(String[].class))).thenReturn(false);
    }

    @AfterEach
    void tearDown() {
        securityContextMock.close();
        tenantContextMock.close();
    }

    @Test
    @DisplayName("Employee cannot read another employee's summary, weekly, monthly or overtime data")
    void otherEmployeeDenied() {
        assertThatThrownBy(() -> service.getEmployeeTimeSummary(otherId, START, END))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> service.getWeeklyTimeReport(otherId, START))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> service.getMonthlyTimeReport(otherId, 2026, 5))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> service.assertCanAccessEmployee(otherId))
                .isInstanceOf(AccessDeniedException.class);
        verifyNoInteractions(timeEntryRepository);
    }

    @Test
    @DisplayName("Employee can read their own summary")
    void selfAllowed() {
        when(timeEntryRepository.findByTenantIdAndEmployeeIdAndWorkDateBetween(tenantId, callerId, START, END))
                .thenReturn(List.of());

        assertThatCode(() -> service.getEmployeeTimeSummary(callerId, START, END)).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("Timesheet approver can read another employee's summary")
    void approverAllowed() {
        securityContextMock.when(() -> SecurityContext.hasAnyPermission(any(String[].class))).thenReturn(true);
        when(timeEntryRepository.findByTenantIdAndEmployeeIdAndWorkDateBetween(tenantId, otherId, START, END))
                .thenReturn(List.of());

        assertThatCode(() -> service.getEmployeeTimeSummary(otherId, START, END)).doesNotThrowAnyException();
    }
}
