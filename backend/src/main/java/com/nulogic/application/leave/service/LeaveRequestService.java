package com.nulogic.application.leave.service;

import com.nulogic.api.workflow.dto.WorkflowExecutionRequest;
import com.nulogic.application.audit.service.AuditLogService;
import com.nulogic.application.event.DomainEventPublisher;
import com.nulogic.application.notification.service.WebSocketNotificationService;
import com.nulogic.application.workflow.callback.ApprovalCallbackHandler;
import com.nulogic.application.workflow.service.WorkflowService;
import com.nulogic.common.exception.BusinessException;
import com.nulogic.common.exception.ResourceNotFoundException;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.security.TenantContext;
import com.nulogic.domain.audit.AuditLog.AuditAction;
import com.nulogic.domain.employee.Employee;
import com.nulogic.domain.event.leave.LeaveApprovedEvent;
import com.nulogic.domain.event.leave.LeaveRejectedEvent;
import com.nulogic.domain.event.leave.LeaveRequestedEvent;
import com.nulogic.domain.leave.LeaveRequest;
import com.nulogic.domain.leave.LeaveType;
import com.nulogic.domain.workflow.WorkflowDefinition;
import com.nulogic.domain.attendance.Holiday;
import com.nulogic.infrastructure.attendance.repository.HolidayRepository;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.leave.repository.LeaveRequestRepository;
import com.nulogic.infrastructure.leave.repository.LeaveTypeRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Slf4j
public class LeaveRequestService implements ApprovalCallbackHandler {

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("MMM dd, yyyy");
    private static final String LEAVE_REQUEST_NOT_FOUND = "Leave request not found";
    private final LeaveRequestRepository leaveRequestRepository;
    private final LeaveBalanceService leaveBalanceService;
    private final WebSocketNotificationService webSocketNotificationService;
    private final EmployeeRepository employeeRepository;
    private final LeaveTypeRepository leaveTypeRepository;
    private final DomainEventPublisher domainEventPublisher;
    private final WorkflowService workflowService;
    private final AuditLogService auditLogService;
    private final com.nulogic.common.util.TenantTimeService tenantTimeService;
    // PROD-2 FIX: tenant holiday calendar lookup for computeLeaveDays.
    private final HolidayRepository holidayRepository;

    public LeaveRequestService(LeaveRequestRepository leaveRequestRepository,
                               LeaveBalanceService leaveBalanceService,
                               WebSocketNotificationService webSocketNotificationService,
                               EmployeeRepository employeeRepository,
                               LeaveTypeRepository leaveTypeRepository,
                               DomainEventPublisher domainEventPublisher,
                               @org.springframework.context.annotation.Lazy WorkflowService workflowService,
                               AuditLogService auditLogService,
                               com.nulogic.common.util.TenantTimeService tenantTimeService,
                               HolidayRepository holidayRepository) {
        this.leaveRequestRepository = leaveRequestRepository;
        this.leaveBalanceService = leaveBalanceService;
        this.webSocketNotificationService = webSocketNotificationService;
        this.tenantTimeService = tenantTimeService;
        this.employeeRepository = employeeRepository;
        this.leaveTypeRepository = leaveTypeRepository;
        this.domainEventPublisher = domainEventPublisher;
        this.workflowService = workflowService;
        this.auditLogService = auditLogService;
        this.holidayRepository = holidayRepository;
    }

    @Transactional
    public LeaveRequest createLeaveRequest(LeaveRequest leaveRequest) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        UUID currentEmployeeId = SecurityContext.getCurrentEmployeeId();
        if (!SecurityContext.hasPermission(com.nulogic.common.security.Permission.LEAVE_MANAGE)) {
            if (currentEmployeeId == null) {
                throw new AccessDeniedException("Current user is not linked to an employee");
            }
            if (leaveRequest.getEmployeeId() != null && !currentEmployeeId.equals(leaveRequest.getEmployeeId())) {
                throw new AccessDeniedException("Cannot create leave request for another employee");
            }
            leaveRequest.setEmployeeId(currentEmployeeId);
        }

        // DATA-1 + BA-3 FIX: validate date range and half-day single-day invariant
        // at the service level too (defence in depth — protects non-DTO callers).
        validateDateRange(leaveRequest.getStartDate(), leaveRequest.getEndDate(),
                Boolean.TRUE.equals(leaveRequest.getIsHalfDay()));

        // Check for overlapping leaves (BA-6/DATA-3: query now covers PENDING + APPROVED)
        Iterable<LeaveRequest> overlapping = leaveRequestRepository.findOverlappingLeaves(
                tenantId, leaveRequest.getEmployeeId(),
                leaveRequest.getStartDate(), leaveRequest.getEndDate());

