package com.nulogic.application.report.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nulogic.api.report.dto.ReportTemplateDto;
import com.nulogic.common.security.Permission;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.security.TenantContext;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.infrastructure.attendance.repository.AttendanceRecordRepository;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.leave.repository.LeaveRequestRepository;
import com.nulogic.infrastructure.payroll.repository.PayslipRepository;
import com.nulogic.infrastructure.performance.repository.PerformanceReviewRepository;
import com.nulogic.infrastructure.report.repository.ReportTemplateRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("CustomReportService payroll data-level authorization")
class CustomReportServiceAuthzTest {

    @Mock
    private ReportTemplateRepository templateRepository;
    @Mock
    private EmployeeRepository employeeRepository;
    @Mock
    private AttendanceRecordRepository attendanceRecordRepository;
    @Mock
    private LeaveRequestRepository leaveRequestRepository;
    @Mock
    private PayslipRepository payslipRepository;
    @Mock
    private PerformanceReviewRepository performanceReviewRepository;
    @Mock
    private ObjectMapper objectMapper;
    @Mock
    private TenantTimeService tenantTimeService;
    @InjectMocks
    private CustomReportService service;

    private MockedStatic<TenantContext> tenantContextMock;
    private MockedStatic<SecurityContext> securityContextMock;

    @BeforeEach
    void setUp() {
        tenantContextMock = Mockito.mockStatic(TenantContext.class);
        securityContextMock = Mockito.mockStatic(SecurityContext.class);
        tenantContextMock.when(TenantContext::getCurrentTenant).thenReturn(UUID.randomUUID());
    }

    @AfterEach
    void tearDown() {
        tenantContextMock.close();
        securityContextMock.close();
    }

    private ReportTemplateDto payrollQuery() {
        ReportTemplateDto dto = new ReportTemplateDto();
        dto.setModule("PAYROLL");
        dto.setSelectedColumns(List.of("netSalary"));
        return dto;
    }

    @Test
    @DisplayName("payroll execute is denied without PAYROLL:VIEW_ALL and reads no payslips")
    void payrollExecuteDeniedWithoutPayrollPermission() {
        securityContextMock.when(() -> SecurityContext.hasPermission(Permission.PAYROLL_VIEW_ALL)).thenReturn(false);

        assertThatThrownBy(() -> service.executeReport(payrollQuery()))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> service.toCsv(payrollQuery()))
                .isInstanceOf(AccessDeniedException.class);

        verify(payslipRepository, never()).findAllByTenantId(any(), any(Pageable.class));
    }

    @Test
    @DisplayName("payroll execute succeeds with PAYROLL:VIEW_ALL")
    void payrollExecuteAllowedWithPayrollPermission() {
        securityContextMock.when(() -> SecurityContext.hasPermission(Permission.PAYROLL_VIEW_ALL)).thenReturn(true);
        when(payslipRepository.findAllByTenantId(any(), any(Pageable.class))).thenReturn(new PageImpl<>(List.of()));

        assertThat(service.executeReport(payrollQuery())).isEmpty();
        verify(payslipRepository).findAllByTenantId(any(), any(Pageable.class));
    }

    @Test
    @DisplayName("non-payroll modules are not gated by the payroll permission")
    void nonPayrollModuleUnaffected() {
        securityContextMock.when(() -> SecurityContext.hasPermission(Permission.PAYROLL_VIEW_ALL)).thenReturn(false);
        when(leaveRequestRepository.findAllByTenantId(any(), any(Pageable.class))).thenReturn(new PageImpl<>(List.of()));
        ReportTemplateDto dto = new ReportTemplateDto();
        dto.setModule("LEAVE");
        dto.setSelectedColumns(List.of("status"));

        assertThat(service.executeReport(dto)).isEmpty();
    }
}
