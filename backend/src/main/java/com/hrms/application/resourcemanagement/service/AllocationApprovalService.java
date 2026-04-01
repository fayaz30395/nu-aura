package com.hrms.application.resourcemanagement.service;

import com.hrms.api.resourcemanagement.dto.*;
import com.hrms.common.exception.ResourceNotFoundException;
import com.hrms.common.security.Permission;
import com.hrms.common.security.SecurityContext;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.project.Project;
import com.hrms.domain.project.ProjectEmployee;
import com.hrms.domain.resourcemanagement.AllocationApprovalRequest;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.project.repository.HrmsProjectRepository;
import com.hrms.infrastructure.project.repository.ProjectEmployeeRepository;
import com.hrms.infrastructure.resourcemanagement.repository.AllocationApprovalRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

import static com.hrms.api.resourcemanagement.dto.ApprovalDTOs.*;

/**
 * Handles the full lifecycle of allocation approval requests:
 * creation, retrieval, approval, rejection, and manager-level querying.
 */
@Service
@RequiredArgsConstructor
public class AllocationApprovalService {

    private final AllocationApprovalRequestRepository approvalRepository;
    private final EmployeeRepository employeeRepository;
    private final HrmsProjectRepository projectRepository;
    private final ProjectEmployeeRepository projectEmployeeRepository;

    // ============================================
    // ALLOCATION APPROVAL REQUESTS
    // ============================================

    @Transactional
    public AllocationApprovalResponse createAllocationRequest(
            CreateAllocationRequest request) {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        UUID requestedById = SecurityContext.getCurrentEmployeeId();

        AllocationApprovalRequest entity = AllocationApprovalRequest.builder()
                .employeeId(request.getEmployeeId())
                .projectId(request.getProjectId())
                .requestedAllocation(request.getAllocationPercentage())
                .role(request.getRole())
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .requestedById(requestedById)
                .status(AllocationApprovalRequest.ApprovalStatus.PENDING)
                .requestReason(request.getReason())
                .build();
        entity.setId(UUID.randomUUID());
        entity.setTenantId(tenantId);

        AllocationApprovalRequest saved = approvalRepository.save(entity);

        Employee employee = employeeRepository.findById(request.getEmployeeId()).orElse(null);
        Project project = projectRepository.findById(request.getProjectId()).orElse(null);
        Employee requester = employeeRepository.findById(requestedById).orElse(null);

        return AllocationApprovalResponse.fromEntity(saved,
                employee != null ? employee.getFullName() : "N/A",
                employee != null ? employee.getEmployeeCode() : "N/A",
                project != null ? project.getName() : "N/A",
                project != null ? project.getProjectCode() : "N/A",
                requester != null ? requester.getFullName() : "System",
                null,
                getEmployeeAllocation(request.getEmployeeId()));
    }

    @Transactional(readOnly = true)
    public AllocationApprovalResponse getAllocationRequest(UUID requestId) {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        AllocationApprovalRequest request = approvalRepository.findById(requestId)
                .filter(r -> r.getTenantId().equals(tenantId))
                .orElseThrow(() -> new ResourceNotFoundException("Request not found"));
        return mapToApprovalResponse(request);
    }

    @Transactional(readOnly = true)
    public Page<AllocationApprovalResponse> getAllPendingRequests(UUID departmentId, Pageable pageable) {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        return approvalRepository
                .findAllByTenantIdAndStatus(tenantId, AllocationApprovalRequest.ApprovalStatus.PENDING,
                        pageable)
                .map(this::mapToApprovalResponse);
    }

    @Transactional(readOnly = true)
    public Page<AllocationApprovalResponse> getEmployeeAllocationHistory(UUID employeeId, Pageable pageable) {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        return approvalRepository.findAllByTenantIdAndEmployeeId(tenantId, employeeId, pageable)
                .map(this::mapToApprovalResponse);
    }

    @Transactional(readOnly = true)
    public long getPendingApprovalsCount() {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        return approvalRepository.countByTenantIdAndStatus(tenantId,
                AllocationApprovalRequest.ApprovalStatus.PENDING);
    }

