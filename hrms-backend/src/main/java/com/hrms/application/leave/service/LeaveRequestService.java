package com.hrms.application.leave.service;

import com.hrms.common.security.TenantContext;
import com.hrms.domain.leave.LeaveRequest;
import com.hrms.infrastructure.leave.repository.LeaveRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class LeaveRequestService {

    private final LeaveRequestRepository leaveRequestRepository;
    private final LeaveBalanceService leaveBalanceService;

    public LeaveRequest createLeaveRequest(LeaveRequest leaveRequest) {
        UUID tenantId = TenantContext.getCurrentTenant();

        // Check for overlapping leaves
        Iterable<LeaveRequest> overlapping = leaveRequestRepository.findOverlappingLeaves(
                tenantId, leaveRequest.getEmployeeId(),
                leaveRequest.getStartDate(), leaveRequest.getEndDate());

        if (overlapping.iterator().hasNext()) {
            throw new IllegalArgumentException("Leave request overlaps with existing approved leave");
        }

        // Generate request number
        String requestNumber = "LR-" + System.currentTimeMillis();
        leaveRequest.setRequestNumber(requestNumber);
        leaveRequest.setTenantId(tenantId);

        LeaveRequest saved = leaveRequestRepository.save(leaveRequest);

        // Add to pending in balance
        leaveBalanceService.getOrCreateBalance(
                saved.getEmployeeId(),
                saved.getLeaveTypeId(),
                saved.getStartDate().getYear());

        return saved;
    }

    public LeaveRequest approveLeaveRequest(UUID id, UUID approverId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        LeaveRequest request = leaveRequestRepository.findById(id)
                .filter(lr -> lr.getTenantId().equals(tenantId))
                .orElseThrow(() -> new IllegalArgumentException("Leave request not found"));

        request.approve(approverId);
        LeaveRequest saved = leaveRequestRepository.save(request);

        // Deduct from balance
        leaveBalanceService.deductLeave(
                saved.getEmployeeId(),
                saved.getLeaveTypeId(),
                saved.getTotalDays());

        return saved;
    }

    public LeaveRequest rejectLeaveRequest(UUID id, UUID approverId, String reason) {
        UUID tenantId = TenantContext.getCurrentTenant();

        LeaveRequest request = leaveRequestRepository.findById(id)
                .filter(lr -> lr.getTenantId().equals(tenantId))
                .orElseThrow(() -> new IllegalArgumentException("Leave request not found"));

        request.reject(approverId, reason);
        return leaveRequestRepository.save(request);
    }

    public LeaveRequest cancelLeaveRequest(UUID id, String reason) {
        UUID tenantId = TenantContext.getCurrentTenant();

        LeaveRequest request = leaveRequestRepository.findById(id)
                .filter(lr -> lr.getTenantId().equals(tenantId))
                .orElseThrow(() -> new IllegalArgumentException("Leave request not found"));

        boolean wasApproved = request.getStatus() == LeaveRequest.LeaveRequestStatus.APPROVED;
        request.cancel(reason);
        LeaveRequest saved = leaveRequestRepository.save(request);

        // Credit back if was approved
        if (wasApproved) {
            leaveBalanceService.creditLeave(
                    saved.getEmployeeId(),
                    saved.getLeaveTypeId(),
                    saved.getTotalDays());
        }

        return saved;
    }

    public LeaveRequest updateLeaveRequest(UUID id, LeaveRequest leaveRequestData) {
        UUID tenantId = TenantContext.getCurrentTenant();

        LeaveRequest request = leaveRequestRepository.findById(id)
                .filter(lr -> lr.getTenantId().equals(tenantId))
                .orElseThrow(() -> new IllegalArgumentException("Leave request not found"));

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
        UUID tenantId = TenantContext.getCurrentTenant();
        return leaveRequestRepository.findById(id)
                .filter(lr -> lr.getTenantId().equals(tenantId))
                .orElseThrow(() -> new IllegalArgumentException("Leave request not found"));
    }

    @Transactional(readOnly = true)
    public Page<LeaveRequest> getAllLeaveRequests(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return leaveRequestRepository.findAllByTenantId(tenantId, pageable);
    }

    @Transactional(readOnly = true)
    public Page<LeaveRequest> getLeaveRequestsByEmployee(UUID employeeId, Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return leaveRequestRepository.findAllByTenantIdAndEmployeeId(tenantId, employeeId, pageable);
    }

    @Transactional(readOnly = true)
    public Page<LeaveRequest> getLeaveRequestsByStatus(LeaveRequest.LeaveRequestStatus status, Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return leaveRequestRepository.findAllByTenantIdAndStatus(tenantId, status, pageable);
    }
}
