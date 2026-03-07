package com.hrms.application.attendance.service;

import com.hrms.domain.attendance.AttendanceRecord;
import com.hrms.domain.attendance.CompOffRequest;
import com.hrms.domain.leave.LeaveBalance;
import com.hrms.domain.leave.LeaveType;
import com.hrms.infrastructure.attendance.repository.AttendanceRecordRepository;
import com.hrms.infrastructure.attendance.repository.CompOffRequestRepository;
import com.hrms.infrastructure.leave.repository.LeaveBalanceRepository;
import com.hrms.infrastructure.leave.repository.LeaveTypeRepository;
import com.hrms.common.security.TenantContext;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
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
 * Business rules:
 * <ul>
 *   <li>Overtime must be ≥ 60 minutes to qualify for comp-off.</li>
 *   <li>Every 480 overtime minutes = 1 comp-off day (half-day at 240 min).</li>
 *   <li>Minimum accrual unit is 0.5 days.</li>
 *   <li>Comp-off requests auto-expire if not used within 90 days (credit side).</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CompOffService {

    /** Minimum overtime to qualify for a comp-off (minutes). */
    private static final int MIN_OVERTIME_MINUTES = 60;
    /** Full working day in minutes (8 h). */
    private static final int FULL_DAY_MINUTES = 480;
    /** Half day threshold (4 h). */
    private static final int HALF_DAY_MINUTES = 240;

    private static final String COMP_OFF_LEAVE_CODE = "COMP_OFF";

    private final CompOffRequestRepository compOffRequestRepository;
    private final AttendanceRecordRepository attendanceRecordRepository;
    private final LeaveBalanceRepository leaveBalanceRepository;
    private final LeaveTypeRepository leaveTypeRepository;

    // ========== Accrual ==========

    /**
     * Raises a comp-off request for an overtime attendance record.
     * Idempotent: if a request already exists for this date, it returns the existing one.
     */
    @Transactional
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
        if (overtimeMinutes < MIN_OVERTIME_MINUTES) {
            throw new IllegalStateException(
                    "Overtime (" + overtimeMinutes + " min) is below the minimum " + MIN_OVERTIME_MINUTES + " min threshold");
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
        List<CompOffRequest> pending = compOffRequestRepository
                .findPendingInDateRange(tenantId, LocalDate.of(2020, 1, 1), cutoff);

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
            } catch (Exception e) {
                log.warn("Failed to auto-approve comp-off request {}: {}", req.getId(), e.getMessage());
            }
        }
        log.info("Auto-approved {} comp-off requests for tenant {}", count, tenantId);
        return count;
    }

    // ========== Internal helpers ==========

    private LeaveBalance creditLeaveBalance(UUID tenantId, UUID employeeId, BigDecimal days) {
        LeaveType compOffType = leaveTypeRepository
                .findByLeaveCodeAndTenantId(COMP_OFF_LEAVE_CODE, tenantId)
                .orElseThrow(() -> new EntityNotFoundException(
                        "COMP_OFF leave type not found for tenant " + tenantId +
                        ". Please create a leave type with code COMP_OFF."));

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
        if (overtimeMinutes >= FULL_DAY_MINUTES) {
            return BigDecimal.ONE;
        } else if (overtimeMinutes >= HALF_DAY_MINUTES) {
            return new BigDecimal("0.5");
        } else {
            // Proportional: round down to nearest 0.5
            double raw = (double) overtimeMinutes / FULL_DAY_MINUTES;
            BigDecimal bd = BigDecimal.valueOf(raw).setScale(1, RoundingMode.FLOOR);
            // Snap to nearest 0.5
            return bd.remainder(new BigDecimal("0.5")).compareTo(BigDecimal.ZERO) == 0
                    ? bd : bd.subtract(bd.remainder(new BigDecimal("0.5")));
        }
    }
}
