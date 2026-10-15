package com.nulogic.application.shift.service;

import com.nulogic.application.attendance.service.AttendanceActorScope;
import com.nulogic.common.security.Permission;
import com.nulogic.common.security.TenantContext;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.shift.ShiftAssignment;
import com.nulogic.domain.shift.ShiftSwapRequest;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.shift.repository.ShiftSwapRequestRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Manages the full ShiftSwapRequest state machine:
 * <pre>
 *  PENDING → TARGET_ACCEPTED → PENDING_APPROVAL → APPROVED → COMPLETED
 *                └→ TARGET_DECLINED
 *                                                └→ REJECTED
 *  PENDING or TARGET_ACCEPTED → CANCELLED (by requester)
 * </pre>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ShiftSwapService {

    private final ShiftSwapRequestRepository swapRequestRepository;
    private final ShiftManagementService shiftManagementService;
    private final TenantTimeService tenantTimeService;
    private final AttendanceActorScope actorScope;
    private final EmployeeRepository employeeRepository;

    // ========== Submit request ==========

    @Transactional
    public ShiftSwapRequest submitSwapRequest(
            UUID requesterAssignmentId,
            LocalDate requesterShiftDate,
            UUID targetEmployeeId,
            UUID targetAssignmentId,
            LocalDate targetShiftDate,
            ShiftSwapRequest.SwapType swapType,
            String reason) {

        UUID tenantId = TenantContext.requireCurrentTenant();
        UUID requesterEmployeeId = actorScope.requireActor();

        // The requester can only offer a shift that is actually assigned to them
        ShiftAssignment requesterAssignment = shiftManagementService.getAssignmentById(requesterAssignmentId);
        if (!requesterEmployeeId.equals(requesterAssignment.getEmployeeId())) {
            throw new AccessDeniedException("You can only swap your own shift assignment");
        }

        if (targetEmployeeId != null) {
            if (targetEmployeeId.equals(requesterEmployeeId)) {
                throw new IllegalArgumentException("Cannot swap a shift with yourself");
            }
            if (!employeeRepository.existsByIdAndTenantId(targetEmployeeId, tenantId)) {
                throw new EntityNotFoundException("Target employee not found: " + targetEmployeeId);
            }
        }

        // For SWAP type, the target assignment is also required and must belong to the target
        if (swapType == ShiftSwapRequest.SwapType.SWAP) {
            if (targetAssignmentId == null || targetEmployeeId == null) {
                throw new IllegalArgumentException("Target employee and assignment are required for SWAP type");
            }
            ShiftAssignment targetAssignment = shiftManagementService.getAssignmentById(targetAssignmentId);
            if (!targetEmployeeId.equals(targetAssignment.getEmployeeId())) {
                throw new IllegalArgumentException("Target assignment does not belong to the target employee");
            }
        }

        ShiftSwapRequest request = ShiftSwapRequest.builder()
                .tenantId(tenantId)
                .requesterEmployeeId(requesterEmployeeId)
                .requesterAssignmentId(requesterAssignmentId)
                .requesterShiftDate(requesterShiftDate)
                .targetEmployeeId(targetEmployeeId)
                .targetAssignmentId(targetAssignmentId)
                .targetShiftDate(targetShiftDate)
                .swapType(swapType)
                .status(ShiftSwapRequest.SwapStatus.PENDING)
                .reason(reason)
                .requestedAt(tenantTimeService.now(tenantId))
                .build();

        log.info("Shift swap request created: requester={} target={} type={}", requesterEmployeeId, targetEmployeeId, swapType);
        return swapRequestRepository.save(request);
    }

    // ========== Target employee response ==========

    @Transactional
    public ShiftSwapRequest acceptByTarget(UUID requestId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        UUID targetEmployeeId = actorScope.requireActor();
        ShiftSwapRequest request = loadRequest(requestId, tenantId);

        if (!targetEmployeeId.equals(request.getTargetEmployeeId())) {
            throw new AccessDeniedException("Only the target employee can accept this request");
        }
        if (request.getStatus() != ShiftSwapRequest.SwapStatus.PENDING) {
            throw new IllegalStateException("Request is not in PENDING state: " + request.getStatus());
        }

        request.setStatus(ShiftSwapRequest.SwapStatus.TARGET_ACCEPTED);
        request.setTargetEmployeeAction("ACCEPTED");
        request.setTargetEmployeeResponse(tenantTimeService.now(tenantId));

        // If swap type is GIVE_AWAY / PICK_UP, no manager approval needed — go straight to APPROVED
        if (request.getSwapType() != ShiftSwapRequest.SwapType.SWAP) {
            request.setStatus(ShiftSwapRequest.SwapStatus.APPROVED);
            request.setApprovedAt(tenantTimeService.now(tenantId));
            executeSwap(request);
            request.setStatus(ShiftSwapRequest.SwapStatus.COMPLETED);
            request.setCompletedAt(tenantTimeService.now(tenantId));
        } else {
            request.setStatus(ShiftSwapRequest.SwapStatus.PENDING_APPROVAL);
        }

        log.info("Shift swap accepted by target: requestId={}", requestId);
        return swapRequestRepository.save(request);
    }

    @Transactional
    public ShiftSwapRequest declineByTarget(UUID requestId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        UUID targetEmployeeId = actorScope.requireActor();
        ShiftSwapRequest request = loadRequest(requestId, tenantId);

        if (!targetEmployeeId.equals(request.getTargetEmployeeId())) {
            throw new AccessDeniedException("Only the target employee can decline this request");
        }
        if (request.getStatus() != ShiftSwapRequest.SwapStatus.PENDING) {
            throw new IllegalStateException("Request is not in PENDING state: " + request.getStatus());
        }

        request.setStatus(ShiftSwapRequest.SwapStatus.TARGET_DECLINED);
        request.setTargetEmployeeAction("DECLINED");
        request.setTargetEmployeeResponse(tenantTimeService.now(tenantId));

        log.info("Shift swap declined by target: requestId={}", requestId);
        return swapRequestRepository.save(request);
    }

    // ========== Manager approval ==========

    @Transactional
    public ShiftSwapRequest approveByManager(UUID requestId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        ShiftSwapRequest request = loadRequest(requestId, tenantId);
        UUID approverId = requireApprover(request);

        if (request.getStatus() != ShiftSwapRequest.SwapStatus.PENDING_APPROVAL) {
            throw new IllegalStateException("Request is not pending manager approval: " + request.getStatus());
        }

        request.setStatus(ShiftSwapRequest.SwapStatus.APPROVED);
        request.setApproverId(approverId);
        request.setApprovedAt(tenantTimeService.now(tenantId));

        // Execute the actual shift swap
        executeSwap(request);

        request.setStatus(ShiftSwapRequest.SwapStatus.COMPLETED);
        request.setCompletedAt(tenantTimeService.now(tenantId));

        log.info("Shift swap approved by manager {}: requestId={}", approverId, requestId);
        return swapRequestRepository.save(request);
    }

    @Transactional
    public ShiftSwapRequest rejectByManager(UUID requestId, String rejectionReason) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        ShiftSwapRequest request = loadRequest(requestId, tenantId);
        UUID approverId = requireApprover(request);

        if (request.getStatus() != ShiftSwapRequest.SwapStatus.PENDING_APPROVAL) {
            throw new IllegalStateException("Request is not pending manager approval: " + request.getStatus());
        }

        request.setStatus(ShiftSwapRequest.SwapStatus.REJECTED);
        request.setApproverId(approverId);
        request.setRejectedAt(tenantTimeService.now(tenantId));
        request.setRejectionReason(rejectionReason);

        log.info("Shift swap rejected by manager {}: requestId={}", approverId, requestId);
        return swapRequestRepository.save(request);
    }

    // ========== Cancel ==========

    @Transactional
    public ShiftSwapRequest cancelRequest(UUID requestId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        UUID requesterId = actorScope.requireActor();
        ShiftSwapRequest request = loadRequest(requestId, tenantId);

        if (!requesterId.equals(request.getRequesterEmployeeId())) {
            throw new AccessDeniedException("Only the requester can cancel this request");
        }
        if (!request.canBeCancelled()) {
            throw new IllegalStateException("Request cannot be cancelled in state: " + request.getStatus());
        }

        request.setStatus(ShiftSwapRequest.SwapStatus.CANCELLED);
        log.info("Shift swap cancelled: requestId={}", requestId);
        return swapRequestRepository.save(request);
    }

    // ========== Queries ==========

    @Transactional(readOnly = true)
    public Page<ShiftSwapRequest> getMyRequests(UUID employeeId, Pageable pageable) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        actorScope.requireViewAccess(employeeId);
        return swapRequestRepository.findAllByTenantIdAndRequesterEmployeeId(tenantId, employeeId, pageable);
    }

    @Transactional(readOnly = true)
    public List<ShiftSwapRequest> getIncomingRequests(UUID employeeId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        actorScope.requireViewAccess(employeeId);
        return swapRequestRepository.findPendingRequestsForTargetEmployee(tenantId, employeeId);
    }

    @Transactional(readOnly = true)
    public List<ShiftSwapRequest> getRequestsPendingApproval() {
        UUID tenantId = TenantContext.requireCurrentTenant();
        return swapRequestRepository.findAll((root, query, cb) -> cb.and(
                cb.equal(root.get("tenantId"), tenantId),
                cb.equal(root.get("status"), ShiftSwapRequest.SwapStatus.PENDING_APPROVAL),
                actorScope.approvable(Permission.ATTENDANCE_APPROVE, root.get("requesterEmployeeId"), query, cb),
                cb.or(cb.isNull(root.get("targetEmployeeId")),
                        actorScope.approvable(Permission.ATTENDANCE_APPROVE, root.get("targetEmployeeId"), query, cb))));
    }

    @Transactional(readOnly = true)
    public Page<ShiftSwapRequest> getAllRequests(Pageable pageable) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        return swapRequestRepository.findAll((root, query, cb) -> cb.and(
                cb.equal(root.get("tenantId"), tenantId),
                actorScope.viewable(root.get("requesterEmployeeId"), query, cb)), pageable);
    }

    // ========== Internal helpers ==========

    /**
     * Execute the physical swap by reassigning shift assignments.
     * For SWAP: swap the shift IDs on the two assignments.
     * For GIVE_AWAY / PICK_UP: transfer the requester's shift to the target.
     */
    private void executeSwap(ShiftSwapRequest request) {
        // Ownership may have changed since the request was raised; never move someone else's shift
        ShiftAssignment requesterAssignment = shiftManagementService.getAssignmentById(request.getRequesterAssignmentId());
        if (!request.getRequesterEmployeeId().equals(requesterAssignment.getEmployeeId())) {
            throw new IllegalStateException("Requester no longer holds the offered shift assignment");
        }
        if (request.getSwapType() == ShiftSwapRequest.SwapType.SWAP) {
            ShiftAssignment targetAssignment = shiftManagementService.getAssignmentById(request.getTargetAssignmentId());
            if (!request.getTargetEmployeeId().equals(targetAssignment.getEmployeeId())) {
                throw new IllegalStateException("Target no longer holds the requested shift assignment");
            }
        }
        if (request.getSwapType() == ShiftSwapRequest.SwapType.SWAP) {
            shiftManagementService.swapAssignments(
                    request.getRequesterAssignmentId(),
                    request.getTargetAssignmentId());
        } else {
            // GIVE_AWAY or PICK_UP: move requester shift to target employee
            shiftManagementService.transferAssignment(
                    request.getRequesterAssignmentId(),
                    request.getTargetEmployeeId());
        }
    }

    /** Approver must cover requester and target by scope and must not be either party. */
    private UUID requireApprover(ShiftSwapRequest request) {
        UUID approverId = actorScope.requireApprovalAccess(request.getRequesterEmployeeId(), Permission.ATTENDANCE_APPROVE);
        if (request.getTargetEmployeeId() != null) {
            actorScope.requireApprovalAccess(request.getTargetEmployeeId(), Permission.ATTENDANCE_APPROVE);
        }
        if (approverId.equals(request.getRequesterEmployeeId()) || approverId.equals(request.getTargetEmployeeId())) {
            throw new AccessDeniedException("A party to the swap cannot approve it");
        }
        return approverId;
    }

    private ShiftSwapRequest loadRequest(UUID requestId, UUID tenantId) {
        return swapRequestRepository.findByIdAndTenantId(requestId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Shift swap request not found: " + requestId));
    }
}
