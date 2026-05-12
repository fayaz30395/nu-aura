package com.nulogic.application.mobile.service;

import com.nulogic.api.mobile.dto.MobileLeaveDto;
import com.nulogic.application.leave.service.LeaveRequestService;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.security.TenantContext;
import com.nulogic.domain.leave.LeaveRequest;
import com.nulogic.infrastructure.leave.repository.LeaveRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class MobileLeaveService {

    private final LeaveRequestService leaveRequestService;
    private final LeaveRequestRepository leaveRequestRepository;

    /**
     * QA sweep S2-C K-2: the mobile leave-balance projection requires mapping the
     * generic {@code List<LeaveBalance>} returned by {@code LeaveBalanceService} into
     * the fixed-slot DTO (casual/sick/earned/maternity/paternity/unpaid). That mapping
     * relies on tenant-specific {@code LeaveType} metadata that is not yet exposed.
     * Until the mapping ships, this surface is gated behind {@code app.features.mobile-leave-balance}
     * so we don't keep returning hardcoded "12 casual / 8 sick / 20 earned" placeholders.
     */
    @Value("${app.features.mobile-leave-balance:false}")
    private boolean leaveBalanceEnabled;

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
     * Get leave balance for current employee.
     *
     * <p>STUB-GATED (QA sweep S2-C K-2): returns fabricated balances unless the feature
     * flag is enabled. The previous behaviour was to silently return hardcoded values
     * (12 casual, 8 sick, 20 earned) regardless of the employee's real entitlement, which
     * is more dangerous than failing fast — employees would plan time off against fake
     * numbers. Throwing {@link UnsupportedOperationException} surfaces a 501 so the
     * mobile client can show "balance unavailable" instead of bogus data.</p>
     */
    @Transactional(readOnly = true)
    public MobileLeaveDto.LeaveBalanceResponse getLeaveBalance() {
        if (!leaveBalanceEnabled) {
            throw new UnsupportedOperationException(
                    "Mobile leave-balance projection is not implemented. Set app.features.mobile-leave-balance=true once the LeaveBalanceService → DTO mapping ships.");
        }
        UUID employeeId = SecurityContext.getCurrentEmployeeId();
        // Intentionally still a stub when the flag is on — keeps an explicit hook for
        // the LeaveBalanceService wiring without leaking fabricated numbers by default.
        throw new UnsupportedOperationException(
                "Mobile leave-balance mapping not implemented for employee " + employeeId);
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
