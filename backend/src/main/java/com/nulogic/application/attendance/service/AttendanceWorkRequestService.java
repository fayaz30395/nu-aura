package com.nulogic.application.attendance.service;

import com.nulogic.common.exception.BusinessException;
import com.nulogic.common.logging.Audited;
import com.nulogic.common.security.Permission;
import com.nulogic.common.security.TenantContext;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.attendance.AttendanceRecord;
import com.nulogic.domain.attendance.AttendanceRecord.AttendanceStatus;
import com.nulogic.domain.attendance.AttendanceWorkRequest;
import com.nulogic.domain.attendance.AttendanceWorkRequest.RequestType;
import com.nulogic.domain.attendance.AttendanceWorkRequest.Status;
import com.nulogic.domain.audit.AuditLog.AuditAction;
import com.nulogic.infrastructure.attendance.repository.AttendanceRecordRepository;
import com.nulogic.infrastructure.attendance.repository.AttendanceWorkRequestRepository;
import com.nulogic.infrastructure.attendance.repository.HolidayRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

/**
 * Work-from-home / on-duty / remote clock-in requests. Employees raise and cancel their own;
 * approvers act within their ATTENDANCE:APPROVE scope (same gate as comp-off).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AttendanceWorkRequestService {

    static final int MAX_RANGE_DAYS = 31;
    static final int MAX_BACKDATE_DAYS = 30;

    private final AttendanceWorkRequestRepository repository;
    private final TenantTimeService tenantTimeService;
    private final AttendanceActorScope actorScope;
    private final AttendanceRecordRepository recordRepository;
    private final HolidayRepository holidayRepository;

    @Transactional
    @Audited(action = AuditAction.CREATE, entityType = "ATTENDANCE_WORK_REQUEST", description = "Created work request")
    public AttendanceWorkRequest create(RequestType type, LocalDate start, LocalDate end, String reason) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        // Always the authenticated employee, never a body-supplied id
        UUID employeeId = actorScope.requireActor();

        if (type == null || start == null || end == null) {
            throw new BusinessException("Request type, start date and end date are required");
        }
        if (reason == null || reason.isBlank()) {
            throw new BusinessException("Reason is required");
        }
        if (end.isBefore(start)) {
            throw new BusinessException("End date cannot be before start date");
        }
        if (type == RequestType.REMOTE_CLOCK_IN && !start.equals(end)) {
            throw new BusinessException("A remote clock-in request covers a single day");
        }
        if (ChronoUnit.DAYS.between(start, end) + 1 > MAX_RANGE_DAYS) {
            throw new BusinessException("A request cannot span more than " + MAX_RANGE_DAYS + " days");
        }
        if (start.isBefore(tenantTimeService.today(tenantId).minusDays(MAX_BACKDATE_DAYS))) {
            throw new BusinessException("Requests cannot start more than " + MAX_BACKDATE_DAYS + " days in the past");
        }
        if (repository.existsOverlapping(tenantId, employeeId, type, start, end)) {
            throw new BusinessException("An active request of this type already covers these dates");
        }

        AttendanceWorkRequest request = AttendanceWorkRequest.builder()
                .tenantId(tenantId)
                .employeeId(employeeId)
                .requestType(type)
                .startDate(start)
                .endDate(end)
                .reason(reason.trim())
                .build();
        return repository.save(request);
    }

    @Transactional
    @Audited(action = AuditAction.APPROVE, entityType = "ATTENDANCE_WORK_REQUEST", description = "Approved work request")
    public AttendanceWorkRequest approve(UUID id, String note) {
        return review(id, note, Status.APPROVED);
    }

    @Transactional
    @Audited(action = AuditAction.REJECT, entityType = "ATTENDANCE_WORK_REQUEST", description = "Rejected work request")
    public AttendanceWorkRequest reject(UUID id, String note) {
        return review(id, note, Status.REJECTED);
    }

    @Transactional
    @Audited(action = AuditAction.UPDATE, entityType = "ATTENDANCE_WORK_REQUEST", description = "Cancelled work request")
    public AttendanceWorkRequest cancel(UUID id) {
        AttendanceWorkRequest request = load(id);
        if (!actorScope.requireActor().equals(request.getEmployeeId())) {
            throw new AccessDeniedException("You can only cancel your own requests");
        }
        requirePending(request);
        request.setStatus(Status.CANCELLED);
        return repository.save(request);
    }

    @Transactional(readOnly = true)
    public Page<AttendanceWorkRequest> getMine(Pageable pageable) {
        return repository.findAllByTenantIdAndEmployeeId(
                TenantContext.requireCurrentTenant(), actorScope.requireActor(), pageable);
    }

    @Transactional(readOnly = true)
    public Page<AttendanceWorkRequest> getPending(Pageable pageable) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        // Scope is part of the query so pages and totals only count what the approver may see
        return repository.findAll((root, query, cb) -> cb.and(
                cb.equal(root.get("tenantId"), tenantId),
                cb.equal(root.get("status"), Status.PENDING),
                actorScope.approvable(Permission.ATTENDANCE_APPROVE, root.get("employeeId"), query, cb)), pageable);
    }

    private AttendanceWorkRequest review(UUID id, String note, Status outcome) {
        AttendanceWorkRequest request = load(id);
        UUID approverId = actorScope.requireApprovalAccess(request.getEmployeeId(), Permission.ATTENDANCE_APPROVE);
        requirePending(request);
        request.setStatus(outcome);
        request.setReviewedBy(approverId);
        request.setReviewedAt(tenantTimeService.now(request.getTenantId()));
        request.setReviewNote(note);
        log.info("Work request {} {} by {}", id, outcome, approverId);
        if (outcome == Status.APPROVED) {
            applyToAttendance(request);
        }
        return repository.save(request);
    }

    /**
     * Annotates the attendance record of each day covered by an approved request (same transaction).
     * Real clock in/out data is never overwritten. shortcut: there is no weekly-off helper, so only
     * holidays are skipped; there is no WFH/on-duty status either, so the day is PRESENT with the
     * remote flag and a note.
     */
    private void applyToAttendance(AttendanceWorkRequest request) {
        UUID tenantId = request.getTenantId();
        String label = request.getRequestType() == RequestType.ON_DUTY ? "On duty"
                : request.getRequestType() == RequestType.WORK_FROM_HOME ? "Work from home" : "Remote clock-in allowed";
        boolean remote = request.getRequestType() != RequestType.ON_DUTY;
        for (LocalDate d = request.getStartDate(); !d.isAfter(request.getEndDate()); d = d.plusDays(1)) {
            if (holidayRepository.existsByTenantIdAndHolidayDate(tenantId, d)) {
                continue;
            }
            AttendanceRecord record = recordRepository
                    .findByEmployeeIdAndAttendanceDateAndTenantId(request.getEmployeeId(), d, tenantId)
                    .orElse(null);
            if (record == null) {
                record = AttendanceRecord.builder().tenantId(tenantId).employeeId(request.getEmployeeId())
                        .attendanceDate(d).status(AttendanceStatus.PRESENT).build();
            } else if (record.getCheckInTime() == null && record.getStatus() == AttendanceStatus.ABSENT) {
                record.setStatus(AttendanceStatus.PRESENT);
            }
            if (remote) {
                record.setIsRemoteCheckin(true);
            }
            String note = label + " (approved request " + request.getId() + ")";
            String existing = record.getNotes();
            if (existing == null || !existing.contains(note)) {
                record.setNotes(existing == null || existing.isBlank() ? note : existing + "; " + note);
            }
            recordRepository.save(record);
        }
    }

    private AttendanceWorkRequest load(UUID id) {
        return repository.findByIdAndTenantId(id, TenantContext.requireCurrentTenant())
                .orElseThrow(() -> new EntityNotFoundException("Work request not found: " + id));
    }

    private static void requirePending(AttendanceWorkRequest request) {
        if (request.getStatus() != Status.PENDING) {
            throw new IllegalStateException("Request is not in PENDING state: " + request.getStatus());
        }
    }
}