    @Transactional
    public void approveAllocationRequest(UUID requestId, String comment) {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        UUID approverId = SecurityContext.getCurrentEmployeeId();

        validateApprovalPermission();

        AllocationApprovalRequest request = approvalRepository.findById(requestId)
                .filter(r -> r.getTenantId().equals(tenantId))
                .orElseThrow(() -> new ResourceNotFoundException("Request not found"));

        if (request.getStatus() != AllocationApprovalRequest.ApprovalStatus.PENDING) {
            throw new IllegalStateException("Request is already " + request.getStatus());
        }

        if (request.getRequestedById().equals(approverId)) {
            throw new IllegalStateException("Cannot approve your own allocation request");
        }

        request.setStatus(AllocationApprovalRequest.ApprovalStatus.APPROVED);
        request.setApproverId(approverId);
        request.setApprovalComment(comment);
        request.setResolvedAt(LocalDateTime.now());
        approvalRepository.save(request);

        ProjectEmployee assignment = ProjectEmployee.builder()
                .projectId(request.getProjectId())
                .employeeId(request.getEmployeeId())
                .role(request.getRole())
                .allocationPercentage(request.getRequestedAllocation())
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .isActive(true)
                .build();
        assignment.setTenantId(tenantId);
        projectEmployeeRepository.save(assignment);
    }

    @Transactional
    public void rejectAllocationRequest(UUID requestId, String reason) {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        UUID approverId = SecurityContext.getCurrentEmployeeId();

        validateApprovalPermission();

        AllocationApprovalRequest request = approvalRepository.findById(requestId)
                .filter(r -> r.getTenantId().equals(tenantId))
                .orElseThrow(() -> new ResourceNotFoundException("Request not found"));

        if (request.getStatus() != AllocationApprovalRequest.ApprovalStatus.PENDING) {
            throw new IllegalStateException("Request is already " + request.getStatus());
        }

        if (request.getRequestedById().equals(approverId)) {
            throw new IllegalStateException("Cannot reject your own allocation request");
        }

        request.setStatus(AllocationApprovalRequest.ApprovalStatus.REJECTED);
        request.setApproverId(approverId);
        request.setRejectionReason(reason);
        request.setResolvedAt(LocalDateTime.now());
        approvalRepository.save(request);
    }

    @Transactional(readOnly = true)
    public Page<AllocationApprovalResponse> getMyPendingApprovals(Pageable pageable) {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        UUID managerId = SecurityContext.getCurrentEmployeeId();
        return approvalRepository
                .findAllByTenantIdAndApproverIdAndStatus(tenantId, managerId,
                        AllocationApprovalRequest.ApprovalStatus.PENDING, pageable)
                .map(this::mapToApprovalResponse);
    }

    // ============================================
    // PRIVATE HELPERS
    // ============================================

    private void validateApprovalPermission() {
        boolean hasApprovalPermission = SecurityContext.hasAnyPermission(
                Permission.ALLOCATION_APPROVE,
                Permission.ALLOCATION_MANAGE,
                Permission.PROJECT_MANAGE,
                Permission.SYSTEM_ADMIN);

        boolean isManager = SecurityContext.isManager();

        if (!hasApprovalPermission && !isManager) {
            throw new SecurityException(
                    "You do not have permission to approve or reject allocation requests. "
                            + "Required: ALLOCATION:APPROVE permission or Manager role.");
        }
    }

    int getEmployeeAllocation(UUID employeeId) {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        return projectEmployeeRepository
                .findAllByEmployeeIdAndTenantIdAndIsActive(employeeId, tenantId, true)
                .stream().mapToInt(ProjectEmployee::getAllocationPercentage).sum();
    }

    AllocationApprovalResponse mapToApprovalResponse(AllocationApprovalRequest request) {
        Employee employee = employeeRepository.findById(request.getEmployeeId()).orElse(null);
        Project project = projectRepository.findById(request.getProjectId()).orElse(null);
        Employee requester = employeeRepository.findById(request.getRequestedById()).orElse(null);
        Employee approver = request.getApproverId() != null
                ? employeeRepository.findById(request.getApproverId()).orElse(null)
                : null;

        return AllocationApprovalResponse.fromEntity(request,
                employee != null ? employee.getFullName() : "N/A",
                employee != null ? employee.getEmployeeCode() : "N/A",
                project != null ? project.getName() : "N/A",
                project != null ? project.getProjectCode() : "N/A",
                requester != null ? requester.getFullName() : "System",
                approver != null ? approver.getFullName() : null,
                getEmployeeAllocation(request.getEmployeeId()));
    }
}
