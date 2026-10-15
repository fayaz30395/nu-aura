package com.nulogic.application.payroll.service;

import com.nulogic.application.notification.service.WebSocketNotificationService;
import com.nulogic.common.security.TenantContext;
import com.nulogic.domain.employee.Employee;
import com.nulogic.domain.payroll.PayrollRun;
import com.nulogic.domain.payroll.Payslip;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.payroll.repository.PayslipRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Month;
import java.time.format.TextStyle;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Sends "payslip available" notifications once a payroll run has been released
 * ({@link PayslipService#RELEASED_STATUSES}). Called after the releasing transaction commits,
 * in its own transaction, so a rollback never leaves phantom notifications and the persisted
 * bell rows are flushed independently of the (already committed) caller.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PayslipReleaseNotifier {

    private final PayslipRepository payslipRepository;
    private final EmployeeRepository employeeRepository;
    private final WebSocketNotificationService webSocketNotificationService;

    /**
     * Notifies each employee in the run exactly once, addressed to their linked USER id.
     * Employees without a linked user are skipped. Idempotency across calls is provided by
     * the run state machine (a run can be approved only once); within a call by the user-id set.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void notifyReleased(PayrollRun run, UUID tenantId) {
        UUID previousTenant = TenantContext.getCurrentTenant();
        TenantContext.setCurrentTenant(tenantId);
        try {
            if (!PayslipService.RELEASED_STATUSES.contains(run.getStatus())) {
                return;
            }
            List<Payslip> payslips = payslipRepository.findByTenantIdAndPayrollRunId(tenantId, run.getId());
            Set<UUID> employeeIds = payslips.stream().map(Payslip::getEmployeeId).collect(Collectors.toSet());
            if (employeeIds.isEmpty()) {
                return;
            }
            String month = Month.of(run.getPayPeriodMonth()).getDisplayName(TextStyle.FULL, Locale.ENGLISH);
            String year = String.valueOf(run.getPayPeriodYear());
            Set<UUID> notifiedUsers = new HashSet<>();
            for (Employee employee : employeeRepository.findAllByIdInAndTenantId(employeeIds, tenantId)) {
                UUID userId = employee.getUser() != null ? employee.getUser().getId() : null;
                if (userId == null) {
                    log.info("Skipping payslip notification for employee {}: no linked user", employee.getId());
                    continue;
                }
                if (!notifiedUsers.add(userId)) {
                    continue;
                }
                try {
                    webSocketNotificationService.notifyPayslipAvailable(userId, month, year);
                } catch (RuntimeException e) {
                    log.warn("Failed to send payslip-available notification for run {} user {}: {}",
                            run.getId(), userId, e.getMessage());
                }
            }
        } finally {
            if (previousTenant != null) {
                TenantContext.setCurrentTenant(previousTenant);
            } else {
                TenantContext.clear();
            }
        }
    }
}
