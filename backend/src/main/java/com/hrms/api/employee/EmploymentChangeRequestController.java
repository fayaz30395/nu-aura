package com.hrms.api.employee;

import com.hrms.api.employee.dto.ApproveRejectChangeRequest;
import com.hrms.api.employee.dto.CreateEmploymentChangeRequest;
import com.hrms.api.employee.dto.EmploymentChangeRequestDto;
import com.hrms.application.employee.service.EmploymentChangeRequestService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/employment-change-requests")
@Tag(name = "Employment Change Requests", description = "APIs for managing employment detail change requests requiring HR approval")
public class EmploymentChangeRequestController {

    @Autowired
    private EmploymentChangeRequestService changeRequestService;

    @PostMapping
    @RequiresPermission(Permission.EMPLOYMENT_CHANGE_CREATE)
    @Operation(summary = "Create employment change request", description = "Creates a new change request for employment details that requires HR approval")
    public ResponseEntity<EmploymentChangeRequestDto> createChangeRequest(
            @Valid @RequestBody CreateEmploymentChangeRequest request) {
        EmploymentChangeRequestDto response = changeRequestService.createChangeRequest(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    @RequiresPermission(Permission.EMPLOYMENT_CHANGE_VIEW_ALL)
    @Operation(summary = "Get all change requests", description = "Returns all employment change requests (for HR review)")
    public ResponseEntity<Page<EmploymentChangeRequestDto>> getAllChangeRequests(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDirection) {
        Sort.Direction direction = sortDirection.equalsIgnoreCase("ASC") ? Sort.Direction.ASC : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));
        Page<EmploymentChangeRequestDto> requests = changeRequestService.getAllChangeRequests(pageable);
        return ResponseEntity.ok(requests);
    }

    @GetMapping("/pending")
    @RequiresPermission(Permission.EMPLOYMENT_CHANGE_APPROVE)
    @Operation(summary = "Get pending change requests", description = "Returns pending change requests for HR approval")
    public ResponseEntity<Page<EmploymentChangeRequestDto>> getPendingChangeRequests(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<EmploymentChangeRequestDto> requests = changeRequestService.getPendingChangeRequests(pageable);
        return ResponseEntity.ok(requests);
    }

    @GetMapping("/pending/count")
    @RequiresPermission(Permission.EMPLOYMENT_CHANGE_APPROVE)
    @Operation(summary = "Get pending requests count", description = "Returns count of pending change requests")
    public ResponseEntity<Long> getPendingRequestsCount() {
        Long count = changeRequestService.countPendingRequests();
        return ResponseEntity.ok(count);
    }

    @GetMapping("/employee/{employeeId}")
    @RequiresPermission({Permission.EMPLOYMENT_CHANGE_VIEW, Permission.EMPLOYMENT_CHANGE_VIEW_ALL})
    @Operation(summary = "Get change requests by employee", description = "Returns change requests for a specific employee")
    public ResponseEntity<Page<EmploymentChangeRequestDto>> getChangeRequestsByEmployee(
            @PathVariable UUID employeeId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<EmploymentChangeRequestDto> requests = changeRequestService.getChangeRequestsByEmployee(employeeId, pageable);
        return ResponseEntity.ok(requests);
    }

    @GetMapping("/{id}")
    @RequiresPermission({Permission.EMPLOYMENT_CHANGE_VIEW, Permission.EMPLOYMENT_CHANGE_VIEW_ALL})
    @Operation(summary = "Get change request by ID", description = "Returns a single change request by ID")
    public ResponseEntity<EmploymentChangeRequestDto> getChangeRequest(@PathVariable UUID id) {
        EmploymentChangeRequestDto request = changeRequestService.getChangeRequest(id);
        return ResponseEntity.ok(request);
    }

    @PostMapping("/{id}/approve")
    @RequiresPermission(Permission.EMPLOYMENT_CHANGE_APPROVE)
    @Operation(summary = "Approve change request", description = "Approves an employment change request and applies the changes")
    public ResponseEntity<EmploymentChangeRequestDto> approveChangeRequest(
            @PathVariable UUID id,
            @RequestBody(required = false) ApproveRejectChangeRequest request) {
        if (request == null) {
            request = new ApproveRejectChangeRequest();
        }
        EmploymentChangeRequestDto response = changeRequestService.approveChangeRequest(id, request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/reject")
    @RequiresPermission(Permission.EMPLOYMENT_CHANGE_APPROVE)
    @Operation(summary = "Reject change request", description = "Rejects an employment change request with a reason")
    public ResponseEntity<EmploymentChangeRequestDto> rejectChangeRequest(
            @PathVariable UUID id,
            @Valid @RequestBody ApproveRejectChangeRequest request) {
        EmploymentChangeRequestDto response = changeRequestService.rejectChangeRequest(id, request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/cancel")
    @RequiresPermission(Permission.EMPLOYMENT_CHANGE_CANCEL)
    @Operation(summary = "Cancel change request", description = "Cancels a pending change request (requester only)")
    public ResponseEntity<EmploymentChangeRequestDto> cancelChangeRequest(@PathVariable UUID id) {
        EmploymentChangeRequestDto response = changeRequestService.cancelChangeRequest(id);
        return ResponseEntity.ok(response);
    }
}
