package com.hrms.api.leave.controller;

import com.hrms.api.leave.dto.LeaveRequestRequest;
import com.hrms.api.leave.dto.LeaveRequestResponse;
import com.hrms.application.leave.service.LeaveRequestService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.leave.LeaveRequest;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.BeanUtils;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/leave-requests")
@RequiredArgsConstructor
public class LeaveRequestController {

    private final LeaveRequestService leaveRequestService;
    private final EmployeeRepository employeeRepository;

    @PostMapping
    @RequiresPermission(Permission.LEAVE_REQUEST)
    public ResponseEntity<LeaveRequestResponse> createLeaveRequest(@Valid @RequestBody LeaveRequestRequest request) {
        LeaveRequest leaveRequest = new LeaveRequest();
        BeanUtils.copyProperties(request, leaveRequest);
        if (request.getHalfDayPeriod() != null) {
            leaveRequest.setHalfDayPeriod(LeaveRequest.HalfDayPeriod.valueOf(request.getHalfDayPeriod()));
        }
        LeaveRequest created = leaveRequestService.createLeaveRequest(leaveRequest);
        return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(created));
    }

    @GetMapping("/{id}")
    @RequiresPermission({
        Permission.LEAVE_VIEW_ALL,
        Permission.LEAVE_VIEW_TEAM,
        Permission.LEAVE_VIEW_SELF
    })
    public ResponseEntity<LeaveRequestResponse> getLeaveRequest(@PathVariable UUID id) {
        LeaveRequest leaveRequest = leaveRequestService.getLeaveRequestById(id);
        return ResponseEntity.ok(toResponse(leaveRequest));
    }

    @GetMapping
    @RequiresPermission({
        Permission.LEAVE_VIEW_ALL,
        Permission.LEAVE_VIEW_TEAM
    })
    public ResponseEntity<Page<LeaveRequestResponse>> getAllLeaveRequests(Pageable pageable) {
        Page<LeaveRequest> requests = leaveRequestService.getAllLeaveRequests(pageable);
        return ResponseEntity.ok(requests.map(this::toResponse));
    }

    @GetMapping("/employee/{employeeId}")
    @RequiresPermission({
        Permission.LEAVE_VIEW_ALL,
        Permission.LEAVE_VIEW_TEAM,
        Permission.LEAVE_VIEW_SELF
    })
    public ResponseEntity<Page<LeaveRequestResponse>> getEmployeeLeaveRequests(
            @PathVariable UUID employeeId,
            Pageable pageable) {
        Page<LeaveRequest> requests = leaveRequestService.getLeaveRequestsByEmployee(employeeId, pageable);
        return ResponseEntity.ok(requests.map(this::toResponse));
    }

    @GetMapping("/status/{status}")
    @RequiresPermission({
        Permission.LEAVE_VIEW_ALL,
        Permission.LEAVE_VIEW_TEAM
    })
    public ResponseEntity<Page<LeaveRequestResponse>> getLeaveRequestsByStatus(
            @PathVariable String status,
            Pageable pageable) {
        LeaveRequest.LeaveRequestStatus leaveStatus = LeaveRequest.LeaveRequestStatus.valueOf(status);
        Page<LeaveRequest> requests = leaveRequestService.getLeaveRequestsByStatus(leaveStatus, pageable);
        return ResponseEntity.ok(requests.map(this::toResponse));
    }

    @PostMapping("/{id}/approve")
    @RequiresPermission(Permission.LEAVE_APPROVE)
    public ResponseEntity<LeaveRequestResponse> approveLeaveRequest(
            @PathVariable UUID id,
            @RequestParam UUID approverId) {
        LeaveRequest approved = leaveRequestService.approveLeaveRequest(id, approverId);
        return ResponseEntity.ok(toResponse(approved));
    }

    @PostMapping("/{id}/reject")
    @RequiresPermission(Permission.LEAVE_REJECT)
    public ResponseEntity<LeaveRequestResponse> rejectLeaveRequest(
            @PathVariable UUID id,
            @RequestParam UUID approverId,
            @RequestParam String reason) {
        LeaveRequest rejected = leaveRequestService.rejectLeaveRequest(id, approverId, reason);
        return ResponseEntity.ok(toResponse(rejected));
    }

    @PostMapping("/{id}/cancel")
    @RequiresPermission(Permission.LEAVE_CANCEL)
    public ResponseEntity<LeaveRequestResponse> cancelLeaveRequest(
            @PathVariable UUID id,
            @RequestParam String reason) {
        LeaveRequest cancelled = leaveRequestService.cancelLeaveRequest(id, reason);
        return ResponseEntity.ok(toResponse(cancelled));
    }

    @PutMapping("/{id}")
    @RequiresPermission(Permission.LEAVE_REQUEST)
    public ResponseEntity<LeaveRequestResponse> updateLeaveRequest(
            @PathVariable UUID id,
            @Valid @RequestBody LeaveRequestRequest request) {
        LeaveRequest leaveRequestData = new LeaveRequest();
        BeanUtils.copyProperties(request, leaveRequestData);
        if (request.getHalfDayPeriod() != null) {
            leaveRequestData.setHalfDayPeriod(LeaveRequest.HalfDayPeriod.valueOf(request.getHalfDayPeriod()));
        }
        LeaveRequest updated = leaveRequestService.updateLeaveRequest(id, leaveRequestData);
        return ResponseEntity.ok(toResponse(updated));
    }

    private LeaveRequestResponse toResponse(LeaveRequest request) {
        LeaveRequestResponse response = new LeaveRequestResponse();
        BeanUtils.copyProperties(request, response);
        response.setStatus(request.getStatus().name());
        if (request.getHalfDayPeriod() != null) {
            response.setHalfDayPeriod(request.getHalfDayPeriod().name());
        }

        // Get the employee to find reporting manager (approver)
        UUID tenantId = TenantContext.getCurrentTenant();
        Optional<Employee> employeeOpt = employeeRepository.findByIdAndTenantId(request.getEmployeeId(), tenantId);
        if (employeeOpt.isPresent()) {
            Employee employee = employeeOpt.get();
            if (employee.getManagerId() != null) {
                response.setApproverId(employee.getManagerId());
                // Get the manager's name
                Optional<Employee> managerOpt = employeeRepository.findByIdAndTenantId(employee.getManagerId(), tenantId);
                managerOpt.ifPresent(manager -> response.setPendingApproverName(manager.getFullName()));
            }
        }

        // If already approved/rejected, get the approver's name
        if (request.getApprovedBy() != null) {
            Optional<Employee> approverOpt = employeeRepository.findByIdAndTenantId(request.getApprovedBy(), tenantId);
            approverOpt.ifPresent(approver -> response.setApproverName(approver.getFullName()));
        }

        return response;
    }
}
