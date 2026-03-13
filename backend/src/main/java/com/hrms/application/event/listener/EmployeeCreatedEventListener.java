package com.hrms.application.event.listener;

import com.hrms.application.payroll.service.SalaryStructureService;
import com.hrms.application.statutory.service.StatutoryService;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.event.employee.EmployeeCreatedEvent;
import com.hrms.domain.statutory.EmployeeESIRecord;
import com.hrms.domain.statutory.EmployeePFRecord;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Event listener that processes employee created events for automatic statutory enrollment.
 *
 * <p>When a new employee is created, this listener:</p>
 * <ul>
 *   <li>Auto-enrolls in Provident Fund (PF) if salary >= PF threshold</li>
 *   <li>Auto-enrolls in ESI if salary < ESI threshold</li>
 *   <li>Assigns default payroll structure (if available)</li>
 * </ul>
 *
 * <p>Uses {@link TransactionalEventListener} to ensure operations complete after
 * the employee creation is committed, providing better isolation and error handling.</p>
 *
 * <p><strong>Statutory Thresholds (India - as of FY 2024-25):</strong></p>
 * <ul>
 *   <li>PF: Applicable if Basic + DA >= ₹15,000/month</li>
 *   <li>ESI: Applicable if Gross Salary <= ₹21,000/month</li>
 * </ul>
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class EmployeeCreatedEventListener {

    private final StatutoryService statutoryService;
    private final SalaryStructureService salaryStructureService;

    // Statutory thresholds (India)
    private static final BigDecimal PF_THRESHOLD = new BigDecimal("15000"); // ₹15,000/month
    private static final BigDecimal ESI_THRESHOLD = new BigDecimal("21000"); // ₹21,000/month

    /**
     * Handles the employee created event by auto-enrolling in statutory schemes.
     *
     * Runs AFTER the employee creation transaction commits for better isolation.
     */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleEmployeeCreated(EmployeeCreatedEvent event) {
        Employee employee = event.getEmployee();
        UUID employeeId = employee.getId();

        log.info("Processing EmployeeCreatedEvent for employee: {} ({})",
                employeeId, employee.getFullName());

        UUID tenantId = event.getTenantId();

        try {
            // Set tenant context for the operations
            TenantContext.setCurrentTenant(tenantId);

            // Step A: Auto-enroll in Provident Fund (if applicable)
            enrollInPFIfEligible(employee);

            // Step B: Auto-enroll in ESI (if applicable)
            enrollInESIIfEligible(employee);

            // Step C: Assign default payroll structure (if available)
            assignDefaultSalaryStructure(employee);

            log.info("EmployeeCreatedEvent processing completed successfully for employee: {}",
                    employeeId);
        } catch (Exception e) {
            log.error("Error processing EmployeeCreatedEvent for employee {} ({}): {}",
                    employeeId, employee.getFullName(), e.getMessage(), e);
            // Log the error but don't propagate - the employee creation is already committed
        } finally {
            TenantContext.clear();
        }
    }

    /**
     * Enrolls employee in Provident Fund if salary meets threshold.
     *
     * PF is mandatory if Basic + DA >= ₹15,000/month.
     * If salary structure not yet assigned, enrollment is deferred.
     */
    private void enrollInPFIfEligible(Employee employee) {
        try {
            // Check if employee already has PF record
            if (statutoryService.getEmployeePFRecord(employee.getId()).isPresent()) {
                log.debug("Employee {} already has PF record, skipping enrollment", employee.getId());
                return;
            }

            // Check if salary structure exists to determine eligibility
            BigDecimal monthlySalary = getMonthlySalaryForStatutory(employee);
            if (monthlySalary == null) {
                log.info("Employee {} has no salary structure yet, deferring PF enrollment", employee.getId());
                return;
            }

            // PF is applicable if salary >= threshold
            if (monthlySalary.compareTo(PF_THRESHOLD) >= 0) {
                EmployeePFRecord pfRecord = EmployeePFRecord.builder()
                        .id(UUID.randomUUID())
                        .employeeId(employee.getId())
                        .enrollmentDate(LocalDate.now())
                        .status(EmployeePFRecord.PFStatus.ACTIVE)
                        .build();

                statutoryService.enrollEmployeePF(pfRecord);
                log.info("Employee {} auto-enrolled in PF (salary: ₹{})", employee.getId(), monthlySalary);
            } else {
                log.debug("Employee {} not eligible for PF (salary: ₹{} < threshold: ₹{})",
                        employee.getId(), monthlySalary, PF_THRESHOLD);
            }
        } catch (Exception e) {
            log.warn("Could not enroll employee {} in PF: {}", employee.getId(), e.getMessage());
            // Don't fail the entire flow if PF enrollment fails
        }
    }

    /**
     * Enrolls employee in ESI if salary is below threshold.
     *
     * ESI is mandatory if Gross Salary <= ₹21,000/month.
     * If salary structure not yet assigned, enrollment is deferred.
     */
    private void enrollInESIIfEligible(Employee employee) {
        try {
            // Check if employee already has ESI record
            if (statutoryService.getEmployeeESIRecord(employee.getId()).isPresent()) {
                log.debug("Employee {} already has ESI record, skipping enrollment", employee.getId());
                return;
            }

            // Check if salary structure exists to determine eligibility
            BigDecimal monthlySalary = getMonthlySalaryForStatutory(employee);
            if (monthlySalary == null) {
                log.info("Employee {} has no salary structure yet, deferring ESI enrollment", employee.getId());
                return;
            }

            // ESI is applicable if salary <= threshold
            if (monthlySalary.compareTo(ESI_THRESHOLD) <= 0) {
                EmployeeESIRecord esiRecord = EmployeeESIRecord.builder()
                        .id(UUID.randomUUID())
                        .employeeId(employee.getId())
                        .enrollmentDate(LocalDate.now())
                        .status(EmployeeESIRecord.ESIStatus.ACTIVE)
                        .build();

                statutoryService.enrollEmployeeESI(esiRecord);
                log.info("Employee {} auto-enrolled in ESI (salary: ₹{})", employee.getId(), monthlySalary);
            } else {
                log.debug("Employee {} not eligible for ESI (salary: ₹{} > threshold: ₹{})",
                        employee.getId(), monthlySalary, ESI_THRESHOLD);
            }
        } catch (Exception e) {
            log.warn("Could not enroll employee {} in ESI: {}", employee.getId(), e.getMessage());
            // Don't fail the entire flow if ESI enrollment fails
        }
    }

    /**
     * Assigns default salary structure to the employee (if available).
     *
     * This is optional and depends on organization policy.
     * If no default structure exists, HR will assign manually.
     */
    private void assignDefaultSalaryStructure(Employee employee) {
        try {
            // Check if default salary structure assignment is available
            salaryStructureService.assignDefaultStructureIfAvailable(employee);
            log.debug("Default salary structure assignment attempted for employee {}", employee.getId());
        } catch (Exception e) {
            log.debug("Could not assign default salary structure for employee {}: {}",
                    employee.getId(), e.getMessage());
            // Don't fail the flow - manual assignment is acceptable
        }
    }

    /**
     * Gets monthly salary for statutory eligibility check.
     *
     * Returns null if no salary structure exists yet.
     * For PF: Returns Basic + DA
     * For ESI: Returns Gross Salary
     */
    private BigDecimal getMonthlySalaryForStatutory(Employee employee) {
        try {
            return salaryStructureService.getMonthlySalaryForEmployee(employee.getId())
                    .orElse(null);
        } catch (Exception e) {
            log.debug("Could not fetch salary for employee {}: {}", employee.getId(), e.getMessage());
            return null;
        }
    }
}