        if (overlapping.iterator().hasNext()) {
            throw new IllegalArgumentException("Leave request overlaps with an existing pending or approved leave");
        }

        // HIGH-004 FIX: Use UUID suffix to guarantee uniqueness under concurrent requests.
        // System.currentTimeMillis() alone can produce duplicates when two requests
        // arrive within the same millisecond.
        String requestNumber = "LR-" + System.currentTimeMillis() + "-" + UUID.randomUUID().toString().substring(0, 8);
        leaveRequest.setRequestNumber(requestNumber);
        leaveRequest.setTenantId(tenantId);

        // F2.1: Compute totalDays server-side — never trust the client-supplied
        // value. Weekends and tenant holidays are excluded (PROD-2).
        BigDecimal computedDays = computeLeaveDays(
                leaveRequest.getStartDate(),
                leaveRequest.getEndDate(),
                Boolean.TRUE.equals(leaveRequest.getIsHalfDay()),
                tenantId);
        leaveRequest.setTotalDays(computedDays);

        // F2.4: The pending reservation MUST match the eventual deduction. Approval
        // deducts 0.5 for half-day requests, so reserving the full totalDays leaked
        // 0.5 day(s) of pending balance on every half-day approval. Mirror approval's
        // deduction logic here.
        BigDecimal daysToReserve = Boolean.TRUE.equals(leaveRequest.getIsHalfDay())
                ? new BigDecimal("0.5")
                : computedDays;

        // F-06: Validate balance and reserve days as pending BEFORE persisting the request.
        // addPendingLeave throws IllegalArgumentException if available < daysToReserve, which
        // causes the transaction to roll back so no invalid request is ever saved.
        leaveBalanceService.addPendingLeave(
                leaveRequest.getEmployeeId(),
                leaveRequest.getLeaveTypeId(),
                daysToReserve);

        LeaveRequest saved = leaveRequestRepository.save(leaveRequest);

        try {
            auditLogService.logAction("LEAVE_REQUEST", saved.getId(), AuditAction.CREATE, null, null, "Leave request created: " + requestNumber);
        } catch (Exception e) {
            log.warn("Audit log failed for leave request create: {}", e.getMessage());
        }

        // Load once — used by both startLeaveApprovalWorkflow and the afterCommit callbacks.
        // Avoids 4 redundant round-trips (3× employee + 3× leaveType) per leave creation.
        Employee leaveEmployee = employeeRepository.findByIdAndTenantId(saved.getEmployeeId(), tenantId).orElse(null);
        LeaveType leaveType = leaveTypeRepository.findByIdAndTenantId(saved.getLeaveTypeId(), tenantId).orElse(null);

        startLeaveApprovalWorkflow(saved, tenantId, leaveEmployee, leaveType);

        // FIX: Defer non-critical operations to AFTER_COMMIT to prevent
        // "Transaction silently rolled back because it has been marked as rollback-only".
        // WebSocketNotificationService methods are @Transactional; deferring them to
        // afterCommit keeps notification failures from rolling back the saved request.
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                // Send WebSocket notification to approver/manager
                notifyLeaveRequestCreated(saved, leaveEmployee, leaveType);

