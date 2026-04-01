package com.hrms.application.shift.service;

import com.hrms.domain.shift.ShiftAssignment;
import com.hrms.domain.shift.ShiftSwapRequest;
import com.hrms.infrastructure.shift.repository.ShiftSwapRequestRepository;
import com.hrms.common.security.TenantContext;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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

    // ========== Submit request ==========

    @Transactional
    public ShiftSwapRequest submitSwapRequest(
            UUID requesterEmployeeId,
            UUID requesterAssignmentId,
            LocalDate requesterShiftDate,
            UUID targetEmployeeId,
            UUID targetAssignmentId,
            LocalDate targetShiftDate,
            ShiftSwapRequest.SwapType swapType,
            String reason) {

        UUID tenantId = TenantContext.requireCurrentTenant();

        // Validate requester's assignment exists
        shiftManagementService.getAssignmentById(requesterAssignmentId);

        // For SWAP type, target assignment is also required
        if (swapType == ShiftSwapRequest.SwapType.SWAP && targetAssignmentId == null) {
            throw new IllegalArgumentException("Target assignment is required for SWAP type");
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
                .requestedAt(LocalDateTime.now())
                .build();

        log.info("Shift swap request created: requester={} target={} type={}", requesterEmployeeId, targetEmployeeId, swapType);
        return swapRequestRepository.save(request);
    }

    // ========== Target employee response ==========

    @Transactional
    public ShiftSwapRequest acceptByTarget(UUID requestId, UUID targetEmployeeId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        ShiftSwapRequest request = loadRequest(requestId, tenantId);

        if (request.getStatus() != ShiftSwapRequest.SwapStatus.PENDING) {
            throw new IllegalStateException("Request is not in PENDING state: " + request.getStatus());
        }
        if (!targetEmployeeId.equals(request.getTargetEmployeeId())) {
            throw new SecurityException("Only the target employee can accept this request");
        }

        request.setStatus(ShiftSwapRequest.SwapStatus.TARGET_ACCEPTED);
        request.setTargetEmployeeAction("ACCEPTED");
        request.setTargetEmployeeResponse(LocalDateTime.now());

        // If swap type is GIVE_AWAY / PICK_UP, no manager approval needed — go straight to APPROVED
        if (request.getSwapType() != ShiftSwapRequest.SwapType.SWAP) {
            request.setStatus(ShiftSwapRequest.SwapStatus.APPROVED);
            request.setApprovedAt(LocalDateTime.now());
            executeSwap(request);
            request.setStatus(ShiftSwapRequest.SwapStatus.COMPLETED);
            request.setCompletedAt(LocalDateTime.now());
        } else {
            request.setStatus(ShiftSwapRequest.SwapStatus.PENDING_APPROVAL);
        }

        log.info("Shift swap accepted by target: requestId={}", requestId);
        return swapRequestRepository.save(request);
    }

    @Transactional
    public ShiftSwapRequest declineByTarget(UUID requestId, UUID targetEmployeeId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        ShiftSwapRequest request = loadRequest(requestId, tenantId);

        if (request.getStatus() != ShiftSwapRequest.SwapStatus.PENDING) {
            throw new IllegalStateException("Request is not in PENDING state: " + request.getStatus());
        }
        if (!targetEmployeeId.equals(request.getTargetEmployeeId())) {
            throw new SecurityException("Only the target employee can decline this request");
        }

        request.setStatus(ShiftSwapRequest.SwapStatus.TARGET_DECLINED);
        request.setTargetEmployeeAction("DECLINED");
        request.setTargetEmployeeResponse(LocalDateTime.now());

        log.info("Shift swap declined by target: requestId={}", requestId);
        return swapRequestRepository.save(request);
    }

    // ========== Manager approval ==========

    @Transactional
    public ShiftSwapRequest approveByManager(UUID requestId, UUID approverId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        ShiftSwapRequest request = loadRequest(requestId, tenantId);

        if (request.getStatus() != ShiftSwapRequest.SwapStatus.PENDING_APPROVAL) {
            throw new IllegalStateException("Request is not pending manager approval: " + request.getStatus());
        }

        request.setStatus(ShiftSwapRequest.SwapStatus.APPROVED);
        request.setApproverId(approverId);
        request.setApprovedAt(LocalDateTime.now());

        // Execute the actual shift swap
        executeSwap(request);

        request.setStatus(ShiftSwapRequest.SwapStatus.COMPLETED);
        request.setCompletedAt(LocalDateTime.now());

        log.info("Shift swap approved by manager {}: requestId={}", approverId, requestId);
        return swapRequestRepository.save(request);
    }

    @Transactional
    public ShiftSwapRequest rejectByManager(UUID requestId, UUID approverId, String rejectionReason) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        ShiftSwapRequest request = loadRequest(requestId, tenantId);

        if (request.getStatus() != ShiftSwapRequest.SwapStatus.PENDING_APPROVAL) {
            throw new IllegalStateException("Request is not pending manager approval: " + request.getStatus());
        }

        request.setStatus(ShiftSwapRequest.SwapStatus.REJECTED);
        request.setApproverId(approverId);
        request.setRejectedAt(LocalDateTime.now());
        request.setRejectionReason(rejectionReason);

        log.info("Shift swap rejected by manager {}: requestId={}", approverId, requestId);
        return swapRequestRepository.save(request);
    }

    // ========== Cancel ==========

    @Transactional
    public ShiftSwapRequest cancelRequest(UUID requestId, UUID requesterId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        ShiftSwapRequest request = loadRequest(requestId, tenantId);

        if (!request.canBeCancelled()) {
            throw new IllegalStateException("Request cannot be cancelled in state: " + request.getStatus());
        }
        if (!requesterId.equals(request.getRequesterEmployeeId())) {
            throw new SecurityException("Only the requester can cancel this request");
        }

        request.setStatus(ShiftSwapRequest.SwapStatus.CANCELLED);
        log.info("Shift swap cancelled: requestId={}", requestId);
        return swapRequestRepository.save(request);
    }

    // ========== Queries ==========

    @Transactional(readOnly = true)
    public Page<ShiftSwapRequest> getMyRequests(UUID employeeId, Pageable pageable) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        return swapRequestRepository.findAllByTenantIdAndRequesterEmployeeId(tenantId, employeeId, pageable);
    }

    @Transactional(readOnly = true)
    public List<ShiftSwapRequest> getIncomingRequests(UUID employeeId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        return swapRequestRepository.findPendingRequestsForTargetEmployee(tenantId, employeeId);
    }

    @Transactional(readOnly = true)
    public List<ShiftSwapRequest> getRequestsPendingApproval() {
        UUID tenantId = TenantContext.requireCurrentTenant();
        return swapRequestRepository.findRequestsPendingApproval(tenantId);
    }

    @Transactional(readOnly = true)
    public Page<ShiftSwapRequest> getAllRequests(Pageable pageable) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        return swapRequestRepository.findAllByTenantId(tenantId, pageable);
    }

    // ========== Internal helpers ==========

    /**
     * Execute the physical swap by reassigning shift assignments.
     * For SWAP: swap the shift IDs on the two assignments.
     * For GIVE_AWAY / PICK_UP: transfer the requester's shift to the target.
     */
    private void executeSwap(ShiftSwapRequest request) {
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

    private ShiftSwapRequest loadRequest(UUID requestId, UUID tenantId) {
        return swapRequestRepository.findByIdAndTenantId(requestId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Shift swap request not found: " + requestId));
    }
}
