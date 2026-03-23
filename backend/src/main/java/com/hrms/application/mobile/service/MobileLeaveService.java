package com.hrms.application.mobile.service;

import com.hrms.api.mobile.dto.MobileLeaveDto;
import com.hrms.application.leave.service.LeaveRequestService;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.leave.LeaveRequest;
import com.hrms.infrastructure.leave.repository.LeaveRequestRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class MobileLeaveService {

    private final LeaveRequestService leaveRequestService;
    private final LeaveRequestRepository leaveRequestRepository;

    /**
     * Quick apply for leave with minimal fields
     */
    public MobileLeaveDto.RecentLeaveRequest quickApplyLeave(
            MobileLeaveDto.QuickLeaveRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID employeeId = SecurityContext.getCurrentEmployeeId();

        // Create leave request
        LeaveRequest leaveRequest = LeaveRequest.builder()
                .employeeId(employeeId)
                .leaveTypeId(request.getLeaveTypeId())
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .reason(request.getReason())
                .comments(request.getNotes())
                .build();

        if (request.getHalfDayPeriod() != null) {
            leaveRequest.setHalfDayPeriod(LeaveRequest.HalfDayPeriod.valueOf(request.getHalfDayPeriod()));
        }

        leaveRequest.setTenantId(tenantId);

        LeaveRequest created = leaveRequestService.createLeaveRequest(leaveRequest);
        return mapToRecentLeaveRequest(created);
    }

    /**
     * Get leave balance for current employee
     */
    @Transactional(readOnly = true)
    public MobileLeaveDto.LeaveBalanceResponse getLeaveBalance() {
        UUID employeeId = SecurityContext.getCurrentEmployeeId();

        // Build leave balance response
        // This is a placeholder - integrate with actual LeaveBalanceService
        return MobileLeaveDto.LeaveBalanceResponse.builder()
                .employeeId(employeeId)
                .employeeName("") // Fetch from employee service
                .casualLeave(MobileLeaveDto.LeaveBalanceResponse.LeaveTypeBalance.builder()
                        .leaveTypeName("Casual Leave")
                        .totalBalance(12.0)
                        .usedBalance(2.0)
                        .pendingBalance(1.0)
                        .availableBalance(9.0)
                        .maxConsecutiveDays(3)
                        .build())
                .sickLeave(MobileLeaveDto.LeaveBalanceResponse.LeaveTypeBalance.builder()
                        .leaveTypeName("Sick Leave")
                        .totalBalance(8.0)
                        .usedBalance(1.0)
                        .pendingBalance(0.0)
                        .availableBalance(7.0)
                        .maxConsecutiveDays(5)
                        .build())
                .earnedLeave(MobileLeaveDto.LeaveBalanceResponse.LeaveTypeBalance.builder()
                        .leaveTypeName("Earned Leave")
                        .totalBalance(20.0)
                        .usedBalance(5.0)
                        .pendingBalance(2.0)
                        .availableBalance(13.0)
                        .maxConsecutiveDays(10)
                        .build())
                .build();
    }

    /**
     * Get recent leave requests (last 10)
     */
    @Transactional(readOnly = true)
    public List<MobileLeaveDto.RecentLeaveRequest> getRecentLeaveRequests() {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID employeeId = SecurityContext.getCurrentEmployeeId();

        List<LeaveRequest> requests = leaveRequestRepository
                .findAllByTenantIdAndEmployeeId(tenantId, employeeId, PageRequest.of(0, 10))
                .getContent();

        return requests.stream()
                .map(this::mapToRecentLeaveRequest)
                .collect(Collectors.toList());
    }

    /**
     * Cancel a leave request
     */
    @Transactional
    public void cancelLeaveRequest(UUID leaveRequestId, MobileLeaveDto.CancelLeaveRequest request) {
        LeaveRequest leaveRequest = leaveRequestRepository.findById(leaveRequestId)
                .orElseThrow(() -> new IllegalStateException("Leave request not found"));

        // Verify ownership
        UUID currentUserId = SecurityContext.getCurrentUserId();
        if (!leaveRequest.getEmployeeId().equals(currentUserId)) {
            throw new IllegalStateException("Cannot cancel another user's leave request");
        }

        // Cancel the request
        leaveRequestService.cancelLeaveRequest(leaveRequestId, request.getReason());
    }

    /**
     * Map LeaveRequest to RecentLeaveRequest DTO
     */
    private MobileLeaveDto.RecentLeaveRequest mapToRecentLeaveRequest(LeaveRequest request) {
        return MobileLeaveDto.RecentLeaveRequest.builder()
                .leaveRequestId(request.getId())
                .leaveTypeId(request.getLeaveTypeId())
                .leaveTypeName("") // Fetch from leave type
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .numberOfDays(request.getTotalDays() != null ? request.getTotalDays().intValue() : 0)
                .status(request.getStatus() != null ? request.getStatus().name() : "PENDING")
                .reason(request.getReason())
                .submittedAt(request.getCreatedAt())
                .build();
    }
}