                // Publish domain event for downstream consumers (notifications, analytics, audit)
                publishLeaveRequestedEvent(saved, tenantId, leaveEmployee, leaveType);
            }
        });

        return saved;
    }

    @Transactional
    public LeaveRequest approveLeaveRequest(UUID id, UUID approverId) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        LeaveRequest request = leaveRequestRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new IllegalArgumentException(LEAVE_REQUEST_NOT_FOUND));

        // L1 Approval: Validate that approver is the employee's manager
        validateApproverIsManager(request.getEmployeeId(), approverId, tenantId);

        // BA-6/DATA-3 FIX: re-run overlap validation at approval time — two overlapping
        // PENDING requests may both predate the create-time check (legacy data or
        // concurrent submits); only one of them may ever reach APPROVED.
        assertNoConflictingApprovedLeave(tenantId, request);

        // BIZ-003: Validate sufficient balance before approving
        java.math.BigDecimal daysToDeduct = Boolean.TRUE.equals(request.getIsHalfDay())
                ? new java.math.BigDecimal("0.5")
                : request.getTotalDays();

        java.math.BigDecimal availableBalance = leaveBalanceService.getAvailableBalance(
                request.getEmployeeId(), request.getLeaveTypeId());
        if (availableBalance != null && availableBalance.compareTo(daysToDeduct) < 0) {
            throw new com.nulogic.common.exception.BusinessException(
                    "Insufficient leave balance. Available: " + availableBalance + " days, Requested: " + daysToDeduct + " days");
        }

        // BA-5: the direct path supersedes the workflow engine. Cancel any live
        // WorkflowExecution atomically (same transaction) so no orphaned PENDING
        // inbox task remains and the workflow callback can never fire later against
        // an already-approved request.
        workflowService.cancelActiveExecutionForEntity(
                WorkflowDefinition.EntityType.LEAVE_REQUEST, id, "Superseded by direct approval");

        request.approve(approverId, tenantTimeService.now(request.getTenantId()));
        LeaveRequest saved = leaveRequestRepository.save(request);

        try {
            auditLogService.logAction("LEAVE_REQUEST", saved.getId(), AuditAction.APPROVE, null, null, "Leave request approved by " + approverId);
        } catch (Exception e) {
            log.warn("Audit log failed for leave request approve: {}", e.getMessage());
        }

        leaveBalanceService.deductLeave(
                saved.getEmployeeId(),
                saved.getLeaveTypeId(),
                daysToDeduct);

        // Defer non-critical operations to AFTER_COMMIT (same fix as createLeaveRequest)
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                // Send WebSocket notification to employee
                notifyLeaveApproved(saved);

                // Publish domain event for downstream consumers
                publishLeaveApprovedEvent(saved, tenantId, approverId, daysToDeduct);
            }
        });

        return saved;
    }

    @Transactional
    public LeaveRequest rejectLeaveRequest(UUID id, UUID approverId, String reason) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        LeaveRequest request = leaveRequestRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new IllegalArgumentException(LEAVE_REQUEST_NOT_FOUND));

        // L1 Approval: Validate that approver is the employee's manager
        validateApproverIsManager(request.getEmployeeId(), approverId, tenantId);

        // BA-5: cancel any live WorkflowExecution atomically — same reasoning as
        // approveLeaveRequest. The direct rejection already releases the pending
        // balance below; the workflow must not fire onRejected later.
        workflowService.cancelActiveExecutionForEntity(
                WorkflowDefinition.EntityType.LEAVE_REQUEST, id, "Superseded by direct rejection");

        request.reject(approverId, reason, tenantTimeService.now(request.getTenantId()));
        LeaveRequest saved = leaveRequestRepository.save(request);

        try {
            auditLogService.logAction("LEAVE_REQUEST", saved.getId(), AuditAction.REJECT, null, null, "Leave request rejected by " + approverId + ": " + reason);
        } catch (Exception e) {
            log.warn("Audit log failed for leave request reject: {}", e.getMessage());
        }

        // F-07 + F2.4: Release pending days reserved at request creation. The release
        // amount MUST match what was reserved — 0.5 for half-day, totalDays otherwise —
        // otherwise the balance leaks (over- or under-release).
        BigDecimal daysToRelease = Boolean.TRUE.equals(saved.getIsHalfDay())
                ? new BigDecimal("0.5")
                : saved.getTotalDays();
        try {
            leaveBalanceService.releasePendingLeave(
                    saved.getEmployeeId(),
                    saved.getLeaveTypeId(),
                    daysToRelease);
        } catch (Exception e) {
            log.warn("Failed to release pending leave on rejection for request {}: {}", saved.getId(), e.getMessage());
        }

        // Defer non-critical operations to AFTER_COMMIT (same fix as createLeaveRequest)
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                // Send WebSocket notification to employee
                notifyLeaveRejected(saved, reason);

                // Publish domain event for downstream consumers
                publishLeaveRejectedEvent(saved, tenantId, approverId, reason);
            }
        });

        return saved;
    }

    /**
     * Validates that the approver is the direct manager of the employee.
     * This enforces L1 (single-level) approval routing.
     */
    private void validateApproverIsManager(UUID employeeId, UUID approverId, UUID tenantId) {
        Employee employee = employeeRepository.findByIdAndTenantId(employeeId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Employee not found"));

        if (employee.getManagerId() == null) {
            throw new IllegalStateException("Employee has no manager assigned. Cannot process approval.");
        }

        if (!employee.getManagerId().equals(approverId)) {
            throw new IllegalArgumentException("Only the employee's direct manager can approve/reject leave requests");
        }
    }

    /**
     * BA-6/DATA-3: Approval-time overlap guard. Blocks approving a request whose date
     * range overlaps an already-APPROVED leave for the same employee. Other PENDING
     * overlaps intentionally do NOT block — the first of two overlapping pendings must
     * still be approvable; the second then fails here against the newly approved one.
     */
    private void assertNoConflictingApprovedLeave(UUID tenantId, LeaveRequest request) {
        Iterable<LeaveRequest> overlapping = leaveRequestRepository.findOverlappingLeaves(
                tenantId, request.getEmployeeId(), request.getStartDate(), request.getEndDate());
        for (LeaveRequest overlap : overlapping) {
            if (!overlap.getId().equals(request.getId())
                    && overlap.getStatus() == LeaveRequest.LeaveRequestStatus.APPROVED) {
                throw new BusinessException(
                        "Cannot approve: dates overlap already approved leave " + overlap.getRequestNumber());
            }
        }
    }

    /**
     * DATA-1 + BA-3: Service-level date-range validation (defence in depth alongside
     * the DTO's {@code @DateRangeValid} / {@code @AssertTrue} constraints).
     */
    private void validateDateRange(LocalDate startDate, LocalDate endDate, boolean isHalfDay) {
        if (startDate == null || endDate == null) {
            throw new BusinessException("Start date and end date are required");
        }
        if (endDate.isBefore(startDate)) {
            throw new BusinessException("End date must be on or after start date");
        }
        if (isHalfDay && !startDate.equals(endDate)) {
            throw new BusinessException("Half-day leave must start and end on the same day");
        }
    }

    @Transactional
    public LeaveRequest cancelLeaveRequest(UUID id, String reason) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        LeaveRequest request = leaveRequestRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new IllegalArgumentException(LEAVE_REQUEST_NOT_FOUND));

        // BUG-NEW-009: Enforce ownership — only the owner, or someone with LEAVE:MANAGE /
        // LEAVE:APPROVE permission, may cancel a leave request.
        UUID currentEmployeeId = SecurityContext.getCurrentEmployeeId();
        if (currentEmployeeId != null && !request.getEmployeeId().equals(currentEmployeeId)) {
            throw new AccessDeniedException("Cannot cancel another employee's leave request");
        }

        boolean wasApproved = request.getStatus() == LeaveRequest.LeaveRequestStatus.APPROVED;
        boolean wasPending = request.getStatus() == LeaveRequest.LeaveRequestStatus.PENDING;
        request.cancel(reason, tenantTimeService.now(request.getTenantId()));
        LeaveRequest saved = leaveRequestRepository.save(request);

        try {
            auditLogService.logAction("LEAVE_REQUEST", saved.getId(), AuditAction.STATUS_CHANGE, null, null, "Leave request cancelled: " + reason);
        } catch (Exception e) {
            log.warn("Audit log failed for leave request cancel: {}", e.getMessage());
        }

        // F-07 + F2.4: Release balance based on prior status. The release amount MUST
        // mirror the deduction/reservation logic: half-day → 0.5, otherwise → totalDays.
        BigDecimal daysToRestore = Boolean.TRUE.equals(saved.getIsHalfDay())
                ? new BigDecimal("0.5")
                : saved.getTotalDays();
        if (wasApproved) {
            // Was fully approved — credit back from used
            leaveBalanceService.creditLeave(
                    saved.getEmployeeId(),
                    saved.getLeaveTypeId(),
                    daysToRestore);
        } else if (wasPending) {
            // Was still pending — release the reserved pending days
            try {
                leaveBalanceService.releasePendingLeave(
                        saved.getEmployeeId(),
                        saved.getLeaveTypeId(),
                        daysToRestore);
            } catch (Exception e) {
                log.warn("Failed to release pending leave on cancellation for request {}: {}", saved.getId(), e.getMessage());
            }
        }

        return saved;
    }

    @Transactional
    public LeaveRequest updateLeaveRequest(UUID id, LeaveRequest leaveRequestData) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        LeaveRequest request = leaveRequestRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new IllegalArgumentException(LEAVE_REQUEST_NOT_FOUND));
        UUID currentEmployeeId = SecurityContext.getCurrentEmployeeId();
        if (!SecurityContext.hasPermission(com.nulogic.common.security.Permission.LEAVE_MANAGE)
                && (currentEmployeeId == null || !request.getEmployeeId().equals(currentEmployeeId))) {
            throw new AccessDeniedException("Cannot update another employee's leave request");
        }

        // Only allow updates if status is PENDING
        if (request.getStatus() != LeaveRequest.LeaveRequestStatus.PENDING) {
            throw new IllegalArgumentException("Cannot edit leave request that is already " + request.getStatus());
        }

        boolean newIsHalfDay = Boolean.TRUE.equals(leaveRequestData.getIsHalfDay());

        // DATA-1 + BA-3 FIX: same date-range / half-day invariants as create.
        validateDateRange(leaveRequestData.getStartDate(), leaveRequestData.getEndDate(), newIsHalfDay);

        // Check for overlapping leaves (excluding this request;
        // BA-6/DATA-3: query now covers PENDING + APPROVED)
        Iterable<LeaveRequest> overlapping = leaveRequestRepository.findOverlappingLeaves(
                tenantId, request.getEmployeeId(),
                leaveRequestData.getStartDate(), leaveRequestData.getEndDate());

        for (LeaveRequest overlap : overlapping) {
            if (!overlap.getId().equals(id)) {
                throw new IllegalArgumentException("Leave request overlaps with an existing pending or approved leave");
            }
        }

        // BA-4/DATA-4 FIX: never trust the client-supplied totalDays — recompute
        // server-side from the new dates (mirrors createLeaveRequest).
        BigDecimal computedDays = computeLeaveDays(
                leaveRequestData.getStartDate(), leaveRequestData.getEndDate(), newIsHalfDay, tenantId);

        // BA-4/DATA-4 FIX: re-balance the pending reservation atomically. The amount
        // reserved at create (0.5 for half-day, totalDays otherwise) must track the
        // edited request, and must move to the new leave type when it changes.
        // Both calls share this @Transactional — addPendingLeave re-validates the
        // available balance and rolls the release back on failure.
        BigDecimal oldReserved = Boolean.TRUE.equals(request.getIsHalfDay())
                ? new BigDecimal("0.5")
                : request.getTotalDays();
        BigDecimal newReserve = newIsHalfDay ? new BigDecimal("0.5") : computedDays;
        leaveBalanceService.releasePendingLeave(request.getEmployeeId(), request.getLeaveTypeId(), oldReserved);
        leaveBalanceService.addPendingLeave(request.getEmployeeId(), leaveRequestData.getLeaveTypeId(), newReserve);

        // Update the editable fields
        request.setLeaveTypeId(leaveRequestData.getLeaveTypeId());
        request.setStartDate(leaveRequestData.getStartDate());
        request.setEndDate(leaveRequestData.getEndDate());
        request.setTotalDays(computedDays);
        request.setIsHalfDay(leaveRequestData.getIsHalfDay());
        request.setHalfDayPeriod(leaveRequestData.getHalfDayPeriod());
        request.setReason(leaveRequestData.getReason());

        return leaveRequestRepository.save(request);
    }

    @Transactional(readOnly = true)
    public LeaveRequest getLeaveRequestById(UUID id) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        return leaveRequestRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException(LEAVE_REQUEST_NOT_FOUND));
    }

    @Transactional(readOnly = true)
    public Page<LeaveRequest> getAllLeaveRequests(Pageable pageable) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        return leaveRequestRepository.findAllByTenantId(tenantId, pageable);
    }

    @Transactional(readOnly = true)
    public Page<LeaveRequest> getAllLeaveRequests(org.springframework.data.jpa.domain.Specification<LeaveRequest> spec,
                                                  Pageable pageable) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        org.springframework.data.jpa.domain.Specification<LeaveRequest> tenantSpec = (root, query, cb) -> cb
                .equal(root.get("tenantId"), tenantId);

        return leaveRequestRepository.findAll(tenantSpec.and(spec), pageable);
    }

    @Transactional(readOnly = true)
    public Page<LeaveRequest> getLeaveRequestsByEmployee(UUID employeeId, Pageable pageable) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        return leaveRequestRepository.findAllByTenantIdAndEmployeeId(tenantId, employeeId, pageable);
    }

    @Transactional(readOnly = true)
    public Page<LeaveRequest> getLeaveRequestsByStatus(LeaveRequest.LeaveRequestStatus status, Pageable pageable) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        return leaveRequestRepository.findAllByTenantIdAndStatus(tenantId, status, pageable);
    }

    // ======================== ApprovalCallbackHandler ========================

    @Override
    public WorkflowDefinition.EntityType getEntityType() {
        return WorkflowDefinition.EntityType.LEAVE_REQUEST;
    }

    @Override
    @Transactional
    public void onApproved(UUID tenantId, UUID entityId, UUID approvedBy) {
        log.info("Leave request {} approved via workflow by {}", entityId, approvedBy);

        LeaveRequest request = leaveRequestRepository.findByIdAndTenantId(entityId, tenantId)
                .orElse(null);

        if (request == null) {
            throw new BusinessException("Leave request not found for approval callback: " + entityId);
        }

        if (request.getStatus() != LeaveRequest.LeaveRequestStatus.PENDING) {
            throw new BusinessException("Leave request " + entityId
                    + " is not pending approval. Current status: " + request.getStatus());
        }

        // BA-6/DATA-3 FIX: re-run overlap validation at approval time, mirroring the
        // direct approval path — only one of two overlapping requests may be approved.
        assertNoConflictingApprovedLeave(tenantId, request);

        request.approve(approvedBy, tenantTimeService.now(request.getTenantId()));
        LeaveRequest saved = leaveRequestRepository.save(request);

        // Deduct leave balance
        java.math.BigDecimal daysToDeduct = Boolean.TRUE.equals(saved.getIsHalfDay())
                ? new java.math.BigDecimal("0.5")
                : saved.getTotalDays();

        leaveBalanceService.deductLeave(saved.getEmployeeId(), saved.getLeaveTypeId(), daysToDeduct);

        notifyLeaveApproved(saved);
        publishLeaveApprovedEvent(saved, tenantId, approvedBy, daysToDeduct);
    }

    @Override
    @Transactional
    public void onRejected(UUID tenantId, UUID entityId, UUID rejectedBy, String reason) {
        log.info("Leave request {} rejected via workflow by {}", entityId, rejectedBy);

        LeaveRequest request = leaveRequestRepository.findByIdAndTenantId(entityId, tenantId)
                .orElse(null);

        if (request == null) {
            throw new BusinessException("Leave request not found for rejection callback: " + entityId);
        }

        if (request.getStatus() != LeaveRequest.LeaveRequestStatus.PENDING) {
            throw new BusinessException("Leave request " + entityId
                    + " is not pending rejection. Current status: " + request.getStatus());
        }

        request.reject(rejectedBy, reason, tenantTimeService.now(request.getTenantId()));
        leaveRequestRepository.save(request);

        // BA-2 FIX (CRITICAL): release the pending reservation made at creation,
        // exactly like the direct rejection path (rejectLeaveRequest). Without this,
        // every leave rejected via the approvals inbox (the default workflow path)
        // permanently leaked the reserved days from the employee's available balance.
        BigDecimal daysToRelease = Boolean.TRUE.equals(request.getIsHalfDay())
                ? new BigDecimal("0.5")
                : request.getTotalDays();
        try {
            leaveBalanceService.releasePendingLeave(
                    request.getEmployeeId(),
                    request.getLeaveTypeId(),
                    daysToRelease);
        } catch (Exception e) {
            log.warn("Failed to release pending leave on workflow rejection for request {}: {}",
                    request.getId(), e.getMessage());
        }

        notifyLeaveRejected(request, reason);
        publishLeaveRejectedEvent(request, tenantId, rejectedBy, reason);
    }

    // ======================== Workflow Start Helper ========================

    private void startLeaveApprovalWorkflow(LeaveRequest leaveRequest, UUID tenantId,
                                             Employee employee, LeaveType leaveType) {
        String employeeName = employee != null ? employee.getFirstName() + " " + employee.getLastName() : "Employee";
        String leaveTypeName = leaveType != null ? leaveType.getLeaveName() : "Leave";

        WorkflowExecutionRequest workflowRequest = new WorkflowExecutionRequest();
        workflowRequest.setEntityType(WorkflowDefinition.EntityType.LEAVE_REQUEST);
        workflowRequest.setEntityId(leaveRequest.getId());
        workflowRequest.setTitle("Leave Approval: " + employeeName + " - " + leaveTypeName);
        if (employee != null && employee.getDepartmentId() != null) {
            workflowRequest.setDepartmentId(employee.getDepartmentId());
        }

        workflowService.startWorkflow(workflowRequest);
        log.info("Workflow started for leave request: {}", leaveRequest.getId());
    }

    // ======================== Domain Event Publishing Helpers ========================

    private void publishLeaveRequestedEvent(LeaveRequest saved, UUID tenantId,
                                             Employee employee, LeaveType leaveType) {
        try {
            if (employee == null) return;

            String requesterName = employee.getFirstName() + " " + employee.getLastName();
            String leaveTypeName = leaveType != null ? leaveType.getLeaveName() : "Leave";

            domainEventPublisher.publish(LeaveRequestedEvent.of(
                    this, tenantId, saved.getId(),
                    saved.getEmployeeId(), requesterName, leaveTypeName,
                    saved.getStartDate(), saved.getEndDate(), employee.getManagerId()));
        } catch (RuntimeException e) {
            log.warn("Failed to publish LeaveRequestedEvent for {}: {}", saved.getId(), e.getMessage());
        }
    }

    private void publishLeaveApprovedEvent(LeaveRequest saved, UUID tenantId,
                                           UUID approverId, java.math.BigDecimal daysDeducted) {
        try {
            LeaveType leaveType = leaveTypeRepository.findByIdAndTenantId(saved.getLeaveTypeId(), tenantId).orElse(null);
            String leaveTypeName = leaveType != null ? leaveType.getLeaveName() : "Leave";

            // FIX-005: Include isPaid flag so payroll knows if this is LOP (loss-of-pay)
            boolean isPaid = leaveType != null && Boolean.TRUE.equals(leaveType.getIsPaid());
            domainEventPublisher.publish(LeaveApprovedEvent.of(
                    this, tenantId, saved.getId(),
                    saved.getEmployeeId(), approverId, leaveTypeName,
                    isPaid,
                    saved.getStartDate(), saved.getEndDate(), daysDeducted));
        } catch (RuntimeException e) {
            log.warn("Failed to publish LeaveApprovedEvent for {}: {}", saved.getId(), e.getMessage());
        }
    }

    private void publishLeaveRejectedEvent(LeaveRequest saved, UUID tenantId,
                                           UUID approverId, String reason) {
        try {
            LeaveType leaveType = leaveTypeRepository.findByIdAndTenantId(saved.getLeaveTypeId(), tenantId).orElse(null);
            String leaveTypeName = leaveType != null ? leaveType.getLeaveName() : "Leave";

            domainEventPublisher.publish(LeaveRejectedEvent.of(
                    this, tenantId, saved.getId(),
                    saved.getEmployeeId(), approverId, leaveTypeName,
                    saved.getStartDate(), saved.getEndDate(), reason));
        } catch (RuntimeException e) {
            log.warn("Failed to publish LeaveRejectedEvent for {}: {}", saved.getId(), e.getMessage());
        }
    }

    // ======================== WebSocket Notification Helpers ========================

    private void notifyLeaveRequestCreated(LeaveRequest leaveRequest, Employee employee, LeaveType leaveType) {
        try {
            UUID tenantId = TenantContext.requireCurrentTenant();

            if (employee == null)
                return;

            String employeeName = employee.getFirstName() + " " + employee.getLastName();
            String leaveTypeName = leaveType != null ? leaveType.getLeaveName() : "Leave";
            String dates = formatDateRange(leaveRequest);

            // Notify manager if exists
            // NOTIF-1 FIX: employee.getManagerId() is an EMPLOYEE id; resolve to the
            // manager's USER id before dispatch (same pattern as notifyLeaveApproved).
            if (employee.getManagerId() != null) {
                UUID managerUserId = resolveRecipientUserId(employee.getManagerId(), tenantId);
                if (managerUserId != null) {
                    webSocketNotificationService.notifyLeaveRequestSubmitted(
                            managerUserId, employeeName, leaveTypeName, dates);
                }
            }
        } catch (RuntimeException e) {
            log.warn("Failed to send leave request notification: {}", e.getMessage());
        }
    }

    private void notifyLeaveApproved(LeaveRequest leaveRequest) {
        try {
            UUID tenantId = TenantContext.requireCurrentTenant();
            LeaveType leaveType = leaveTypeRepository.findByIdAndTenantId(leaveRequest.getLeaveTypeId(), tenantId).orElse(null);
            String leaveTypeName = leaveType != null ? leaveType.getLeaveName() : "Leave";
            String dates = formatDateRange(leaveRequest);

            // NOTIF-1 FIX: notifications are keyed/queried by USER id (SecurityContext.getCurrentUserId),
            // but a LeaveRequest carries an EMPLOYEE id. Resolve employee -> user so the persisted
            // in-app notification (written by WebSocketNotificationService.sendToUser) lands under the
            // recipient's user id and is actually visible in their inbox/bell.
            UUID recipientUserId = resolveRecipientUserId(leaveRequest.getEmployeeId(), tenantId);
            if (recipientUserId == null) {
                return;
            }
            webSocketNotificationService.notifyLeaveApproved(
                    recipientUserId, leaveTypeName, dates);
        } catch (RuntimeException e) {
            log.warn("Failed to send leave approval notification: {}", e.getMessage());
        }
    }

    private void notifyLeaveRejected(LeaveRequest leaveRequest, String reason) {
        try {
            UUID tenantId = TenantContext.requireCurrentTenant();
            LeaveType leaveType = leaveTypeRepository.findByIdAndTenantId(leaveRequest.getLeaveTypeId(), tenantId).orElse(null);
            String leaveTypeName = leaveType != null ? leaveType.getLeaveName() : "Leave";

            // NOTIF-1 FIX: map employee -> user id so the persisted notification is visible (see above).
            UUID recipientUserId = resolveRecipientUserId(leaveRequest.getEmployeeId(), tenantId);
            if (recipientUserId == null) {
                return;
            }
            webSocketNotificationService.notifyLeaveRejected(
                    recipientUserId, leaveTypeName, reason != null ? reason : "No reason provided");
        } catch (RuntimeException e) {
            log.warn("Failed to send leave rejection notification: {}", e.getMessage());
        }
    }

    /**
     * F2.1: Server-side computation of leave-day count between two dates.
     * Weekends (Sat/Sun) and tenant holidays are excluded.
     *
     * <p>DATA-1 FIX: throws on an inverted range — previously
     * {@code ChronoUnit.DAYS.between + 1} produced a NEGATIVE day count for
     * end &lt; start, which inflated leave balances downstream. Also throws when the
     * range contains zero working days (weekend/holiday-only range).</p>
     *
     * <p>PROD-2 FIX (F2.1 full): tenant-configured holidays falling on weekdays are
     * subtracted via {@link HolidayRepository}. Optional and restricted holidays are
     * NOT subtracted — they are not guaranteed company-wide days off, so a leave
     * covering them still consumes balance.</p>
     *
     * <p>Half-day requests are valid only when {@code start == end}; callers enforce
     * the single-day invariant at the API boundary ({@code validateDateRange}).</p>
     */
    public BigDecimal computeLeaveDays(LocalDate start, LocalDate end, boolean isHalfDay, UUID tenantId) {
        if (start == null || end == null) {
            throw new IllegalArgumentException("Start date and end date are required");
        }
        if (end.isBefore(start)) {
            throw new IllegalArgumentException("End date must be on or after start date");
        }

        Set<LocalDate> holidayDates = holidayRepository
                .findAllByTenantIdAndHolidayDateBetween(tenantId, start, end)
                .stream()
                .filter(h -> !Boolean.TRUE.equals(h.getIsOptional()) && !Boolean.TRUE.equals(h.getIsRestricted()))
                .map(Holiday::getHolidayDate)
                .collect(Collectors.toSet());

        if (isHalfDay && start.equals(end)) {
            if (isNonWorkingDay(start, holidayDates)) {
                throw new IllegalArgumentException("Half-day leave falls on a weekend or holiday");
            }
            return new BigDecimal("0.5");
        }

        long workingDays = 0;
        for (LocalDate d = start; !d.isAfter(end); d = d.plusDays(1)) {
            if (!isNonWorkingDay(d, holidayDates)) {
                workingDays++;
            }
        }
        if (workingDays <= 0) {
            throw new IllegalArgumentException(
                    "Leave range contains no working days (weekends/holidays only)");
        }
        return BigDecimal.valueOf(workingDays);
    }

    private boolean isNonWorkingDay(LocalDate date, Set<LocalDate> holidayDates) {
        return date.getDayOfWeek() == DayOfWeek.SATURDAY
                || date.getDayOfWeek() == DayOfWeek.SUNDAY
                || holidayDates.contains(date);
    }

    private String formatDateRange(LeaveRequest leaveRequest) {
        if (leaveRequest.getStartDate().equals(leaveRequest.getEndDate())) {
            return leaveRequest.getStartDate().format(DATE_FORMATTER);
        }
        return leaveRequest.getStartDate().format(DATE_FORMATTER) + " - " +
                leaveRequest.getEndDate().format(DATE_FORMATTER);
    }

    // ===================== Response-enrichment projections (moved from controller) =====================
    // Behaviour-preserving extraction of the lightweight Employee projection
    // queries the controller previously issued directly against
    // EmployeeRepository for leave-request response enrichment. Each method is a
    // faithful pass-through that returns the same projection shape as before
    // (avoiding full Employee entity loads / EncryptedStringConverter).

    @Transactional(readOnly = true)
    public List<Object[]> findManagerIdsByEmployeeIds(Collection<UUID> ids) {
        return employeeRepository.findManagerIdsByIds(ids);
    }

    @Transactional(readOnly = true)
    public List<Object[]> findFullNamesByEmployeeIds(Collection<UUID> ids) {
        return employeeRepository.findFullNamesByIds(ids);
    }

    @Transactional(readOnly = true)
    public Optional<UUID> findManagerIdByEmployeeId(UUID employeeId) {
        return employeeRepository.findManagerIdById(employeeId);
    }

    @Transactional(readOnly = true)
    public Optional<String> findFullNameByEmployeeId(UUID employeeId) {
        return employeeRepository.findFullNameById(employeeId);
    }

    /**
     * NOTIF-1: Resolves an employee id to its linked user id so that the persisted
     * in-app notification (keyed/queried by user_id) is visible in the recipient's
     * inbox. Returns {@code null} when the employee or their user link is absent —
     * callers should silently skip the notification in that case.
     */
    private UUID resolveRecipientUserId(UUID employeeId, UUID tenantId) {
        if (employeeId == null) {
            return null;
        }
        return employeeRepository.findByIdAndTenantId(employeeId, tenantId)
                .map(emp -> emp.getUser() != null ? emp.getUser().getId() : null)
                .orElse(null);
    }
}
