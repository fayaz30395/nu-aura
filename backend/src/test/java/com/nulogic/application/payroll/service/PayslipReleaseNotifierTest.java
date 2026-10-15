package com.nulogic.application.payroll.service;

import com.nulogic.application.notification.service.WebSocketNotificationService;
import com.nulogic.domain.employee.Employee;
import com.nulogic.domain.payroll.PayrollRun;
import com.nulogic.domain.payroll.PayrollRun.PayrollStatus;
import com.nulogic.domain.payroll.Payslip;
import com.nulogic.domain.user.User;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.payroll.repository.PayslipRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("PayslipReleaseNotifier")
class PayslipReleaseNotifierTest {

    @Mock
    private PayslipRepository payslipRepository;
    @Mock
    private EmployeeRepository employeeRepository;
    @Mock
    private WebSocketNotificationService webSocketNotificationService;
    @InjectMocks
    private PayslipReleaseNotifier notifier;

    private UUID tenantId;
    private PayrollRun run;

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
        run = PayrollRun.builder().payPeriodYear(2025).payPeriodMonth(3).status(PayrollStatus.APPROVED).build();
        run.setId(UUID.randomUUID());
        run.setTenantId(tenantId);
    }

    private Employee employeeWithUser(UUID employeeId, UUID userId) {
        Employee employee = Employee.builder().build();
        employee.setId(employeeId);
        if (userId != null) {
            User user = User.builder().build();
            user.setId(userId);
            employee.setUser(user);
        }
        return employee;
    }

    private Payslip payslipFor(UUID employeeId) {
        Payslip payslip = Payslip.builder().employeeId(employeeId).build();
        return payslip;
    }

    @Test
    @DisplayName("notifies the linked USER id, not the employee id, once per user")
    void notifiesLinkedUserOncePerUser() {
        UUID empId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        when(payslipRepository.findByTenantIdAndPayrollRunId(tenantId, run.getId()))
                .thenReturn(List.of(payslipFor(empId)));
        when(employeeRepository.findAllByIdInAndTenantId(anyCollection(), eq(tenantId)))
                .thenReturn(List.of(employeeWithUser(empId, userId), employeeWithUser(UUID.randomUUID(), userId)));

        notifier.notifyReleased(run, tenantId);

        verify(webSocketNotificationService, times(1)).notifyPayslipAvailable(userId, "March", "2025");
        verify(webSocketNotificationService, never()).notifyPayslipAvailable(eq(empId), anyString(), anyString());
    }

    @Test
    @DisplayName("skips employees without a linked user")
    void skipsEmployeeWithoutUser() {
        UUID empId = UUID.randomUUID();
        when(payslipRepository.findByTenantIdAndPayrollRunId(tenantId, run.getId()))
                .thenReturn(List.of(payslipFor(empId)));
        when(employeeRepository.findAllByIdInAndTenantId(anyCollection(), eq(tenantId)))
                .thenReturn(List.of(employeeWithUser(empId, null)));

        notifier.notifyReleased(run, tenantId);

        verify(webSocketNotificationService, never()).notifyPayslipAvailable(any(), anyString(), anyString());
    }

    @Test
    @DisplayName("does nothing for a run that is not released")
    void ignoresUnreleasedRun() {
        run.setStatus(PayrollStatus.PROCESSED);

        notifier.notifyReleased(run, tenantId);

        verify(payslipRepository, never()).findByTenantIdAndPayrollRunId(any(), any());
        verify(webSocketNotificationService, never()).notifyPayslipAvailable(any(), anyString(), anyString());
    }
}
