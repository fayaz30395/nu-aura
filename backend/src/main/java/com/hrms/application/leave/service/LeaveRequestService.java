package com.hrms.application.leave.service;

import com.hrms.api.workflow.dto.WorkflowExecutionRequest;
import com.hrms.application.audit.service.AuditLogService;
import com.hrms.domain.audit.AuditLog.AuditAction;
import com.hrms.application.event.DomainEventPublisher;
import com.hrms.application.notification.service.WebSocketNotificationService;
import com.hrms.application.workflow.callback.ApprovalCallbackHandler;
import com.hrms.application.workflow.service.WorkflowService;
import com.hrms.common.exception.ResourceNotFoundException;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.event.leave.LeaveApprovedEvent;
import com.hrms.domain.event.leave.LeaveRejectedEvent;
import com.hrms.domain.event.leave.LeaveRequestedEvent;
import com.hrms.domain.leave.LeaveRequest;
import com.hrms.domain.leave.LeaveType;
import com.hrms.domain.workflow.WorkflowDefinition;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.leave.repository.LeaveRequestRepository;
import com.hrms.infrastructure.leave.repository.LeaveTypeRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.format.DateTimeFormatter;
import java.util.UUID;

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
    public LeaveRequestService(LeaveRequestRepository leaveRequestRepository,
                               LeaveBalanceService leaveBalanceService,
                               WebSocketNotificationService webSocketNotificationService,
                               EmployeeRepository employeeRepository,
                               LeaveTypeRepository leaveTypeRepository,
                               DomainEventPublisher domainEventPublisher,
                               @org.springframework.context.annotation.Lazy WorkflowService workflowService,
                               AuditLogService auditLogService) {
        this.leaveRequestRepository = leaveRequestRepository;
        this.leaveBalanceService = leaveBalanceService;
        this.webSocketNotificationService = webSocketNotificationService;
        this.employeeRepository = employeeRepository;
        this.leaveTypeRepository = leaveTypeRepository;
        this.domainEventPublisher = domainEventPublisher;
        this.workflowService = workflowService;
        this.auditLogService = auditLogService;
    }

    @Transactional
    public LeaveRequest createLeaveRequest(LeaveRequest leaveRequest) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        // Check for overlapping leaves
        Iterable<LeaveRequest> overlapping = leaveRequestRepository.findOverlappingLeaves(
                tenantId, leaveRequest.getEmployeeId(),
                leaveRequest.getStartDate(), leaveRequest.getEndDate());

        if (overlapping.iterator().hasNext()) {
            throw new IllegalArgumentException("Leave request overlaps with existing approved leave");
        }

        // HIGH-004 FIX: Use UUID suffix to guarantee uniqueness under concurrent requests.
        // System.currentTimeMillis() alone can produce duplicates when two requests
        // arrive within the same millisecond.
        String requestNumber = "LR-" + System.currentTimeMillis() + "-" + UUID.randomUUID().toString().substring(0, 8);
        leaveRequest.setRequestNumber(requestNumber);
        leaveRequest.setTenantId(tenantId);

        // F-06: Validate balance and reserve days as pending BEFORE persisting the request.
        // addPendingLeave throws IllegalArgumentException if available < totalDays, which
        // causes the transaction to roll back so no invalid request is ever saved.
        leaveBalanceService.addPendingLeave(
                leaveRequest.getEmployeeId(),
                leaveRequest.getLeaveTypeId(),
                leaveRequest.getTotalDays());

        LeaveRequest saved = leaveRequestRepository.save(leaveRequest);

        try {
            auditLogService.logAction("LEAVE_REQUEST", saved.getId(), AuditAction.CREATE, null, null, "Leave request created: " + requestNumber);
        } catch (Exception e) {
            log.warn("Audit log failed for leave request create: {}", e.getMessage());
        }

        // FIX: Defer non-critical operations to AFTER_COMMIT to prevent
        // "Transaction silently rolled back because it has been marked as rollback-only".
        // WorkflowService.startWorkflow() and WebSocketNotificationService methods are
        // @Transactional — if they throw, they mark the shared transaction as rollback-only
        // BEFORE our catch blocks can swallow the exception. Deferring to afterCommit
        // ensures the leave request is persisted regardless of notification/workflow failures.
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                // Send WebSocket notification to approver/manager
                notifyLeaveRequestCreated(saved);

                // Publish domain event for downstream consumers (notifications, analytics, audit)
                publishLeaveRequestedEvent(saved, tenantId);

                // Start approval workflow
                startLeaveApprovalWorkflow(saved, tenantId);
            }
        });

        return saved;
    }

    @Transactional
    public LeaveRequest approveLeaveRequest(UUID id, UUID approverId) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        LeaveRequest request = leaveRequestRepository.findById(id)
                .filter(lr -> lr.getTenantId().equals(tenantId))
                .orElseThrow(() -> new IllegalArgumentException(LEAVE_REQUEST_NOT_FOUND));

        // L1 Approval: Validate that approver is the employee's manager
        validateApproverIsManager(request.getEmployeeId(), approverId, tenantId);

        // BIZ-003: Validate sufficient balance before approving
        java.math.BigDecimal daysToDeduct = Boolean.TRUE.equals(request.getIsHalfDay())
                ? new java.math.BigDecimal("0.5")
                : request.getTotalDays();

        java.math.BigDecimal availableBalance = leaveBalanceService.getAvailableBalance(
                request.getEmployeeId(), request.getLeaveTypeId());
        if (availableBalance != null && availableBalance.compareTo(daysToDeduct) < 0) {
            throw new com.hrms.common.exception.BusinessException(
                    "Insufficient leave balance. Available: " + availableBalance + " days, Requested: " + daysToDeduct + " days");
        }

        request.approve(approverId);
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

        LeaveRequest request = leaveRequestRepository.findById(id)
                .filter(lr -> lr.getTenantId().equals(tenantId))
                .orElseThrow(() -> new IllegalArgumentException(LEAVE_REQUEST_NOT_FOUND));

        // L1 Approval: Validate that approver is the employee's manager
        validateApproverIsManager(request.getEmployeeId(), approverId, tenantId);

        request.reject(approverId, reason);
        LeaveRequest saved = leaveRequestRepository.save(request);

        try {
            auditLogService.logAction("LEAVE_REQUEST", saved.getId(), AuditAction.REJECT, null, null, "Leave request rejected by " + approverId + ": " + reason);
        } catch (Exception e) {
            log.warn("Audit log failed for leave request reject: {}", e.getMessage());
        }

        // F-07: Release pending days reserved at request creation
        try {
            leaveBalanceService.releasePendingLeave(
                    saved.getEmployeeId(),
                    saved.getLeaveTypeId(),
                    saved.getTotalDays());
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

    @Transactional
    public LeaveRequest cancelLeaveRequest(UUID id, String reason) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        LeaveRequest request = leaveRequestRepository.findById(id)
                .filter(lr -> lr.getTenantId().equals(tenantId))
                .orElseThrow(() -> new IllegalArgumentException(LEAVE_REQUEST_NOT_FOUND));

        // BUG-NEW-009: Enforce ownership — only the owner, or someone with LEAVE:MANAGE /
        // LEAVE:APPROVE permission, may cancel a leave request.
        UUID currentEmployeeId = SecurityContext.getCurrentEmployeeId();
        if (currentEmployeeId != null && !request.getEmployeeId().equals(currentEmployeeId)) {
            throw new AccessDeniedException("Cannot cancel another employee's leave request");
        }

        boolean wasApproved = request.getStatus() == LeaveRequest.LeaveRequestStatus.APPROVED;
        boolean wasPending = request.getStatus() == LeaveRequest.LeaveRequestStatus.PENDING;
        request.cancel(reason);
        LeaveRequest saved = leaveRequestRepository.save(request);

        try {
            auditLogService.logAction("LEAVE_REQUEST", saved.getId(), AuditAction.STATUS_CHANGE, null, null, "Leave request cancelled: " + reason);
        } catch (Exception e) {
            log.warn("Audit log failed for leave request cancel: {}", e.getMessage());
        }

        // F-07: Release balance based on prior status
        if (wasApproved) {
            // Was fully approved — credit back from used
            leaveBalanceService.creditLeave(
                    saved.getEmployeeId(),
                    saved.getLeaveTypeId(),
                    saved.getTotalDays());
        } else if (wasPending) {
            // Was still pending — release the reserved pending days
            try {
                leaveBalanceService.releasePendingLeave(
                        saved.getEmployeeId(),
                        saved.getLeaveTypeId(),
                        saved.getTotalDays());
            } catch (Exception e) {
                log.warn("Failed to release pending leave on cancellation for request {}: {}", saved.getId(), e.getMessage());
            }
        }

        return saved;
    }

    @Transactional
    public LeaveRequest updateLeaveRequest(UUID id, LeaveRequest leaveRequestData) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        LeaveRequest request = leaveRequestRepository.findById(id)
                .filter(lr -> lr.getTenantId().equals(tenantId))
                .orElseThrow(() -> new IllegalArgumentException(LEAVE_REQUEST_NOT_FOUND));

        // Only allow updates if status is PENDING
        if (request.getStatus() != LeaveRequest.LeaveRequestStatus.PENDING) {
            throw new IllegalArgumentException("Cannot edit leave request that is already " + request.getStatus());
        }

        // Check for overlapping leaves (excluding this request)
        Iterable<LeaveRequest> overlapping = leaveRequestRepository.findOverlappingLeaves(
                tenantId, request.getEmployeeId(),
                leaveRequestData.getStartDate(), leaveRequestData.getEndDate());

        for (LeaveRequest overlap : overlapping) {
            if (!overlap.getId().equals(id)) {
                throw new IllegalArgumentException("Leave request overlaps with existing approved leave");
            }
        }

        // Update the editable fields
        request.setLeaveTypeId(leaveRequestData.getLeaveTypeId());
        request.setStartDate(leaveRequestData.getStartDate());
        request.setEndDate(leaveRequestData.getEndDate());
        request.setTotalDays(leaveRequestData.getTotalDays());
        request.setIsHalfDay(leaveRequestData.getIsHalfDay());
        request.setHalfDayPeriod(leaveRequestData.getHalfDayPeriod());
        request.setReason(leaveRequestData.getReason());

        return leaveRequestRepository.save(request);
    }

    @Transactional(readOnly = true)
    public LeaveRequest getLeaveRequestById(UUID id) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        return leaveRequestRepository.findById(id)
                .filter(lr -> lr.getTenantId().equals(tenantId))
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

        LeaveRequest request = leaveRequestRepository.findById(entityId)
                .filter(lr -> lr.getTenantId().equals(tenantId))
                .orElse(null);

        if (request == null) {
            log.warn("Leave request {} not found for approval callback", entityId);
            return;
        }

        if (request.getStatus() != LeaveRequest.LeaveRequestStatus.PENDING) {
            log.warn("Leave request {} already in status {}, skipping approval", entityId, request.getStatus());
            return;
        }

        request.approve(approvedBy);
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

        LeaveRequest request = leaveRequestRepository.findById(entityId)
                .filter(lr -> lr.getTenantId().equals(tenantId))
                .orElse(null);

        if (request == null) {
            log.warn("Leave request {} not found for rejection callback", entityId);
            return;
        }

        if (request.getStatus() != LeaveRequest.LeaveRequestStatus.PENDING) {
            log.warn("Leave request {} already in status {}, skipping rejection", entityId, request.getStatus());
            return;
        }

        request.reject(rejectedBy, reason);
        leaveRequestRepository.save(request);

        notifyLeaveRejected(request, reason);
        publishLeaveRejectedEvent(request, tenantId, rejectedBy, reason);
    }

    // ======================== Workflow Start Helper ========================

    private void startLeaveApprovalWorkflow(LeaveRequest leaveRequest, UUID tenantId) {
        try {
            Employee employee = employeeRepository.findByIdAndTenantId(leaveRequest.getEmployeeId(), tenantId).orElse(null);
            LeaveType leaveType = leaveTypeRepository.findByIdAndTenantId(leaveRequest.getLeaveTypeId(), tenantId).orElse(null);

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
        } catch (Exception e) { // Intentional broad catch — leave processing error boundary
            log.warn("Could not start approval workflow for leave request {}: {}",
                    leaveRequest.getId(), e.getMessage());
        }
    }

    // ======================== Domain Event Publishing Helpers ========================

    private void publishLeaveRequestedEvent(LeaveRequest saved, UUID tenantId) {
        try {
            Employee employee = employeeRepository.findByIdAndTenantId(saved.getEmployeeId(), tenantId).orElse(null);
            LeaveType leaveType = leaveTypeRepository.findByIdAndTenantId(saved.getLeaveTypeId(), tenantId).orElse(null);
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

    private void notifyLeaveRequestCreated(LeaveRequest leaveRequest) {
        try {
            UUID tenantId = TenantContext.requireCurrentTenant();
            Employee employee = employeeRepository.findByIdAndTenantId(leaveRequest.getEmployeeId(), tenantId)
                    .orElse(null);
            LeaveType leaveType = leaveTypeRepository.findByIdAndTenantId(leaveRequest.getLeaveTypeId(), tenantId).orElse(null);

            if (employee == null)
                return;

            String employeeName = employee.getFirstName() + " " + employee.getLastName();
            String leaveTypeName = leaveType != null ? leaveType.getLeaveName() : "Leave";
            String dates = formatDateRange(leaveRequest);

            // Notify manager if exists
            if (employee.getManagerId() != null) {
                webSocketNotificationService.notifyLeaveRequestSubmitted(
                        employee.getManagerId(), employeeName, leaveTypeName, dates);
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

            webSocketNotificationService.notifyLeaveApproved(
                    leaveRequest.getEmployeeId(), leaveTypeName, dates);
        } catch (RuntimeException e) {
            log.warn("Failed to send leave approval notification: {}", e.getMessage());
        }
    }

    private void notifyLeaveRejected(LeaveRequest leaveRequest, String reason) {
        try {
            UUID tenantId = TenantContext.requireCurrentTenant();
            LeaveType leaveType = leaveTypeRepository.findByIdAndTenantId(leaveRequest.getLeaveTypeId(), tenantId).orElse(null);
            String leaveTypeName = leaveType != null ? leaveType.getLeaveName() : "Leave";

            webSocketNotificationService.notifyLeaveRejected(
                    leaveRequest.getEmployeeId(), leaveTypeName, reason != null ? reason : "No reason provided");
        } catch (RuntimeException e) {
            log.warn("Failed to send leave rejection notification: {}", e.getMessage());
        }
    }

    private String formatDateRange(LeaveRequest leaveRequest) {
        if (leaveRequest.getStartDate().equals(leaveRequest.getEndDate())) {
            return leaveRequest.getStartDate().format(DATE_FORMATTER);
        }
        return leaveRequest.getStartDate().format(DATE_FORMATTER) + " - " +
                leaveRequest.getEndDate().format(DATE_FORMATTER);
    }
}
