package com.nulogic.application.payroll.service;

import com.nulogic.api.payroll.dto.BulkPayrollPreviewItem;
import com.nulogic.api.payroll.dto.BulkPayrollProcessItem;
import com.nulogic.api.payroll.dto.BulkPayrollProcessResponse;
import com.nulogic.api.payroll.dto.BulkPayrollRequest;
import com.nulogic.application.audit.service.AuditLogService;
import com.nulogic.application.notification.service.WebSocketNotificationService;
import com.nulogic.application.payroll.strategy.StatutoryCalculatorFactory;
import com.nulogic.common.exception.ResourceNotFoundException;
import com.nulogic.common.exception.ValidationException;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.security.TenantContext;
import com.nulogic.domain.attendance.AttendanceRecord;
import com.nulogic.domain.attendance.Holiday;
import com.nulogic.domain.audit.AuditLog.AuditAction;
import com.nulogic.domain.employee.Employee;
import com.nulogic.domain.leave.LeaveRequest;
import com.nulogic.domain.payroll.PayrollAdjustment;
import com.nulogic.domain.payroll.PayrollRun;
import com.nulogic.domain.payroll.PayrollRun.PayrollStatus;
import com.nulogic.domain.payroll.Payslip;
import com.nulogic.domain.payroll.SalaryStructure;
import com.nulogic.infrastructure.attendance.repository.AttendanceRecordRepository;
import com.nulogic.infrastructure.attendance.repository.HolidayRepository;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.leave.repository.LeaveRequestRepository;
import com.nulogic.infrastructure.payroll.repository.PayrollAdjustmentRepository;
import com.nulogic.infrastructure.payroll.repository.PayrollRunRepository;
import com.nulogic.infrastructure.payroll.repository.PayslipRepository;
import com.nulogic.infrastructure.payroll.repository.SalaryStructureRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Month;
import java.time.format.TextStyle;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Locale;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class PayrollRunService {

    /** Standard full-time hours per working day, used to derive an hourly rate for overtime. */
    private static final int WORK_HOURS_PER_DAY = 8;

    private final PayrollRunRepository payrollRunRepository;
    private final AuditLogService auditLogService;
    private final EmployeeRepository employeeRepository;
    private final SalaryStructureRepository salaryStructureRepository;
    private final PayslipRepository payslipRepository;
    private final PayrollPeriodLock payrollPeriodLock;
    private final com.nulogic.common.util.TenantTimeService tenantTimeService;
    private final PayrollAdjustmentRepository payrollAdjustmentRepository;
    private final WebSocketNotificationService webSocketNotificationService;
    private final AttendanceRecordRepository attendanceRecordRepository;
    private final HolidayRepository holidayRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final StatutoryCalculatorFactory statutoryCalculatorFactory;

    /**
     * Create a new payroll run for a given period.
     * Uses pessimistic locking to prevent race conditions where two concurrent
     * requests both check existence and both create a run for the same period.
     */
    @Transactional(isolation = Isolation.REPEATABLE_READ)
    public PayrollRun createPayrollRun(PayrollRun payrollRun) {
        UUID tenantId = TenantContext.getCurrentTenant();
        payrollRun.setTenantId(tenantId);

        // PROD-4: launch scope is IN-only — block run creation for tenants whose
        // country has no production-ready statutory engine (US/UK are 501 stubs).
        statutoryCalculatorFactory.assertPayrollSupported(tenantId);

        // T1-04: serialize all concurrent work for this (tenant, period) tuple,
        // regardless of run id. The row-level FOR UPDATE below can't lock a
        // not-yet-existent row, so two parallel creates would otherwise both
        // pass the existence check and race the unique-index insert.
        payrollPeriodLock.lockPeriod(tenantId,
                payrollRun.getPayPeriodYear(),
                payrollRun.getPayPeriodMonth());

        // Pessimistic lock: if a concurrent run exists, lock it to prevent duplicates.
        // This replaces the non-atomic exists-then-create pattern.
        if (payrollRunRepository.findByTenantIdAndPeriodForUpdate(
                tenantId,
                payrollRun.getPayPeriodYear(),
                payrollRun.getPayPeriodMonth()).isPresent()) {
            throw new IllegalArgumentException("Payroll run already exists for this period");
        }

        return payrollRunRepository.save(payrollRun);
    }

    @Transactional(isolation = Isolation.REPEATABLE_READ)
    public PayrollRun updatePayrollRun(UUID id, PayrollRun payrollRunData) {
        UUID tenantId = TenantContext.getCurrentTenant();

        PayrollRun payrollRun = payrollRunRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Payroll run not found"));

        if (payrollRun.getStatus() == PayrollStatus.PROCESSING
                || PayslipService.RELEASED_STATUSES.contains(payrollRun.getStatus())) {
            throw new IllegalStateException("Cannot update " + statusLabel(payrollRun) + " payroll run");
        }

        // DATA-6: changing the period must not collide with another run for the
        // same (tenant, year, month). Mirrors the createPayrollRun guard: advisory
        // lock on the target period + pessimistic existence check.
        boolean periodChanged =
                !payrollRun.getPayPeriodYear().equals(payrollRunData.getPayPeriodYear())
                        || !payrollRun.getPayPeriodMonth().equals(payrollRunData.getPayPeriodMonth());
        if (periodChanged) {
            payrollPeriodLock.lockPeriod(tenantId,
                    payrollRunData.getPayPeriodYear(),
                    payrollRunData.getPayPeriodMonth());
            payrollRunRepository.findByTenantIdAndPeriodForUpdate(
                            tenantId,
                            payrollRunData.getPayPeriodYear(),
                            payrollRunData.getPayPeriodMonth())
                    .filter(existing -> !existing.getId().equals(id))
                    .ifPresent(existing -> {
                        throw new IllegalArgumentException("Payroll run already exists for this period");
                    });
        }

        payrollRun.setPayPeriodMonth(payrollRunData.getPayPeriodMonth());
        payrollRun.setPayPeriodYear(payrollRunData.getPayPeriodYear());
        payrollRun.setPayrollDate(payrollRunData.getPayrollDate());
        payrollRun.setRemarks(payrollRunData.getRemarks());

        return payrollRunRepository.save(payrollRun);
    }

    @Transactional(readOnly = true)
    public PayrollRun getPayrollRunById(UUID id) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return payrollRunRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Payroll run not found"));
    }

    @Transactional(readOnly = true)
    public Page<PayrollRun> getAllPayrollRuns(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return payrollRunRepository.findAllByTenantIdOrderByPeriodDesc(tenantId, pageable);
    }

    @Transactional(readOnly = true)
    public PayrollRun getPayrollRunByPeriod(Integer year, Integer month) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return payrollRunRepository.findByTenantIdAndPayPeriodYearAndPayPeriodMonth(tenantId, year, month)
                .orElseThrow(() -> new ResourceNotFoundException("Payroll run not found for this period"));
    }

    @Transactional(readOnly = true)
    public List<PayrollRun> getPayrollRunsByYear(Integer year) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return payrollRunRepository.findByTenantIdAndYear(tenantId, year);
    }

    @Transactional(readOnly = true)
    public Page<PayrollRun> getPayrollRunsByStatus(PayrollStatus status, Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return payrollRunRepository.findAllByTenantIdAndStatus(tenantId, status, pageable);
    }

    /**
     * Transition DRAFT → PROCESSING (async path).
     *
     * <p>Called synchronously in the HTTP request thread. Marks the run as
     * PROCESSING and saves it before the controller publishes the Kafka event.
     * If the Kafka publish subsequently fails the caller is expected to call
     * {@link #failProcessing} to roll the run back to DRAFT.</p>
     *
     * <p>Pessimistic locking prevents a second concurrent POST from also
     * transitioning the same run.</p>
     */
    @Transactional(isolation = Isolation.REPEATABLE_READ)
    public PayrollRun initiateProcessing(UUID id, UUID triggeredBy) {
        PayrollRun payrollRun = getPayrollRunForUpdate(id);
        validateSalaryStructuresCoverage(payrollRun);
        payrollRun.markProcessing(triggeredBy);
        return payrollRunRepository.save(payrollRun);
    }

    /**
     * Pre-flight check: ensure every active employee has an active salary structure.
     * Throws {@link ValidationException} if any active employees are missing a structure,
     * blocking the payroll run from transitioning to PROCESSING.
     * Logs a warning if the validation query itself cannot be completed.
     */
    private void validateSalaryStructuresCoverage(PayrollRun payrollRun) {
        try {
            UUID tenantId = payrollRun.getTenantId();
            Long activeEmployeeCount = employeeRepository.countByTenantIdAndStatus(
                    tenantId, Employee.EmployeeStatus.ACTIVE);
            long employeesWithStructure = salaryStructureRepository
                    .countDistinctEmployeesWithActiveSalaryStructure(tenantId);

            if (activeEmployeeCount != null && activeEmployeeCount > 0
                    && employeesWithStructure < activeEmployeeCount) {
                long missing = activeEmployeeCount - employeesWithStructure;
                throw new ValidationException(
                        "Payroll pre-flight failed: " + missing + " active employee(s) are missing an active " +
                                "salary structure. Assign salary structures before processing payroll for period " +
                                payrollRun.getPayPeriodYear() + "/" + payrollRun.getPayPeriodMonth() + ".");
            }
        } catch (ValidationException e) {
            throw e;
        } catch (Exception e) {
            // Surface as ERROR — a DB failure here means we cannot verify coverage.
            // Fail-fast so payroll does not silently run with 0 payslips generated.
            log.error("Payroll pre-flight salary structure check FAILED for run {}: {}",
                    payrollRun.getId(), e.getMessage(), e);
            throw new RuntimeException(
                    "Payroll pre-flight check could not complete: " + e.getMessage(), e);
        }
    }

    /**
     * Transition PROCESSING → PROCESSED (called by the Kafka consumer).
     * Uses pessimistic locking to be safe against concurrent state transitions.
     */
    @Transactional(isolation = Isolation.REPEATABLE_READ)
    public PayrollRun completeProcessing(UUID id, UUID processedBy) {
        PayrollRun payrollRun = getPayrollRunForUpdate(id);
        if (payrollRun.getStatus() == PayrollStatus.PROCESSED
                || PayslipService.RELEASED_STATUSES.contains(payrollRun.getStatus())) {
            // Redelivered event for a run that already finished: acknowledge without recomputing.
            log.warn("Payroll run {} is already {}; ignoring duplicate completion request", id, payrollRun.getStatus());
            return payrollRun;
        }
        if (payrollRun.getStatus() != PayrollStatus.PROCESSING) {
            throw new IllegalStateException("Cannot complete processing of " + statusLabel(payrollRun)
                    + " payroll run; only PROCESSING payroll runs can be completed");
        }
        // T1-04: period-wide advisory lock so any other code path that might
        // be computing payslips for (tenant, year, month) — legacy sync call,
        // ad-hoc replay, retried delivery on a different consumer instance —
        // serializes here. Released at transaction commit/rollback.
        payrollPeriodLock.lockPeriod(payrollRun.getTenantId(),
                payrollRun.getPayPeriodYear(),
                payrollRun.getPayPeriodMonth());
        int generatedPayslips = generatePayslipsForRun(payrollRun);
        payrollRun.setTotalEmployees(generatedPayslips);
        payrollRun.process(processedBy, tenantTimeService.now(payrollRun.getTenantId()));
        auditLogService.logAction(
                "PAYROLL_RUN",
                payrollRun.getId(),
                AuditAction.UPDATE,
                Map.of(
                        "status", PayrollStatus.PROCESSED.name(),
                        "period", payrollRun.getPayPeriodYear() + "-" + payrollRun.getPayPeriodMonth()),
                null,
                "Payroll run asynchronously processed for period "
                        + payrollRun.getPayPeriodYear() + "/" + payrollRun.getPayPeriodMonth());
        PayrollRun saved = payrollRunRepository.save(payrollRun);
        notifyPayrollProcessed(saved, processedBy);
        return saved;
    }

    /**
     * Roll back PROCESSING → DRAFT on consumer failure.
     * Allows the payroll admin to resubmit after fixing the root cause.
     */
    @Transactional(isolation = Isolation.REPEATABLE_READ)
    public PayrollRun failProcessing(UUID id) {
        PayrollRun payrollRun = getPayrollRunForUpdate(id);
        payrollRun.markFailed();
        auditLogService.logAction(
                "PAYROLL_RUN",
                payrollRun.getId(),
                AuditAction.UPDATE,
                Map.of(
                        "status", PayrollStatus.DRAFT.name(),
                        "reason", "Async processing failed; rolled back to DRAFT"),
                null,
                "Payroll run processing failed — rolled back to DRAFT");
        return payrollRunRepository.save(payrollRun);
    }

    /**
     * Transition a payroll run from DRAFT → PROCESSED (legacy synchronous path).
     * Kept for backward compatibility with tests and direct service calls.
     * New code should use {@link #initiateProcessing} + Kafka consumer instead.
     */
    @Transactional(isolation = Isolation.REPEATABLE_READ)
    public PayrollRun processPayrollRun(UUID id, UUID processedBy) {
        PayrollRun payrollRun = getPayrollRunForUpdate(id);
        // Legacy sync path previously skipped this pre-flight, silently undercounting
        // payslips when active employees were missing a salary structure. Enforce the
        // same guard initiateProcessing already applies.
        validateSalaryStructuresCoverage(payrollRun);
        // T1-04: same period-wide lock as completeProcessing — the legacy sync
        // path must serialize with the async consumer path on the same period.
        payrollPeriodLock.lockPeriod(payrollRun.getTenantId(),
                payrollRun.getPayPeriodYear(),
                payrollRun.getPayPeriodMonth());
        int generatedPayslips = generatePayslipsForRun(payrollRun);
        payrollRun.setTotalEmployees(generatedPayslips);
        payrollRun.process(processedBy, tenantTimeService.now(payrollRun.getTenantId()));
        PayrollRun saved = payrollRunRepository.save(payrollRun);
        notifyPayrollProcessed(saved, processedBy);
        return saved;
    }

    /**
     * Transition a payroll run from PROCESSED → APPROVED.
     * Uses pessimistic locking to prevent concurrent approval of the same run.
     * R2-011: State guard is enforced in {@link PayrollRun#approve}
     * (throws IllegalStateException if not in PROCESSED).
     */
    @Transactional(isolation = Isolation.REPEATABLE_READ)
    public PayrollRun approvePayrollRun(UUID id, UUID approvedBy) {
        PayrollRun payrollRun = getPayrollRunForUpdate(id);
        payrollRun.approve(approvedBy, tenantTimeService.now(payrollRun.getTenantId()));
        return payrollRunRepository.save(payrollRun);
    }

    /**
     * Transition a payroll run from APPROVED → LOCKED.
     * Uses pessimistic locking to prevent concurrent lock operations.
     * R2-011 FIX: Added missing {@code @Transactional} annotation — without it the
     * {@code save()} call ran outside a transaction and was silently ignored on
     * read-only connections, leaving the payroll run in APPROVED status.
     * State guard is enforced in {@link PayrollRun#lock}
     * (throws IllegalStateException if not in APPROVED).
     */
    @Transactional(isolation = Isolation.REPEATABLE_READ)
    public PayrollRun lockPayrollRun(UUID id) {
        PayrollRun payrollRun = getPayrollRunForUpdate(id);
        payrollRun.lock();
        return payrollRunRepository.save(payrollRun);
    }

    /**
     * Acquire a pessimistic write lock on a payroll run for state transitions.
     * Blocks concurrent reads/writes on the same row until the transaction commits.
     * This prevents race conditions where two concurrent requests both see
     * the run in DRAFT status and both try to process it.
     */
    private PayrollRun getPayrollRunForUpdate(UUID id) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return payrollRunRepository.findByIdAndTenantIdForUpdate(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Payroll run not found"));
    }

    private void notifyPayslipAvailable(UUID employeeId, PayrollRun payrollRun) {
        try {
            String monthName = Month.of(payrollRun.getPayPeriodMonth()).getDisplayName(TextStyle.FULL, Locale.ENGLISH);
            webSocketNotificationService.notifyPayslipAvailable(
                    employeeId, monthName, String.valueOf(payrollRun.getPayPeriodYear()));
        } catch (RuntimeException e) {
            log.warn("Failed to send payslip-available notification for employee {}: {}", employeeId, e.getMessage());
        }
    }

    private void notifyPayrollProcessed(PayrollRun payrollRun, UUID processedBy) {
        try {
            String period = Month.of(payrollRun.getPayPeriodMonth()).getDisplayName(TextStyle.FULL, Locale.ENGLISH)
                    + " " + payrollRun.getPayPeriodYear();
            webSocketNotificationService.notifyPayrollProcessed(
                    processedBy, period, payrollRun.getTotalEmployees());
        } catch (RuntimeException e) {
            log.warn("Failed to send payroll-processed notification for run {}: {}", payrollRun.getId(), e.getMessage());
        }
    }

    private int generatePayslipsForRun(PayrollRun payrollRun) {
        UUID tenantId = payrollRun.getTenantId();
        List<Employee> activeEmployees = employeeRepository.findByTenantId(tenantId).stream()
                .filter(employee -> employee.getStatus() == Employee.EmployeeStatus.ACTIVE)
                .toList();
        if (activeEmployees.isEmpty()) {
            return 0;
        }

        PeriodContext context = resolvePeriodContext(payrollRun);

        int generated = 0;
        for (Employee employee : activeEmployees) {
            if (payslipRepository.existsByTenantIdAndEmployeeIdAndPayPeriodYearAndPayPeriodMonth(
                    tenantId,
                    employee.getId(),
                    payrollRun.getPayPeriodYear(),
                    payrollRun.getPayPeriodMonth())) {
                generated++;
                continue;
            }

            Payslip payslip = buildPayslipForEmployee(payrollRun, employee, context, true);
            if (payslip == null) {
                continue;
            }
            payslipRepository.save(payslip);
            notifyPayslipAvailable(employee.getId(), payrollRun);
            generated++;
        }
        return generated;
    }

    /**
     * Period-scoped inputs for payslip computation: working days, holiday set and
     * the concrete start/end dates derived from a run's (year, month).
     */
    private PeriodContext resolvePeriodContext(PayrollRun payrollRun) {
        UUID tenantId = payrollRun.getTenantId();
        LocalDate periodStart = LocalDate.of(
                payrollRun.getPayPeriodYear(), payrollRun.getPayPeriodMonth(), 1);
        LocalDate periodEnd = periodStart.with(TemporalAdjusters.lastDayOfMonth());

        // BA-1(a): working days = weekdays in the month minus tenant holidays
        // (optional/restricted holidays do not reduce the working-day count).
        // CONSISTENCY FIX: same filter as LeaveRequestService — optional AND restricted
        // holidays are excluded so payroll working days agree with leave LOP math.
        Set<LocalDate> holidays = holidayRepository
                .findAllByTenantIdAndHolidayDateBetween(tenantId, periodStart, periodEnd).stream()
                .filter(holiday -> !Boolean.TRUE.equals(holiday.getIsOptional())
                        && !Boolean.TRUE.equals(holiday.getIsRestricted()))
                .map(Holiday::getHolidayDate)
                .collect(Collectors.toSet());
        int workingDays = countWorkingDays(periodStart, periodEnd, holidays);
        return new PeriodContext(periodStart, periodEnd, holidays, workingDays);
    }

    /**
     * Builds a single employee's payslip (totals calculated) from their active
     * salary structure, reusing the exact leave/present-day/adjustment math of the
     * full-run path.
     *
     * <p>Returns {@code null} when the employee has no active salary structure for
     * the run's pay date (payslip skipped). When {@code persistAdjustments} is
     * {@code true} the pending adjustments consumed by the payslip are marked
     * PROCESSED and persisted; the payslip itself is NOT saved here — callers own
     * the save (so the preview path can compute without writing).</p>
     */
    private Payslip buildPayslipForEmployee(
            PayrollRun payrollRun, Employee employee, PeriodContext context, boolean persistAdjustments) {
        UUID tenantId = payrollRun.getTenantId();

        Optional<SalaryStructure> structureOpt = salaryStructureRepository.findActiveByEmployeeIdAndDate(
                tenantId, employee.getId(), payrollRun.getPayrollDate());
        if (structureOpt.isEmpty()) {
            log.error("Payroll run {}: employee {} (tenant {}) has no active salary structure for {}. " +
                            "Payslip SKIPPED — assign a salary structure and reprocess.",
                    payrollRun.getId(), employee.getId(), tenantId, payrollRun.getPayrollDate());
            return null;
        }
        SalaryStructure structure = structureOpt.get();

        // BA-1(a): leave days from approved leave overlapping the period,
        // present days from attendance records in the period.
        BigDecimal leaveDays = computeApprovedLeaveDays(
                tenantId, employee.getId(), context.periodStart(), context.periodEnd(), context.holidays());
        int presentDays = computePresentDays(
                tenantId, employee.getId(), context.periodStart(), context.periodEnd(),
                context.workingDays(), leaveDays);

        Payslip payslip = Payslip.builder()
                .payrollRunId(payrollRun.getId())
                .employeeId(employee.getId())
                .payPeriodMonth(payrollRun.getPayPeriodMonth())
                .payPeriodYear(payrollRun.getPayPeriodYear())
                .payDate(payrollRun.getPayrollDate())
                .basicSalary(defaultAmount(structure.getBasicSalary()))
                .hra(defaultAmount(structure.getHra()))
                .conveyanceAllowance(defaultAmount(structure.getConveyanceAllowance()))
                .medicalAllowance(defaultAmount(structure.getMedicalAllowance()))
                .specialAllowance(defaultAmount(structure.getSpecialAllowance()))
                .otherAllowances(defaultAmount(structure.getOtherAllowances()))
                .providentFund(defaultAmount(structure.getProvidentFund()))
                .professionalTax(defaultAmount(structure.getProfessionalTax()))
                .incomeTax(defaultAmount(structure.getIncomeTax()))
                .otherDeductions(defaultAmount(structure.getOtherDeductions()))
                .workingDays(context.workingDays())
                .presentDays(presentDays)
                .leaveDays(leaveDays.setScale(0, RoundingMode.HALF_UP).intValue())
                .build();
        payslip.setTenantId(tenantId);

        // BA-1(b): fold unconsumed adjustments (LOP, overtime, expense
        // reimbursements, bonuses) into the payslip and mark them consumed.
        applyPendingAdjustments(payslip, payrollRun, employee.getId(), context.workingDays(),
                context.periodEnd(), persistAdjustments);

        payslip.calculateTotals();
        return payslip;
    }

    private record PeriodContext(
            LocalDate periodStart,
            LocalDate periodEnd,
            Set<LocalDate> holidays,
            int workingDays) {
    }

    /**
     * BA-1(b): reads unconsumed {@link PayrollAdjustment} rows effective in or
     * before the period, converts them to monetary amounts, applies EARNING rows
     * to {@code otherAllowances} and DEDUCTION rows to {@code otherDeductions},
     * then marks each adjustment PROCESSED with a back-reference to this run
     * (the adjustment rows themselves remain the per-line-item audit trail —
     * the payslip schema has no line-item table).
     *
     * <p>Must be called before {@link Payslip#calculateTotals()}.</p>
     */
    private void applyPendingAdjustments(
            Payslip payslip, PayrollRun payrollRun, UUID employeeId, int workingDays, LocalDate periodEnd,
            boolean persist) {
        UUID tenantId = payrollRun.getTenantId();
        List<PayrollAdjustment> pendingAdjustments = payrollAdjustmentRepository
                .findByTenantIdAndEmployeeIdAndStatusAndEffectiveDateLessThanEqual(
                        tenantId, employeeId, PayrollAdjustment.AdjustmentStatus.PENDING, periodEnd);
        if (pendingAdjustments == null || pendingAdjustments.isEmpty()) {
            return;
        }

        BigDecimal monthlyGross = monthlyGross(payslip);
        BigDecimal perDayRate = workingDays > 0
                ? monthlyGross.divide(BigDecimal.valueOf(workingDays), 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;
        BigDecimal hourlyRate = workingDays > 0
                ? monthlyGross.divide(
                BigDecimal.valueOf((long) workingDays * WORK_HOURS_PER_DAY), 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        BigDecimal extraEarnings = BigDecimal.ZERO;
        BigDecimal extraDeductions = BigDecimal.ZERO;
        LocalDateTime now = tenantTimeService.now(tenantId);
        for (PayrollAdjustment adjustment : pendingAdjustments) {
            BigDecimal amount = toMonetaryAmount(adjustment, perDayRate, hourlyRate);
            if (adjustment.getCategory() == PayrollAdjustment.AdjustmentCategory.DEDUCTION) {
                extraDeductions = extraDeductions.add(amount);
            } else {
                extraEarnings = extraEarnings.add(amount);
            }
            if (persist) {
                adjustment.markProcessed(payrollRun.getId(), now);
            }
            log.info("Applied payroll adjustment {} ({} {} → {}) to payslip for employee {} period {}/{}",
                    adjustment.getId(), adjustment.getAdjustmentType(), adjustment.getAmount(), amount,
                    employeeId, payrollRun.getPayPeriodYear(), payrollRun.getPayPeriodMonth());
        }
        if (extraEarnings.signum() != 0) {
            payslip.setOtherAllowances(defaultAmount(payslip.getOtherAllowances()).add(extraEarnings));
        }
        if (extraDeductions.signum() != 0) {
            payslip.setOtherDeductions(defaultAmount(payslip.getOtherDeductions()).add(extraDeductions));
        }
        if (persist) {
            payrollAdjustmentRepository.saveAll(pendingAdjustments);
        }
    }

    /**
     * Converts an adjustment to money. LOP adjustments store leave DAYS and
     * overtime adjustments store effective HOURS (hours × rate multiplier), as
     * written by {@code PayrollIntegrationListener}; all other types already
     * carry monetary amounts.
     */
    private BigDecimal toMonetaryAmount(
            PayrollAdjustment adjustment, BigDecimal perDayRate, BigDecimal hourlyRate) {
        BigDecimal amount = defaultAmount(adjustment.getAmount());
        return switch (adjustment.getAdjustmentType()) {
            case LOP_DEDUCTION -> amount.multiply(perDayRate).setScale(2, RoundingMode.HALF_UP);
            case OVERTIME_EARNING -> amount.multiply(hourlyRate).setScale(2, RoundingMode.HALF_UP);
            default -> amount;
        };
    }

    /** Gross monthly salary from the structure-sourced payslip components. */
    private BigDecimal monthlyGross(Payslip payslip) {
        return defaultAmount(payslip.getBasicSalary())
                .add(defaultAmount(payslip.getHra()))
                .add(defaultAmount(payslip.getConveyanceAllowance()))
                .add(defaultAmount(payslip.getMedicalAllowance()))
                .add(defaultAmount(payslip.getSpecialAllowance()))
                .add(defaultAmount(payslip.getOtherAllowances()));
    }

    /**
     * Present days from attendance records (PRESENT + HALF_DAY, capped at the
     * working-day count). When the employee has no attendance rows at all for the
     * period — tenants that don't track attendance — full presence minus approved
     * leave is assumed so payslips are not zeroed out.
     */
    private int computePresentDays(
            UUID tenantId, UUID employeeId, LocalDate periodStart, LocalDate periodEnd,
            int workingDays, BigDecimal leaveDays) {
        Long recordedDays = attendanceRecordRepository.countByTenantIdAndEmployeeIdAndDateBetween(
                tenantId, employeeId, periodStart, periodEnd);
        if (recordedDays == null || recordedDays == 0) {
            int assumed = workingDays - leaveDays.setScale(0, RoundingMode.HALF_UP).intValue();
            return Math.max(assumed, 0);
        }
        Long presentCount = attendanceRecordRepository.countByTenantIdAndEmployeeIdAndStatusAndDateRange(
                tenantId, employeeId, AttendanceRecord.AttendanceStatus.PRESENT, periodStart, periodEnd);
        Long halfDayCount = attendanceRecordRepository.countByTenantIdAndEmployeeIdAndStatusAndDateRange(
                tenantId, employeeId, AttendanceRecord.AttendanceStatus.HALF_DAY, periodStart, periodEnd);
        long present = (presentCount == null ? 0 : presentCount) + (halfDayCount == null ? 0 : halfDayCount);
        return (int) Math.min(present, workingDays);
    }

    /**
     * Approved leave days overlapping the period, counted on working days only
     * (weekends and tenant holidays excluded). Half-day leaves count as 0.5.
     */
    private BigDecimal computeApprovedLeaveDays(
            UUID tenantId, UUID employeeId, LocalDate periodStart, LocalDate periodEnd,
            Set<LocalDate> holidays) {
        BigDecimal total = BigDecimal.ZERO;
        for (LeaveRequest leave : leaveRequestRepository.findOverlappingLeaves(
                tenantId, employeeId, periodStart, periodEnd)) {
            // findOverlappingLeaves also returns PENDING (overlap-blocking); payslips count APPROVED only
            if (leave.getStatus() != LeaveRequest.LeaveRequestStatus.APPROVED) {
                continue;
            }
            LocalDate from = leave.getStartDate().isBefore(periodStart) ? periodStart : leave.getStartDate();
            LocalDate to = leave.getEndDate().isAfter(periodEnd) ? periodEnd : leave.getEndDate();
            int overlapWorkingDays = countWorkingDays(from, to, holidays);
            if (overlapWorkingDays <= 0) {
                continue;
            }
            if (Boolean.TRUE.equals(leave.getIsHalfDay())) {
                total = total.add(new BigDecimal("0.5"));
            } else {
                total = total.add(BigDecimal.valueOf(overlapWorkingDays));
            }
        }
        return total;
    }

    /** Weekday count in [from, to] excluding the given holiday dates. */
    private int countWorkingDays(LocalDate from, LocalDate to, Set<LocalDate> holidays) {
        int days = 0;
        for (LocalDate date = from; !date.isAfter(to); date = date.plusDays(1)) {
            DayOfWeek dayOfWeek = date.getDayOfWeek();
            if (dayOfWeek != DayOfWeek.SATURDAY
                    && dayOfWeek != DayOfWeek.SUNDAY
                    && !holidays.contains(date)) {
                days++;
            }
        }
        return days;
    }

    private BigDecimal defaultAmount(BigDecimal amount) {
        return amount != null ? amount : BigDecimal.ZERO;
    }

    @Transactional(isolation = Isolation.REPEATABLE_READ)
    public void deletePayrollRun(UUID id) {
        PayrollRun payrollRun = getPayrollRunById(id);

        if (payrollRun.getStatus() != PayrollStatus.DRAFT) {
            throw new IllegalStateException("Cannot delete " + statusLabel(payrollRun)
                    + " payroll run; only DRAFT payroll runs can be deleted");
        }

        payrollRun.softDelete();
        payrollRunRepository.save(payrollRun);

        auditLogService.logAction(
                "PAYROLL_RUN",
                payrollRun.getId(),
                AuditAction.DELETE,
                Map.of("period", payrollRun.getPayPeriodYear() + "-" + payrollRun.getPayPeriodMonth(),
                        "status", payrollRun.getStatus().name()),
                null,
                "Payroll run soft-deleted for period " + payrollRun.getPayPeriodYear() + "/" + payrollRun.getPayPeriodMonth()
        );
    }

    // ==================== BULK PROCESSING ====================

    /**
     * Dry-run preview of bulk payroll for a subset of employees over a single pay
     * period. Reuses the exact payslip computation (salary structure, leave/present
     * days, pending adjustments) of the per-run path, but never persists anything —
     * pending adjustments are NOT consumed.
     */
    @Transactional(readOnly = true)
    public List<BulkPayrollPreviewItem> previewBulkPayroll(BulkPayrollRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        validateBulkPeriod(request);

        int year = request.payrollPeriodStart().getYear();
        int month = request.payrollPeriodStart().getMonthValue();
        LocalDate paymentDate = request.paymentDate() != null
                ? request.paymentDate() : request.payrollPeriodEnd();

        PayrollRun run = lightweightRun(tenantId, year, month, paymentDate);
        PeriodContext context = resolvePeriodContext(run);
        Map<UUID, Employee> employees = activeEmployeesById(tenantId, request.employeeIds());

        List<BulkPayrollPreviewItem> preview = new ArrayList<>();
        for (UUID employeeId : request.employeeIds()) {
            Employee employee = employees.get(employeeId);
            if (employee == null) {
                continue;
            }
            Payslip payslip = buildPayslipForEmployee(run, employee, context, false);
            if (payslip == null) {
                continue;
            }
            BigDecimal baseSalary = defaultAmount(payslip.getBasicSalary());
            BigDecimal grossAmount = defaultAmount(payslip.getGrossSalary());
            preview.add(new BulkPayrollPreviewItem(
                    employeeId,
                    employee.getFullName(),
                    baseSalary,
                    grossAmount.subtract(baseSalary),
                    defaultAmount(payslip.getTotalDeductions()),
                    grossAmount,
                    defaultAmount(payslip.getNetSalary())));
        }
        return preview;
    }

    /**
     * Idempotent bulk process for a subset of employees over a single pay period.
     * Reuses the existing run-processing computation per employee. Employees whose
     * payslip already exists for the period are reported ALREADY_PROCESSED; each
     * employee is isolated so one failure does not abort the batch.
     */
    @Transactional(isolation = Isolation.REPEATABLE_READ)
    public BulkPayrollProcessResponse processBulkPayroll(BulkPayrollRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        validateBulkPeriod(request);

        int year = request.payrollPeriodStart().getYear();
        int month = request.payrollPeriodStart().getMonthValue();
        LocalDate paymentDate = request.paymentDate() != null
                ? request.paymentDate() : request.payrollPeriodEnd();

        PayrollRun run = findOrCreateBulkRun(tenantId, year, month, paymentDate);
        // Serialize with the async/legacy full-run paths on the same period.
        payrollPeriodLock.lockPeriod(tenantId, year, month);

        UUID processedBy = SecurityContext.getCurrentUserId();
        PeriodContext context = resolvePeriodContext(run);
        Map<UUID, Employee> employees = activeEmployeesById(tenantId, request.employeeIds());

        List<BulkPayrollProcessItem> results = new ArrayList<>();
        int processed = 0;
        int alreadyProcessed = 0;
        int failed = 0;

        for (UUID employeeId : request.employeeIds()) {
            Employee employee = employees.get(employeeId);
            if (employee == null) {
                failed++;
                results.add(new BulkPayrollProcessItem(employeeId, BulkPayrollProcessItem.Status.FAILED,
                        "Employee not found or not active for this tenant"));
                continue;
            }
            if (payslipRepository.existsByTenantIdAndEmployeeIdAndPayPeriodYearAndPayPeriodMonth(
                    tenantId, employeeId, year, month)) {
                alreadyProcessed++;
                results.add(new BulkPayrollProcessItem(employeeId,
                        BulkPayrollProcessItem.Status.ALREADY_PROCESSED, null));
                continue;
            }
            try {
                Payslip payslip = buildPayslipForEmployee(run, employee, context, true);
                if (payslip == null) {
                    failed++;
                    results.add(new BulkPayrollProcessItem(employeeId, BulkPayrollProcessItem.Status.FAILED,
                            "No active salary structure for pay date"));
                    continue;
                }
                payslipRepository.save(payslip);
                notifyPayslipAvailable(employeeId, run);
                processed++;
                results.add(new BulkPayrollProcessItem(employeeId, BulkPayrollProcessItem.Status.PROCESSED, null));
            } catch (Exception e) { // per-employee error boundary: isolate failures so the batch continues
                log.error("Bulk payroll: employee {} failed for period {}/{}: {}",
                        employeeId, year, month, e.getMessage(), e);
                failed++;
                results.add(new BulkPayrollProcessItem(employeeId, BulkPayrollProcessItem.Status.FAILED,
                        e.getMessage()));
            }
        }

        // Transition the DRAFT run to PROCESSED only if this batch newly computed payslips.
        if (run.getStatus() == PayrollStatus.DRAFT) {
            run.setTotalEmployees(processed + alreadyProcessed);
            run.process(processedBy, tenantTimeService.now(tenantId));
            payrollRunRepository.save(run);
            notifyPayrollProcessed(run, processedBy);
        }

        return new BulkPayrollProcessResponse(run.getId(), processed, failed, alreadyProcessed, results);
    }

    /**
     * Validates the bulk request before computation: non-empty employee list,
     * non-null period bounds, end on/after start, and a single-month span (the
     * payslip/payroll-run period model is keyed on (year, month)).
     */
    private void validateBulkPeriod(BulkPayrollRequest request) {
        if (request.employeeIds() == null || request.employeeIds().isEmpty()) {
            throw new IllegalArgumentException("Bulk payroll requires at least one employee");
        }
        if (request.payrollPeriodStart() == null || request.payrollPeriodEnd() == null) {
            throw new IllegalArgumentException("Bulk payroll requires both period start and end dates");
        }
        if (request.payrollPeriodEnd().isBefore(request.payrollPeriodStart())) {
            throw new IllegalArgumentException("Payroll period end date must be on or after the start date");
        }
        if (request.payrollPeriodStart().getYear() != request.payrollPeriodEnd().getYear()
                || !request.payrollPeriodStart().getMonth().equals(request.payrollPeriodEnd().getMonth())) {
            throw new IllegalArgumentException(
                    "Bulk payroll runs are limited to a single calendar month; period start and end must be in the same month and year");
        }
    }

    private PayrollRun lightweightRun(UUID tenantId, int year, int month, LocalDate paymentDate) {
        PayrollRun run = new PayrollRun();
        run.setTenantId(tenantId);
        run.setPayPeriodYear(year);
        run.setPayPeriodMonth(month);
        run.setPayrollDate(paymentDate);
        run.setStatus(PayrollStatus.DRAFT);
        return run;
    }

    private static String statusLabel(PayrollRun payrollRun) {
        return payrollRun.getStatus().name().toLowerCase(Locale.ROOT);
    }

    private PayrollRun findOrCreateBulkRun(UUID tenantId, int year, int month, LocalDate paymentDate) {
        Optional<PayrollRun> existing =
                payrollRunRepository.findByTenantIdAndPayPeriodYearAndPayPeriodMonth(tenantId, year, month);
        existing.filter(run -> PayslipService.RELEASED_STATUSES.contains(run.getStatus()))
                .ifPresent(run -> {
                    throw new IllegalStateException("Cannot bulk-process payroll for " + year + "/" + month
                            + ": the payroll run for this period is " + statusLabel(run)
                            + " and its payslips can no longer be changed");
                });
        return existing
                .orElseGet(() -> {
                    PayrollRun run = new PayrollRun();
                    run.setPayPeriodMonth(month);
                    run.setPayPeriodYear(year);
                    run.setPayrollDate(paymentDate);
                    run.setRemarks(null);
                    run.setId(null);
                    run.setTenantId(null);
                    run.setStatus(PayrollStatus.DRAFT);
                    run.setProcessedBy(null);
                    run.setProcessedAt(null);
                    run.setApprovedBy(null);
                    run.setApprovedAt(null);
                    run.setTotalEmployees(null);
                    return createPayrollRun(run);
                });
    }

    private Map<UUID, Employee> activeEmployeesById(UUID tenantId, List<UUID> employeeIds) {
        return employeeRepository.findAllByIdInAndTenantId(employeeIds, tenantId).stream()
                .filter(employee -> employee.getStatus() == Employee.EmployeeStatus.ACTIVE)
                .collect(Collectors.toMap(Employee::getId, employee -> employee));
    }
}
