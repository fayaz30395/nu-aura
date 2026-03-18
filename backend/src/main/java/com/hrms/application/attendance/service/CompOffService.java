package com.hrms.application.attendance.service;

import com.hrms.common.config.AttendanceConfigProperties;
import com.hrms.common.logging.Audited;
import com.hrms.domain.attendance.AttendanceRecord;
import com.hrms.domain.attendance.CompOffRequest;
import com.hrms.domain.audit.AuditLog.AuditAction;
import com.hrms.domain.leave.LeaveBalance;
import com.hrms.domain.leave.LeaveType;
import com.hrms.infrastructure.attendance.repository.AttendanceRecordRepository;
import com.hrms.infrastructure.attendance.repository.CompOffRequestRepository;
import com.hrms.infrastructure.leave.repository.LeaveBalanceRepository;
import com.hrms.infrastructure.leave.repository.LeaveTypeRepository;
import com.hrms.common.security.TenantContext;
import com.hrms.common.exception.BusinessException;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataAccessException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Year;
import java.util.List;
import java.util.UUID;

/**
 * Manages compensatory-off (comp-off) accrual and credit.
 * <p>
 * Business rules (configurable via app.attendance.comp-off.*):
 * <ul>
 *   <li>Overtime must be ≥ configured min-overtime-minutes to qualify for comp-off.</li>
 *   <li>Every full-day-minutes of overtime = 1 comp-off day (half-day at half-day-minutes).</li>
 *   <li>Minimum accrual unit is 0.5 days.</li>
 *   <li>Comp-off requests auto-expire if not used within configured expiry-days (credit side).</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CompOffService {

    private final CompOffRequestRepository compOffRequestRepository;
    private final AttendanceRecordRepository attendanceRecordRepository;
    private final LeaveBalanceRepository leaveBalanceRepository;
    private final LeaveTypeRepository leaveTypeRepository;
    private final AttendanceConfigProperties config;

    // ========== Accrual ==========

    /**
     * Raises a comp-off request for an overtime attendance record.
     * Idempotent: if a request already exists for this date, it returns the existing one.
     */
    @Transactional
    @Audited(action = AuditAction.CREATE, entityType = "COMP_OFF_REQUEST", description = "Created comp-off request")
    public CompOffRequest requestCompOff(UUID employeeId, LocalDate attendanceDate, String reason) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        AttendanceRecord record = attendanceRecordRepository
                .findByEmployeeIdAndAttendanceDateAndTenantId(employeeId, attendanceDate, tenantId)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Attendance record not found for date " + attendanceDate));

        if (!Boolean.TRUE.equals(record.getIsOvertime())) {
            throw new IllegalStateException("No overtime recorded for " + attendanceDate);
        }
        int overtimeMinutes = record.getOvertimeMinutes() != null ? record.getOvertimeMinutes() : 0;
        int minOvertimeMinutes = config.getCompOff().getMinOvertimeMinutes();
        if (overtimeMinutes < minOvertimeMinutes) {
            throw new IllegalStateException(
                    "Overtime (" + overtimeMinutes + " min) is below the minimum " + minOvertimeMinutes + " min threshold");
        }

        // Idempotency check
        if (compOffRequestRepository.existsByTenantIdAndEmployeeIdAndAttendanceDate(tenantId, employeeId, attendanceDate)) {
            return compOffRequestRepository
                    .findByTenantIdAndEmployeeIdAndAttendanceDate(tenantId, employeeId, attendanceDate)
                    .orElseThrow();
        }

        BigDecimal compOffDays = calculateCompOffDays(overtimeMinutes);

        CompOffRequest request = CompOffRequest.builder()
                .tenantId(tenantId)
                .employeeId(employeeId)
                .attendanceDate(attendanceDate)
                .overtimeMinutes(overtimeMinutes)
                .compOffDays(compOffDays)
                .status(CompOffRequest.CompOffStatus.PENDING)
                .reason(reason)
                .requestedBy(employeeId)
                .build();

        log.info("Raising comp-off request: employee={} date={} days={}", employeeId, attendanceDate, compOffDays);
        return compOffRequestRepository.save(request);
    }

    /**
     * Approve a comp-off request and credit leave balance.
     */
    @Transactional
    @Audited(action = AuditAction.APPROVE, entityType = "COMP_OFF_REQUEST", description = "Approved comp-off request and credited leave")
    public CompOffRequest approveCompOff(UUID requestId, UUID approverId, String note) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        CompOffRequest request = compOffRequestRepository.findById(requestId)
                .filter(r -> r.getTenantId().equals(tenantId))
                .orElseThrow(() -> new EntityNotFoundException("CompOff request not found: " + requestId));

        if (request.getStatus() != CompOffRequest.CompOffStatus.PENDING) {
            throw new IllegalStateException("Request is not in PENDING state: " + request.getStatus());
        }

        // Credit the leave balance
        LeaveBalance balance = creditLeaveBalance(tenantId, request.getEmployeeId(), request.getCompOffDays());

        request.setStatus(CompOffRequest.CompOffStatus.CREDITED);
        request.setReviewedBy(approverId);
        request.setReviewedAt(LocalDateTime.now());
        request.setReviewNote(note);
        request.setLeaveBalanceId(balance.getId());

        log.info("Comp-off approved: request={} employee={} days={}",
                requestId, request.getEmployeeId(), request.getCompOffDays());
        return compOffRequestRepository.save(request);
    }

    /**
     * Reject a comp-off request.
     */
    @Transactional
    @Audited(action = AuditAction.REJECT, entityType = "COMP_OFF_REQUEST", description = "Rejected comp-off request")
    public CompOffRequest rejectCompOff(UUID requestId, UUID approverId, String note) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        CompOffRequest request = compOffRequestRepository.findById(requestId)
                .filter(r -> r.getTenantId().equals(tenantId))
                .orElseThrow(() -> new EntityNotFoundException("CompOff request not found: " + requestId));

        if (request.getStatus() != CompOffRequest.CompOffStatus.PENDING) {
            throw new IllegalStateException("Request is not in PENDING state: " + request.getStatus());
        }

        request.setStatus(CompOffRequest.CompOffStatus.REJECTED);
        request.setReviewedBy(approverId);
        request.setReviewedAt(LocalDateTime.now());
        request.setReviewNote(note);

        log.info("Comp-off rejected: request={}", requestId);
        return compOffRequestRepository.save(request);
    }

    // ========== Queries ==========

    @Transactional(readOnly = true)
    public Page<CompOffRequest> getEmployeeCompOffHistory(UUID employeeId, Pageable pageable) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        return compOffRequestRepository.findAllByTenantIdAndEmployeeId(tenantId, employeeId, pageable);
    }

    @Transactional(readOnly = true)
    public Page<CompOffRequest> getPendingRequests(Pageable pageable) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        return compOffRequestRepository.findAllByTenantIdAndStatus(
                tenantId, CompOffRequest.CompOffStatus.PENDING, pageable);
    }

    @Transactional(readOnly = true)
    public List<CompOffRequest> getMyPendingRequests(UUID employeeId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        return compOffRequestRepository.findPendingByEmployee(tenantId, employeeId);
    }

    // ========== Batch accrual (called by scheduler) ==========

    /**
     * Auto-approve comp-off requests raised for dates older than {@code autoApproveAfterDays}.
     * Called nightly by {@link com.hrms.application.attendance.scheduler.AutoRegularizationScheduler}.
     */
    @Transactional
    public int autoApproveEligibleRequests(UUID tenantId, int autoApproveAfterDays) {
        LocalDate cutoff = LocalDate.now().minusDays(autoApproveAfterDays);
        // R2-009 FIX: Replace hardcoded epoch date (2020-01-01) with a rolling 6-month
        // lookback window.  The epoch date caused the query to scan ALL pending comp-off
        // requests since the beginning of time on every nightly run, growing linearly
        // with the size of the dataset.  A 6-month window is large enough to catch any
        // legitimately pending request while keeping the query bounded.
        LocalDate lookbackStart = LocalDate.now().minusMonths(6);
        List<CompOffRequest> pending = compOffRequestRepository
                .findPendingInDateRange(tenantId, lookbackStart, cutoff);

        int count = 0;
        for (CompOffRequest req : pending) {
            try {
                LeaveBalance balance = creditLeaveBalance(tenantId, req.getEmployeeId(), req.getCompOffDays());
                req.setStatus(CompOffRequest.CompOffStatus.CREDITED);
                req.setReviewedAt(LocalDateTime.now());
                req.setLeaveBalanceId(balance.getId());
                req.setReviewNote("Auto-approved by system after " + autoApproveAfterDays + " days");
                compOffRequestRepository.save(req);
                count++;
            } catch (DataAccessException | BusinessException e) {
                log.warn("Failed to auto-approve comp-off request {}: {}", req.getId(), e.getMessage());
            }
        }
        log.info("Auto-approved {} comp-off requests for tenant {}", count, tenantId);
        return count;
    }

    // ========== Internal helpers ==========

    private LeaveBalance creditLeaveBalance(UUID tenantId, UUID employeeId, BigDecimal days) {
        String compOffLeaveCode = config.getCompOff().getLeaveCode();
        LeaveType compOffType = leaveTypeRepository
                .findByLeaveCodeAndTenantId(compOffLeaveCode, tenantId)
                .orElseThrow(() -> new EntityNotFoundException(
                        compOffLeaveCode + " leave type not found for tenant " + tenantId +
                        ". Please create a leave type with code " + compOffLeaveCode + "."));

        int year = Year.now().getValue();
        LeaveBalance balance = leaveBalanceRepository
                .findByEmployeeIdAndLeaveTypeIdAndYearAndTenantId(
                        employeeId, compOffType.getId(), year, tenantId)
                .orElseGet(() -> LeaveBalance.builder()
                        .tenantId(tenantId)
                        .employeeId(employeeId)
                        .leaveTypeId(compOffType.getId())
                        .year(year)
                        .openingBalance(BigDecimal.ZERO)
                        .build());

        balance.accrueLeave(days);
        return leaveBalanceRepository.save(balance);
    }

    private BigDecimal calculateCompOffDays(int overtimeMinutes) {
        int fullDayMinutes = config.getCompOff().getFullDayMinutes();
        int halfDayMinutes = config.getCompOff().getHalfDayMinutes();

        if (overtimeMinutes >= fullDayMinutes) {
            return BigDecimal.ONE;
        } else if (overtimeMinutes >= halfDayMinutes) {
            return new BigDecimal("0.5");
        } else {
            // Proportional: round down to nearest 0.5
            double raw = (double) overtimeMinutes / fullDayMinutes;
            BigDecimal bd = BigDecimal.valueOf(raw).setScale(1, RoundingMode.FLOOR);
            // Snap to nearest 0.5
            return bd.remainder(new BigDecimal("0.5")).compareTo(BigDecimal.ZERO) == 0
                    ? bd : bd.subtract(bd.remainder(new BigDecimal("0.5")));
        }
    }
}
