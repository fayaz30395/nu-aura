package com.hrms.application.employee.service;

import com.hrms.api.employee.dto.ApproveRejectChangeRequest;
import com.hrms.api.employee.dto.CreateEmploymentChangeRequest;
import com.hrms.api.employee.dto.EmploymentChangeRequestDto;
import com.hrms.common.exception.BusinessException;
import com.hrms.common.exception.ResourceNotFoundException;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.employee.EmploymentChangeRequest;
import com.hrms.infrastructure.employee.repository.DepartmentRepository;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.employee.repository.EmploymentChangeRequestRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class EmploymentChangeRequestService {

    private final EmploymentChangeRequestRepository changeRequestRepository;
    private final EmployeeRepository employeeRepository;
    private final DepartmentRepository departmentRepository;

    public EmploymentChangeRequestService(EmploymentChangeRequestRepository changeRequestRepository,
                                          EmployeeRepository employeeRepository,
                                          DepartmentRepository departmentRepository) {
        this.changeRequestRepository = changeRequestRepository;
        this.employeeRepository = employeeRepository;
        this.departmentRepository = departmentRepository;
    }

    /**
     * Create a new employment change request
     */
    @Transactional
    public EmploymentChangeRequestDto createChangeRequest(CreateEmploymentChangeRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID requesterId = SecurityContext.getCurrentUserId();

        // Get the employee
        Employee employee = employeeRepository.findByIdAndTenantId(request.getEmployeeId(), tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found"));

        // Check for existing pending requests for this employee
        List<EmploymentChangeRequest> pendingRequests = changeRequestRepository
                .findAllByEmployeeIdAndTenantIdAndStatus(
                        request.getEmployeeId(),
                        tenantId,
                        EmploymentChangeRequest.ChangeRequestStatus.PENDING
                );

        if (!pendingRequests.isEmpty()) {
            throw new BusinessException("There is already a pending change request for this employee. Please wait for it to be processed or cancel it first.");
        }

        // Determine change type
        EmploymentChangeRequest.ChangeType changeType = EmploymentChangeRequest.determineChangeType(
                employee.getDesignation(), request.getNewDesignation(),
                employee.getLevel(), request.getNewLevel(),
                employee.getDepartmentId(), request.getNewDepartmentId(),
                employee.getManagerId(), request.getNewManagerId(),
                employee.getJobRole(), request.getNewJobRole(),
                employee.getStatus(), request.getNewEmployeeStatus(),
                employee.getConfirmationDate(), request.getNewConfirmationDate()
        );

        // Build the change request
        EmploymentChangeRequest changeRequest = EmploymentChangeRequest.builder()
                .employeeId(request.getEmployeeId())
                .requesterId(requesterId)
                .status(EmploymentChangeRequest.ChangeRequestStatus.PENDING)
                .changeType(changeType)
                // Current values
                .currentDesignation(employee.getDesignation())
                .currentLevel(employee.getLevel())
                .currentJobRole(employee.getJobRole())
                .currentDepartmentId(employee.getDepartmentId())
                .currentManagerId(employee.getManagerId())
                .currentEmploymentType(employee.getEmploymentType())
                .currentConfirmationDate(employee.getConfirmationDate())
                .currentEmployeeStatus(employee.getStatus())
                // New values
                .newDesignation(request.getNewDesignation())
                .newLevel(request.getNewLevel())
                .newJobRole(request.getNewJobRole())
                .newDepartmentId(request.getNewDepartmentId())
                .newManagerId(request.getNewManagerId())
                .newEmploymentType(request.getNewEmploymentType())
                .newConfirmationDate(request.getNewConfirmationDate())
                .newEmployeeStatus(request.getNewEmployeeStatus())
                // Metadata
                .reason(request.getReason())
                .effectiveDate(request.getEffectiveDate())
                .build();

        changeRequest.setTenantId(tenantId);
        changeRequest = changeRequestRepository.save(changeRequest);

        return enrichDto(EmploymentChangeRequestDto.fromEntity(changeRequest));
    }

    /**
     * Get all change requests (for HR to review)
     */
    @Transactional(readOnly = true)
    public Page<EmploymentChangeRequestDto> getAllChangeRequests(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return changeRequestRepository.findAllByTenantId(tenantId, pageable)
                .map(entity -> enrichDto(EmploymentChangeRequestDto.fromEntity(entity)));
    }

    /**
     * Get pending change requests (for HR approval queue)
     */
    @Transactional(readOnly = true)
    public Page<EmploymentChangeRequestDto> getPendingChangeRequests(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return changeRequestRepository.findPendingRequests(tenantId, pageable)
                .map(entity -> enrichDto(EmploymentChangeRequestDto.fromEntity(entity)));
    }

    /**
     * Get change requests by employee
     */
    @Transactional(readOnly = true)
    public Page<EmploymentChangeRequestDto> getChangeRequestsByEmployee(UUID employeeId, Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return changeRequestRepository.findAllByEmployeeIdAndTenantId(employeeId, tenantId, pageable)
                .map(entity -> enrichDto(EmploymentChangeRequestDto.fromEntity(entity)));
    }

    /**
     * Get a single change request
     */
    @Transactional(readOnly = true)
    public EmploymentChangeRequestDto getChangeRequest(UUID requestId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        EmploymentChangeRequest request = changeRequestRepository.findByIdAndTenantId(requestId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Change request not found"));
        return enrichDto(EmploymentChangeRequestDto.fromEntity(request));
    }

    /**
     * Approve a change request (HR Manager only)
     */
    @Transactional
    public EmploymentChangeRequestDto approveChangeRequest(UUID requestId, ApproveRejectChangeRequest approvalRequest) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID approverId = SecurityContext.getCurrentUserId();

        EmploymentChangeRequest changeRequest = changeRequestRepository.findByIdAndTenantId(requestId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Change request not found"));

        if (changeRequest.getStatus() != EmploymentChangeRequest.ChangeRequestStatus.PENDING) {
            throw new BusinessException("Only pending requests can be approved");
        }

        // Get the employee to apply changes
        Employee employee = employeeRepository.findByIdAndTenantId(changeRequest.getEmployeeId(), tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found"));

        // Apply the changes
        if (changeRequest.getNewDesignation() != null) {
            employee.setDesignation(changeRequest.getNewDesignation());
        }
        if (changeRequest.getNewLevel() != null) {
            employee.setLevel(changeRequest.getNewLevel());
        }
        if (changeRequest.getNewJobRole() != null) {
            employee.setJobRole(changeRequest.getNewJobRole());
        }
        if (changeRequest.getNewDepartmentId() != null) {
            employee.setDepartmentId(changeRequest.getNewDepartmentId());
        }
        if (changeRequest.getNewManagerId() != null) {
            employee.setManagerId(changeRequest.getNewManagerId());
        }
        if (changeRequest.getNewEmploymentType() != null) {
            employee.setEmploymentType(changeRequest.getNewEmploymentType());
        }
        if (changeRequest.getNewConfirmationDate() != null) {
            employee.setConfirmationDate(changeRequest.getNewConfirmationDate());
        }
        if (changeRequest.getNewEmployeeStatus() != null) {
            employee.setStatus(changeRequest.getNewEmployeeStatus());
        }

        employeeRepository.save(employee);

        // Update the change request
        changeRequest.setStatus(EmploymentChangeRequest.ChangeRequestStatus.APPROVED);
        changeRequest.setApproverId(approverId);
        changeRequest.setApprovedAt(LocalDateTime.now());
        changeRequest = changeRequestRepository.save(changeRequest);

        return enrichDto(EmploymentChangeRequestDto.fromEntity(changeRequest));
    }

    /**
     * Reject a change request (HR Manager only)
     */
    @Transactional
    public EmploymentChangeRequestDto rejectChangeRequest(UUID requestId, ApproveRejectChangeRequest rejectRequest) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID approverId = SecurityContext.getCurrentUserId();

        if (rejectRequest.getRejectionReason() == null || rejectRequest.getRejectionReason().isBlank()) {
            throw new BusinessException("Rejection reason is required");
        }

        EmploymentChangeRequest changeRequest = changeRequestRepository.findByIdAndTenantId(requestId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Change request not found"));

        if (changeRequest.getStatus() != EmploymentChangeRequest.ChangeRequestStatus.PENDING) {
            throw new BusinessException("Only pending requests can be rejected");
        }

        // Update the change request
        changeRequest.setStatus(EmploymentChangeRequest.ChangeRequestStatus.REJECTED);
        changeRequest.setApproverId(approverId);
        changeRequest.setRejectionReason(rejectRequest.getRejectionReason());
        changeRequest.setRejectedAt(LocalDateTime.now());
        changeRequest = changeRequestRepository.save(changeRequest);

        return enrichDto(EmploymentChangeRequestDto.fromEntity(changeRequest));
    }

    /**
     * Cancel a change request (requester only)
     */
    @Transactional
    public EmploymentChangeRequestDto cancelChangeRequest(UUID requestId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID currentUserId = SecurityContext.getCurrentUserId();

        EmploymentChangeRequest changeRequest = changeRequestRepository.findByIdAndTenantId(requestId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Change request not found"));

        if (changeRequest.getStatus() != EmploymentChangeRequest.ChangeRequestStatus.PENDING) {
            throw new BusinessException("Only pending requests can be cancelled");
        }

        // Only requester can cancel
        if (!changeRequest.getRequesterId().equals(currentUserId)) {
            throw new BusinessException("Only the requester can cancel this request");
        }

        changeRequest.setStatus(EmploymentChangeRequest.ChangeRequestStatus.CANCELLED);
        changeRequest = changeRequestRepository.save(changeRequest);

        return enrichDto(EmploymentChangeRequestDto.fromEntity(changeRequest));
    }

    /**
     * Get count of pending requests
     */
    @Transactional(readOnly = true)
    public Long countPendingRequests() {
        UUID tenantId = TenantContext.getCurrentTenant();
        return changeRequestRepository.countPendingRequests(tenantId);
    }

    /**
     * Enrich DTO with names
     */
    private EmploymentChangeRequestDto enrichDto(EmploymentChangeRequestDto dto) {
        UUID tenantId = TenantContext.getCurrentTenant();

        // Employee name
        employeeRepository.findByIdAndTenantId(dto.getEmployeeId(), tenantId)
                .ifPresent(emp -> {
                    dto.setEmployeeName(emp.getFullName());
                    dto.setEmployeeCode(emp.getEmployeeCode());
                });

        // Requester name
        employeeRepository.findByUserIdAndTenantId(dto.getRequesterId(), tenantId)
                .ifPresent(emp -> dto.setRequesterName(emp.getFullName()));

        // Approver name
        if (dto.getApproverId() != null) {
            employeeRepository.findByUserIdAndTenantId(dto.getApproverId(), tenantId)
                    .ifPresent(emp -> dto.setApproverName(emp.getFullName()));
        }

        // Department names
        if (dto.getCurrentDepartmentId() != null) {
            departmentRepository.findById(dto.getCurrentDepartmentId())
                    .ifPresent(dept -> dto.setCurrentDepartmentName(dept.getName()));
        }
        if (dto.getNewDepartmentId() != null) {
            departmentRepository.findById(dto.getNewDepartmentId())
                    .ifPresent(dept -> dto.setNewDepartmentName(dept.getName()));
        }

        // Manager names
        if (dto.getCurrentManagerId() != null) {
            employeeRepository.findByIdAndTenantId(dto.getCurrentManagerId(), tenantId)
                    .ifPresent(emp -> dto.setCurrentManagerName(emp.getFullName()));
        }
        if (dto.getNewManagerId() != null) {
            employeeRepository.findByIdAndTenantId(dto.getNewManagerId(), tenantId)
                    .ifPresent(emp -> dto.setNewManagerName(emp.getFullName()));
        }

        return dto;
    }
}
