package com.hrms.application.resourcemanagement.service;

import com.hrms.api.resourcemanagement.dto.*;
import com.hrms.common.exception.ResourceNotFoundException;
import com.hrms.common.security.SecurityContext;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.project.Project;
import com.hrms.domain.project.ProjectEmployee;
import com.hrms.domain.resourcemanagement.AllocationApprovalRequest;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.project.repository.HrmsProjectRepository;
import com.hrms.infrastructure.project.repository.ProjectEmployeeRepository;
import com.hrms.domain.attendance.Holiday;
import com.hrms.domain.leave.LeaveRequest;
import com.hrms.infrastructure.attendance.repository.HolidayRepository;
import com.hrms.infrastructure.leave.repository.LeaveRequestRepository;
import com.hrms.infrastructure.employee.repository.DepartmentRepository;
import com.hrms.infrastructure.resourcemanagement.repository.AllocationApprovalRequestRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

import static com.hrms.api.resourcemanagement.dto.AllocationDTOs.*;
import static com.hrms.api.resourcemanagement.dto.ApprovalDTOs.*;
import static com.hrms.api.resourcemanagement.dto.WorkloadDTOs.*;
import static com.hrms.api.resourcemanagement.dto.AvailabilityDTOs.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class ResourceManagementService {

        private final EmployeeRepository employeeRepository;
        private final ProjectEmployeeRepository projectEmployeeRepository;
        private final HrmsProjectRepository projectRepository;
        private final AllocationApprovalRequestRepository approvalRepository;
        private final DepartmentRepository departmentRepository;
        private final HolidayRepository holidayRepository;
        private final LeaveRequestRepository leaveRequestRepository;

        // ============================================
        // CAPACITY & ALLOCATION
        // ============================================

        @Transactional(readOnly = true)
        public List<EmployeeCapacity> getEmployeesCapacity(List<UUID> employeeIds, LocalDate asOfDate) {
                if (employeeIds == null || employeeIds.isEmpty()) {
                        UUID tenantId = SecurityContext.getCurrentTenantId();
                        return employeeRepository.findByTenantId(tenantId).stream()
                                        .map(e -> getEmployeeCapacity(e.getId(), asOfDate))
                                        .collect(Collectors.toList());
                }
                return employeeIds.stream()
                                .map(id -> getEmployeeCapacity(id, asOfDate))
                                .collect(Collectors.toList());
        }

        public AllocationValidationResult validateAllocation(UUID employeeId, UUID projectId,
                        Integer allocationPercentage,
                        LocalDate startDate, LocalDate endDate) {
                UUID tenantId = SecurityContext.getCurrentTenantId();
                EmployeeCapacity current = getEmployeeCapacity(employeeId, startDate);
                int proposed = allocationPercentage;

                // Check for existing allocation on the same project within the date range
                List<ProjectEmployee> existingProjectAllocations = projectEmployeeRepository
                                .findAllByEmployeeIdAndTenantIdAndIsActive(employeeId, tenantId, true)
                                .stream()
                                .filter(pe -> pe.getProjectId().equals(projectId))
                                .filter(pe -> {
                                        // Check date overlap
                                        LocalDate peStart = pe.getStartDate();
                                        LocalDate peEnd = pe.getEndDate() != null ? pe.getEndDate() : LocalDate.MAX;
                                        LocalDate reqEnd = endDate != null ? endDate : LocalDate.MAX;
                                        return !startDate.isAfter(peEnd) && !reqEnd.isBefore(peStart);
                                })
                                .collect(Collectors.toList());

                // Check if already allocated to this project in overlapping period
                boolean hasOverlappingAllocation = !existingProjectAllocations.isEmpty();
                int existingAllocationForProject = existingProjectAllocations.stream()
                                .mapToInt(ProjectEmployee::getAllocationPercentage)
                                .sum();

                // Calculate resulting allocation excluding existing allocation on same project
                // (in case of update)
                int adjustedCurrentAllocation = current.getTotalAllocation() - existingAllocationForProject;
                int resulting = adjustedCurrentAllocation + proposed;

                boolean requiresApproval = resulting > 100;
                List<String> warnings = new ArrayList<>();

                if (hasOverlappingAllocation) {
                        warnings.add("Employee already has allocation on this project during the specified period. "
                                        + "Current allocation: " + existingAllocationForProject + "%");
                }

                if (endDate != null && endDate.isBefore(startDate)) {
                        return AllocationValidationResult.builder()
                                        .isValid(false)
                                        .requiresApproval(false)
                                        .currentTotalAllocation(current.getTotalAllocation())
                                        .proposedAllocation(proposed)
                                        .resultingAllocation(resulting)
                                        .message("End date cannot be before start date.")
                                        .existingAllocations(current.getAllocations())
                                        .build();
                }

                String message = requiresApproval
                                ? "This allocation will exceed 100% capacity. Approval required."
                                : hasOverlappingAllocation
                                        ? "Note: Updating existing allocation on this project."
                                        : "Allocation is within capacity limits.";

                return AllocationValidationResult.builder()
                                .isValid(true)
                                .requiresApproval(requiresApproval)
                                .currentTotalAllocation(current.getTotalAllocation())
                                .proposedAllocation(proposed)
                                .resultingAllocation(resulting)
                                .message(message)
                                .existingAllocations(current.getAllocations())
                                .build();
        }

        @Transactional
        public EmployeeWorkload updateAllocation(UpdateAllocationRequest request) {
                if (request == null) {
                        throw new IllegalArgumentException("Update request is required");
                }
                if (request.getEmployeeId() == null || request.getProjectId() == null) {
                        throw new IllegalArgumentException("Employee and project are required");
                }
                if (request.getStartDate() == null) {
                        throw new IllegalArgumentException("Start date is required");
                }
                if (request.getAllocationPercentage() == null) {
                        throw new IllegalArgumentException("Allocation percentage is required");
                }
                if (request.getAllocationPercentage() < 0 || request.getAllocationPercentage() > 100) {
                        throw new IllegalArgumentException("Allocation percentage must be between 0 and 100");
                }
                if (request.getEndDate() != null && request.getEndDate().isBefore(request.getStartDate())) {
                        throw new IllegalArgumentException("End date cannot be before start date");
                }

                UUID tenantId = SecurityContext.getCurrentTenantId();
                employeeRepository.findByIdAndTenantId(request.getEmployeeId(), tenantId)
                                .orElseThrow(() -> new ResourceNotFoundException("Employee not found"));

                ProjectEmployee assignment = projectEmployeeRepository
                                .findByProjectIdAndEmployeeIdAndTenantId(
                                                request.getProjectId(), request.getEmployeeId(), tenantId)
                                .orElseThrow(() -> new ResourceNotFoundException("Allocation not found"));

                assignment.setAllocationPercentage(request.getAllocationPercentage());
                assignment.setStartDate(request.getStartDate());
                assignment.setEndDate(request.getEndDate());
                projectEmployeeRepository.save(assignment);

                return getEmployeeWorkload(request.getEmployeeId());
        }

        @Transactional(readOnly = true)
        public List<EmployeeCapacity> getOverAllocatedEmployees(UUID departmentId, Pageable pageable) {
                UUID tenantId = SecurityContext.getCurrentTenantId();
                List<Employee> employees = departmentId != null
                                ? employeeRepository.findByTenantId(tenantId).stream()
                                                .filter(e -> departmentId.equals(e.getDepartmentId()))
                                                .collect(Collectors.toList())
                                : employeeRepository.findByTenantId(tenantId);

                return employees.stream()
                                .map(e -> getEmployeeCapacity(e.getId(), LocalDate.now()))
                                .filter(EmployeeCapacity::getIsOverAllocated)
                                .collect(Collectors.toList());
        }

        @Transactional(readOnly = true)
        public List<EmployeeCapacity> getAvailableEmployees(Integer minCapacity, UUID departmentId, Pageable pageable) {
                UUID tenantId = SecurityContext.getCurrentTenantId();
                List<Employee> employees = departmentId != null
                                ? employeeRepository.findByTenantId(tenantId).stream()
                                                .filter(e -> departmentId.equals(e.getDepartmentId()))
                                                .collect(Collectors.toList())
                                : employeeRepository.findByTenantId(tenantId);

                return employees.stream()
                                .map(e -> getEmployeeCapacity(e.getId(), LocalDate.now()))
                                .filter(e -> e.getAvailableCapacity() >= (minCapacity != null ? minCapacity : 20))
                                .collect(Collectors.toList());
        }

        @Transactional(readOnly = true)
        public EmployeeCapacity getEmployeeCapacity(UUID employeeId, LocalDate asOfDate) {
                UUID tenantId = SecurityContext.getCurrentTenantId();
                Employee employee = employeeRepository.findById(employeeId)
                                .filter(e -> e.getTenantId().equals(tenantId))
                                .orElseThrow(() -> new ResourceNotFoundException("Employee not found"));

                List<ProjectEmployee> assignments = projectEmployeeRepository
                                .findAllByEmployeeIdAndTenantIdAndIsActive(employeeId, tenantId, true);
                List<AllocationApprovalRequest> pendingRequests = approvalRepository
                                .findAllByTenantIdAndStatus(tenantId, AllocationApprovalRequest.ApprovalStatus.PENDING,
                                                PageRequest.of(0, 10_000))
                                .getContent().stream()
                                .filter(r -> r.getEmployeeId().equals(employeeId))
                                .collect(Collectors.toList());

                int approvedAllocation = assignments.stream().mapToInt(ProjectEmployee::getAllocationPercentage).sum();
                int pendingAllocation = pendingRequests.stream()
                                .mapToInt(AllocationApprovalRequest::getRequestedAllocation)
                                .sum();
                int totalAllocation = approvedAllocation + pendingAllocation;

                List<AllocationBreakdown> breakdowns = new ArrayList<>();
                for (ProjectEmployee assignment : assignments) {
                        Project project = projectRepository.findById(assignment.getProjectId()).orElse(null);
                        breakdowns.add(AllocationBreakdown.builder()
                                        .projectId(assignment.getProjectId())
                                        .projectName(project != null ? project.getName() : "Unknown")
                                        .projectCode(project != null ? project.getProjectCode() : "N/A")
                                        .projectStatus(project != null ? project.getStatus().toString() : "UNKNOWN")
                                        .allocationPercentage(assignment.getAllocationPercentage())
                                        .role(assignment.getRole())
                                        .startDate(assignment.getStartDate().toString())
                                        .endDate(assignment.getEndDate() != null ? assignment.getEndDate().toString()
                                                        : null)
                                        .isActive(true)
                                        .isPendingApproval(false)
                                        .build());
                }

                for (AllocationApprovalRequest request : pendingRequests) {
                        Project project = projectRepository.findById(request.getProjectId()).orElse(null);
                        breakdowns.add(AllocationBreakdown.builder()
                                        .projectId(request.getProjectId())
                                        .projectName(project != null ? project.getName() : "Unknown")
                                        .projectCode(project != null ? project.getProjectCode() : "N/A")
                                        .projectStatus(project != null ? project.getStatus().toString() : "UNKNOWN")
                                        .allocationPercentage(request.getRequestedAllocation())
                                        .role(request.getRole())
                                        .startDate(request.getStartDate().toString())
                                        .endDate(request.getEndDate() != null ? request.getEndDate().toString() : null)
                                        .isActive(false)
                                        .isPendingApproval(true)
                                        .build());
                }

                String departmentName = employee.getDepartmentId() != null
                                ? departmentRepository.findById(employee.getDepartmentId())
                                                .map(d -> d.getName())
                                                .orElse("N/A")
                                : "N/A";

                return EmployeeCapacity.builder()
                                .employeeId(employeeId)
                                .employeeName(employee.getFullName())
                                .employeeCode(employee.getEmployeeCode())
                                .departmentId(employee.getDepartmentId())
                                .departmentName(departmentName)
                                .designation(employee.getDesignation())
                                .totalAllocation(totalAllocation)
                                .approvedAllocation(approvedAllocation)
                                .pendingAllocation(pendingAllocation)
                                .availableCapacity(100 - totalAllocation)
                                .isOverAllocated(totalAllocation > 100)
                                .hasPendingApprovals(!pendingRequests.isEmpty())
                                .allocationStatus(calculateStatus(totalAllocation))
                                .allocations(breakdowns)
                                .effectiveDate(asOfDate.toString())
                                .build();
        }

        private AllocationStatus calculateStatus(int allocation) {
                if (allocation > 100)
                        return AllocationStatus.OVER_ALLOCATED;
                if (allocation >= 75)
                        return AllocationStatus.OPTIMAL;
                if (allocation > 0)
                        return AllocationStatus.UNDER_UTILIZED;
                return AllocationStatus.UNASSIGNED;
        }

        // ============================================
        // ALLOCATION APPROVAL REQUESTS
        // ============================================

        @Transactional
        public AllocationApprovalResponse createAllocationRequest(CreateAllocationRequest request) {
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

                // Fetch display names for response
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

        private int getEmployeeAllocation(UUID employeeId) {
                UUID tenantId = SecurityContext.getCurrentTenantId();
                return projectEmployeeRepository.findAllByEmployeeIdAndTenantIdAndIsActive(employeeId, tenantId, true)
                                .stream().mapToInt(ProjectEmployee::getAllocationPercentage).sum();
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

                // Permission check: user must be a manager or have ALLOCATION:APPROVE permission
                validateApprovalPermission(approverId);

                AllocationApprovalRequest request = approvalRepository.findById(requestId)
                                .filter(r -> r.getTenantId().equals(tenantId))
                                .orElseThrow(() -> new ResourceNotFoundException("Request not found"));

                if (request.getStatus() != AllocationApprovalRequest.ApprovalStatus.PENDING) {
                        throw new IllegalStateException("Request is already " + request.getStatus());
                }

                // Cannot approve your own request
                if (request.getRequestedById().equals(approverId)) {
                        throw new IllegalStateException("Cannot approve your own allocation request");
                }

                request.setStatus(AllocationApprovalRequest.ApprovalStatus.APPROVED);
                request.setApproverId(approverId);
                request.setApprovalComment(comment);
                request.setResolvedAt(LocalDateTime.now());
                approvalRepository.save(request);

                // Actually create the assignment
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

                // Permission check: user must be a manager or have ALLOCATION:APPROVE permission
                validateApprovalPermission(approverId);

                AllocationApprovalRequest request = approvalRepository.findById(requestId)
                                .filter(r -> r.getTenantId().equals(tenantId))
                                .orElseThrow(() -> new ResourceNotFoundException("Request not found"));

                if (request.getStatus() != AllocationApprovalRequest.ApprovalStatus.PENDING) {
                        throw new IllegalStateException("Request is already " + request.getStatus());
                }

                // Cannot reject your own request
                if (request.getRequestedById().equals(approverId)) {
                        throw new IllegalStateException("Cannot reject your own allocation request");
                }

                request.setStatus(AllocationApprovalRequest.ApprovalStatus.REJECTED);
                request.setApproverId(approverId);
                request.setRejectionReason(reason);
                request.setResolvedAt(LocalDateTime.now());
                approvalRepository.save(request);
        }

        private void validateApprovalPermission(UUID approverId) {
                // Check if user has approval permission or is a manager
                boolean hasApprovalPermission = SecurityContext.hasAnyPermission(
                                com.hrms.common.security.Permission.ALLOCATION_APPROVE,
                                com.hrms.common.security.Permission.ALLOCATION_MANAGE,
                                com.hrms.common.security.Permission.PROJECT_MANAGE,
                                com.hrms.common.security.Permission.SYSTEM_ADMIN);

                boolean isManager = SecurityContext.isManager();

                if (!hasApprovalPermission && !isManager) {
                        throw new SecurityException(
                                        "You do not have permission to approve or reject allocation requests. "
                                                        + "Required: ALLOCATION:APPROVE permission or Manager role.");
                }
        }

        // ============================================
        // WORKLOAD DASHBOARD
        // ============================================

        @Transactional(readOnly = true)
        public WorkloadDashboardData getWorkloadDashboard(WorkloadFilterOptions filters) {
                UUID tenantId = SecurityContext.getCurrentTenantId();
                // Only include ACTIVE employees in workload dashboard
                List<Employee> allEmployees = employeeRepository.findByTenantId(tenantId).stream()
                                .filter(e -> e.getStatus() == Employee.EmployeeStatus.ACTIVE)
                                .collect(Collectors.toList());
                List<Project> activeProjects = projectRepository.findAllByTenantId(tenantId, PageRequest.of(0, 10_000))
                                .getContent();

                // First, map ALL active employees to workloads (before applying filters)
                // This ensures employees with no allocations are included
                List<EmployeeWorkload> allWorkloads = allEmployees.stream()
                                .map(emp -> getEmployeeWorkload(emp.getId()))
                                .collect(Collectors.toList());

                // Apply filters for display (but keep all for summary calculation)
                List<EmployeeWorkload> workloads = allWorkloads.stream()
                                .filter(wl -> applyFilters(wl, filters))
                                .collect(Collectors.toList());

                WorkloadSummary summary = calculateWorkloadSummary(workloads, activeProjects.size(), filters);

                List<DepartmentWorkload> deptWorkloads = departmentRepository.findByTenantId(tenantId).stream()
                                .map(dept -> calculateDepartmentWorkload(dept.getId(), dept.getName(), workloads))
                                .collect(Collectors.toList());

                // Calculate project workloads, heatmap, and trends
                List<ProjectWorkloadSummary> projectWorkloads = calculateProjectWorkloads(activeProjects, tenantId);
                List<WorkloadHeatmapRow> heatmapData = calculateHeatmapData(allEmployees, filters);
                List<WorkloadTrend> trends = calculateWorkloadTrends(allEmployees, tenantId);

                return WorkloadDashboardData.builder()
                                .summary(summary)
                                .employeeWorkloads(workloads)
                                .departmentWorkloads(deptWorkloads)
                                .projectWorkloads(projectWorkloads)
                                .heatmapData(heatmapData)
                                .trends(trends)
                                .build();
        }

        @Transactional(readOnly = true)
        public EmployeeWorkload getEmployeeWorkload(UUID employeeId) {
                EmployeeCapacity capacity = getEmployeeCapacity(employeeId, LocalDate.now());
                return EmployeeWorkload.builder()
                                .employeeId(employeeId)
                                .employeeName(capacity.getEmployeeName())
                                .employeeCode(capacity.getEmployeeCode())
                                .departmentId(capacity.getDepartmentId())
                                .departmentName(capacity.getDepartmentName())
                                .designation(capacity.getDesignation())
                                .totalAllocation(capacity.getTotalAllocation())
                                .approvedAllocation(capacity.getApprovedAllocation())
                                .pendingAllocation(capacity.getPendingAllocation())
                                .allocationStatus(capacity.getAllocationStatus())
                                .projectCount(capacity.getAllocations().size())
                                .allocations(capacity.getAllocations())
                                .hasPendingApprovals(capacity.getHasPendingApprovals())
                                .build();
        }

        private boolean applyFilters(EmployeeWorkload wl, WorkloadFilterOptions filters) {
                if (filters == null)
                        return true;
                if (filters.getDepartmentIds() != null && !filters.getDepartmentIds().isEmpty()
                                && !filters.getDepartmentIds().contains(wl.getDepartmentId()))
                        return false;
                if (filters.getAllocationStatus() != null && !filters.getAllocationStatus().isEmpty()
                                && !filters.getAllocationStatus().contains(wl.getAllocationStatus()))
                        return false;
                if (filters.getMinAllocation() != null && wl.getTotalAllocation() < filters.getMinAllocation())
                        return false;
                if (filters.getMaxAllocation() != null && wl.getTotalAllocation() > filters.getMaxAllocation())
                        return false;
                return true;
        }

        private WorkloadSummary calculateWorkloadSummary(List<EmployeeWorkload> workloads, int projectCount,
                        WorkloadFilterOptions filters) {
                if (workloads.isEmpty())
                        return WorkloadSummary.builder()
                                        .totalEmployees(0).activeProjects(projectCount).averageAllocation(0.0)
                                        .medianAllocation(0.0)
                                        .overAllocatedCount(0).optimalCount(0).underUtilizedCount(0).unassignedCount(0)
                                        .pendingApprovals(0).totalAllocatedHours(0L)
                                        .periodStart(filters != null ? filters.getStartDate() : LocalDate.now())
                                        .periodEnd(filters != null ? filters.getEndDate()
                                                        : LocalDate.now().plusMonths(1))
                                        .build();

                double avg = workloads.stream().mapToInt(EmployeeWorkload::getTotalAllocation).average().orElse(0.0);
                int over = (int) workloads.stream()
                                .filter(w -> w.getAllocationStatus() == AllocationStatus.OVER_ALLOCATED)
                                .count();
                int optimal = (int) workloads.stream().filter(w -> w.getAllocationStatus() == AllocationStatus.OPTIMAL)
                                .count();
                int under = (int) workloads.stream()
                                .filter(w -> w.getAllocationStatus() == AllocationStatus.UNDER_UTILIZED)
                                .count();
                int unassigned = (int) workloads.stream()
                                .filter(w -> w.getAllocationStatus() == AllocationStatus.UNASSIGNED)
                                .count();
                int pending = (int) workloads.stream().filter(EmployeeWorkload::getHasPendingApprovals).count();

                return WorkloadSummary.builder()
                                .totalEmployees(workloads.size())
                                .activeProjects(projectCount)
                                .averageAllocation(avg)
                                .medianAllocation(avg) // Simplification
                                .overAllocatedCount(over)
                                .optimalCount(optimal)
                                .underUtilizedCount(under)
                                .unassignedCount(unassigned)
                                .pendingApprovals(pending)
                                .totalAllocatedHours((long) (avg * workloads.size() * 1.6)) // Rough heuristic
                                .periodStart(filters != null ? filters.getStartDate() : LocalDate.now())
                                .periodEnd(filters != null ? filters.getEndDate() : LocalDate.now().plusMonths(1))
                                .build();
        }

        private List<ProjectWorkloadSummary> calculateProjectWorkloads(List<Project> projects, UUID tenantId) {
                return projects.stream().map(project -> {
                        List<ProjectEmployee> assignments = projectEmployeeRepository
                                        .findAllByProjectIdAndTenantIdAndIsActive(project.getId(), tenantId, true);

                        int teamSize = assignments.size();
                        int totalAllocatedPercentage = assignments.stream()
                                        .mapToInt(ProjectEmployee::getAllocationPercentage)
                                        .sum();
                        double averageAllocation = teamSize > 0 ? (double) totalAllocatedPercentage / teamSize : 0.0;

                        return ProjectWorkloadSummary.builder()
                                        .projectId(project.getId())
                                        .projectName(project.getName())
                                        .projectCode(project.getProjectCode())
                                        .projectStatus(project.getStatus().name())
                                        .teamSize(teamSize)
                                        .totalAllocatedPercentage(totalAllocatedPercentage)
                                        .averageAllocation(averageAllocation)
                                        .startDate(project.getStartDate())
                                        .endDate(project.getEndDate())
                                        .build();
                }).collect(Collectors.toList());
        }

        private List<WorkloadHeatmapRow> calculateHeatmapData(List<Employee> employees, WorkloadFilterOptions filters) {
                LocalDate startDate = filters != null && filters.getStartDate() != null
                                ? filters.getStartDate()
                                : LocalDate.now();
                LocalDate endDate = filters != null && filters.getEndDate() != null
                                ? filters.getEndDate()
                                : LocalDate.now().plusWeeks(4);

                // Limit to first 20 employees for dashboard heatmap
                List<Employee> limitedEmployees = employees.stream().limit(20).collect(Collectors.toList());

                return limitedEmployees.stream().map(emp -> {
                        List<WorkloadHeatmapCell> cells = new ArrayList<>();
                        for (LocalDate date = startDate; !date.isAfter(endDate); date = date.plusWeeks(1)) {
                                LocalDate weekStart = date;
                                LocalDate weekEnd = date.plusDays(6).isAfter(endDate) ? endDate : date.plusDays(6);
                                EmployeeCapacity cap = getEmployeeCapacity(emp.getId(), weekStart);
                                cells.add(WorkloadHeatmapCell.builder()
                                                .weekStart(weekStart)
                                                .weekEnd(weekEnd)
                                                .allocation(cap.getTotalAllocation())
                                                .status(cap.getAllocationStatus())
                                                .projectCount(cap.getAllocations().size())
                                                .build());
                        }

                        String deptName = emp.getDepartmentId() != null
                                        ? departmentRepository.findById(emp.getDepartmentId())
                                                        .map(d -> d.getName())
                                                        .orElse("N/A")
                                        : "N/A";

                        return WorkloadHeatmapRow.builder()
                                        .employeeId(emp.getId())
                                        .employeeName(emp.getFullName())
                                        .employeeCode(emp.getEmployeeCode())
                                        .departmentName(deptName)
                                        .cells(cells)
                                        .build();
                }).collect(Collectors.toList());
        }

        private List<WorkloadTrend> calculateWorkloadTrends(List<Employee> employees, UUID tenantId) {
                List<WorkloadTrend> trends = new ArrayList<>();
                LocalDate today = LocalDate.now();

                // Generate trends for last 6 months
                for (int i = 5; i >= 0; i--) {
                        LocalDate monthStart = today.minusMonths(i).withDayOfMonth(1);
                        String period = monthStart.getYear() + "-" + String.format("%02d", monthStart.getMonthValue());
                        String periodLabel = monthStart.getMonth().toString().substring(0, 3) + " "
                                        + monthStart.getYear();

                        // Calculate workload for each employee as of that month
                        int overCount = 0, optimalCount = 0, underCount = 0;
                        double totalAllocation = 0;

                        for (Employee emp : employees) {
                                EmployeeCapacity capacity = getEmployeeCapacity(emp.getId(), monthStart);
                                totalAllocation += capacity.getTotalAllocation();

                                switch (capacity.getAllocationStatus()) {
                                        case OVER_ALLOCATED:
                                                overCount++;
                                                break;
                                        case OPTIMAL:
                                                optimalCount++;
                                                break;
                                        case UNDER_UTILIZED:
                                        case UNASSIGNED:
                                                underCount++;
                                                break;
                                }
                        }

                        double avgAllocation = employees.isEmpty() ? 0 : totalAllocation / employees.size();

                        trends.add(WorkloadTrend.builder()
                                        .period(period)
                                        .periodLabel(periodLabel)
                                        .averageAllocation(avgAllocation)
                                        .overAllocatedCount(overCount)
                                        .optimalCount(optimalCount)
                                        .underUtilizedCount(underCount)
                                        .totalEmployees(employees.size())
                                        .build());
                }

                return trends;
        }

        private DepartmentWorkload calculateDepartmentWorkload(UUID departmentId, String name,
                        List<EmployeeWorkload> allWorkloads) {
                List<EmployeeWorkload> deptWorkloads = allWorkloads.stream()
                                .filter(w -> departmentId.equals(w.getDepartmentId()))
                                .collect(Collectors.toList());

                if (deptWorkloads.isEmpty())
                        return DepartmentWorkload.builder()
                                        .departmentId(departmentId).departmentName(name).employeeCount(0)
                                        .averageAllocation(0.0)
                                        .overAllocatedCount(0).optimalCount(0).underUtilizedCount(0).unassignedCount(0)
                                        .activeProjects(0).totalAllocatedHours(0L).build();

                double avg = deptWorkloads.stream().mapToInt(EmployeeWorkload::getTotalAllocation).average()
                                .orElse(0.0);
                int over = (int) deptWorkloads.stream()
                                .filter(w -> w.getAllocationStatus() == AllocationStatus.OVER_ALLOCATED)
                                .count();

                return DepartmentWorkload.builder()
                                .departmentId(departmentId)
                                .departmentName(name)
                                .employeeCount(deptWorkloads.size())
                                .averageAllocation(avg)
                                .overAllocatedCount(over)
                                .optimalCount((int) deptWorkloads.stream()
                                                .filter(w -> w.getAllocationStatus() == AllocationStatus.OPTIMAL)
                                                .count())
                                .underUtilizedCount((int) deptWorkloads.stream()
                                                .filter(w -> w.getAllocationStatus() == AllocationStatus.UNDER_UTILIZED)
                                                .count())
                                .unassignedCount((int) deptWorkloads.stream()
                                                .filter(w -> w.getAllocationStatus() == AllocationStatus.UNASSIGNED)
                                                .count())
                                .activeProjects(deptWorkloads.stream().mapToInt(EmployeeWorkload::getProjectCount)
                                                .sum())
                                .totalAllocatedHours((long) (avg * deptWorkloads.size() * 1.6))
                                .build();
        }

        @Transactional(readOnly = true)
        public Page<EmployeeWorkload> getEmployeeWorkloads(WorkloadFilterOptions filters, Pageable pageable) {
                WorkloadDashboardData dashboardData = getWorkloadDashboard(filters);
                List<EmployeeWorkload> workloads = dashboardData.getEmployeeWorkloads();
                int start = (int) pageable.getOffset();
                int end = Math.min((start + pageable.getPageSize()), workloads.size());
                if (start > workloads.size())
                        return new PageImpl<>(Collections.emptyList(), pageable, workloads.size());
                return new PageImpl<>(workloads.subList(start, end), pageable, workloads.size());
        }

        @Transactional(readOnly = true)
        public List<DepartmentWorkload> getDepartmentWorkloads(LocalDate startDate, LocalDate endDate) {
                WorkloadFilterOptions filters = new WorkloadFilterOptions();
                filters.setStartDate(startDate);
                filters.setEndDate(endDate);
                return getWorkloadDashboard(filters).getDepartmentWorkloads();
        }

        @Transactional(readOnly = true)
        public List<WorkloadHeatmapRow> getWorkloadHeatmap(LocalDate startDate, LocalDate endDate, UUID departmentId,
                        Integer limit) {
                UUID tenantId = SecurityContext.getCurrentTenantId();
                List<Employee> employees = departmentId != null
                                ? employeeRepository.findByTenantId(tenantId).stream()
                                                .filter(e -> departmentId.equals(e.getDepartmentId()))
                                                .limit(limit != null ? limit : 50).collect(Collectors.toList())
                                : employeeRepository.findByTenantId(tenantId).stream()
                                                .limit(limit != null ? limit : 50).collect(Collectors.toList());

                List<WorkloadHeatmapRow> heatmapRows = employees.stream().map(emp -> {
                        List<WorkloadHeatmapCell> cells = new ArrayList<>();
                        for (LocalDate date = startDate; !date.isAfter(endDate); date = date.plusWeeks(1)) {
                                LocalDate weekStart = date;
                                LocalDate weekEnd = date.plusDays(6).isAfter(endDate) ? endDate : date.plusDays(6);
                                EmployeeCapacity cap = getEmployeeCapacity(emp.getId(), weekStart);
                                cells.add(WorkloadHeatmapCell.builder()
                                                .weekStart(weekStart)
                                                .weekEnd(weekEnd)
                                                .allocation(cap.getTotalAllocation())
                                                .status(cap.getAllocationStatus())
                                                .projectCount(cap.getAllocations().size())
                                                .build());
                        }

                        String deptName = emp.getDepartmentId() != null
                                        ? departmentRepository.findById(emp.getDepartmentId())
                                                        .map(d -> d.getName())
                                                        .orElse("N/A")
                                        : "N/A";

                        return WorkloadHeatmapRow.builder()
                                        .employeeId(emp.getId())
                                        .employeeName(emp.getFullName())
                                        .employeeCode(emp.getEmployeeCode())
                                        .departmentName(deptName)
                                        .cells(cells)
                                        .build();
                }).collect(Collectors.toList());

                return heatmapRows;
        }

        public List<com.hrms.api.resourcemanagement.dto.AvailabilityDTOs.Holiday> getHolidays(LocalDate startDate,
                        LocalDate endDate) {
                UUID tenantId = SecurityContext.getCurrentTenantId();
                return holidayRepository.findAllByTenantIdAndHolidayDateBetween(tenantId, startDate, endDate).stream()
                                .map(h -> com.hrms.api.resourcemanagement.dto.AvailabilityDTOs.Holiday.builder()
                                                .id(h.getId().toString())
                                                .name(h.getHolidayName())
                                                .date(h.getHolidayDate())
                                                .isOptional(h.getIsOptional())
                                                .build())
                                .collect(Collectors.toList());
        }

        @Transactional(readOnly = true)
        public TeamAvailabilityView getAggregatedAvailability(LocalDate startDate, LocalDate endDate,
                        UUID departmentId) {
                return getTeamAvailability(departmentId != null ? Collections.singletonList(departmentId) : null,
                                startDate, endDate);
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

        @Transactional(readOnly = true)
        public EmployeeAvailability getEmployeeAvailability(UUID employeeId, LocalDate startDate, LocalDate endDate) {
                UUID tenantId = SecurityContext.getCurrentTenantId();
                Employee employee = employeeRepository.findById(employeeId)
                                .filter(e -> e.getTenantId().equals(tenantId))
                                .orElseThrow(() -> new ResourceNotFoundException("Employee not found"));

                List<ProjectEmployee> projectAssignments = projectEmployeeRepository
                                .findAllByEmployeeIdAndTenantIdAndIsActive(employeeId, tenantId, true);
                List<LeaveRequest> leaves = (List<LeaveRequest>) leaveRequestRepository.findOverlappingLeaves(tenantId,
                                employeeId, startDate, endDate);
                List<Holiday> holidays = holidayRepository.findAllByTenantIdAndHolidayDateBetween(tenantId, startDate,
                                endDate);

                List<ResourceAvailabilityDay> days = new ArrayList<>();
                long totalDays = ChronoUnit.DAYS.between(startDate, endDate) + 1;
                int workingDays = 0, availableDays = 0, partialDays = 0, fullyAllocatedDays = 0, leaveDays = 0,
                                holidayCount = 0;
                int totalCapacitySum = 0;

                for (LocalDate date = startDate; !date.isAfter(endDate); date = date.plusDays(1)) {
                        boolean isWeekend = date.getDayOfWeek() == DayOfWeek.SATURDAY
                                        || date.getDayOfWeek() == DayOfWeek.SUNDAY;
                        final LocalDate currentDate = date;
                        Optional<Holiday> holiday = holidays.stream()
                                        .filter(h -> h.getHolidayDate().equals(currentDate))
                                        .findFirst();
                        List<LeaveRequest> dayLeaves = leaves.stream()
                                        .filter(l -> !currentDate.isBefore(l.getStartDate())
                                                        && !currentDate.isAfter(l.getEndDate()))
                                        .collect(Collectors.toList());
                        List<ProjectEmployee> dayProjects = projectAssignments.stream()
                                        .filter(p -> !currentDate.isBefore(p.getStartDate())
                                                        && (p.getEndDate() == null
                                                                        || !currentDate.isAfter(p.getEndDate())))
                                        .collect(Collectors.toList());

                        int allocatedCapacity = dayProjects.stream().mapToInt(ProjectEmployee::getAllocationPercentage)
                                        .sum();
                        boolean onLeave = !dayLeaves.isEmpty();
                        boolean isHoliday = holiday.isPresent();

                        AvailabilityStatus status = AvailabilityStatus.AVAILABLE;
                        if (onLeave) {
                                status = AvailabilityStatus.ON_LEAVE;
                                leaveDays++;
                        } else if (isHoliday) {
                                status = AvailabilityStatus.HOLIDAY;
                                holidayCount++;
                        } else if (isWeekend) {
                                status = AvailabilityStatus.HOLIDAY; // Simulating weekend as holiday for simplicity
                        } else {
                                workingDays++;
                                if (allocatedCapacity >= 100) {
                                        status = AvailabilityStatus.ALLOCATED;
                                        fullyAllocatedDays++;
                                } else if (allocatedCapacity > 0) {
                                        status = AvailabilityStatus.PARTIAL;
                                        partialDays++;
                                } else {
                                        availableDays++;
                                }
                        }

                        totalCapacitySum += (100 - allocatedCapacity);

                        List<ResourceCalendarEvent> events = new ArrayList<>();
                        for (ProjectEmployee p : dayProjects) {
                                Project proj = projectRepository.findById(p.getProjectId()).orElse(null);
                                events.add(ResourceCalendarEvent.builder()
                                                .id(p.getId().toString())
                                                .type(CalendarEventType.PROJECT_ASSIGNMENT)
                                                .title(proj != null ? proj.getName() : "Project")
                                                .startDate(currentDate)
                                                .endDate(currentDate)
                                                .allocationPercentage(p.getAllocationPercentage())
                                                .projectId(p.getProjectId())
                                                .projectName(proj != null ? proj.getName() : "Project")
                                                .color("#3b82f6")
                                                .isAllDay(true)
                                                .build());
                        }
                        for (LeaveRequest l : dayLeaves) {
                                events.add(ResourceCalendarEvent.builder()
                                                .id(l.getId().toString())
                                                .type(CalendarEventType.LEAVE_APPROVED)
                                                .title("Leave: " + l.getReason())
                                                .startDate(currentDate)
                                                .endDate(currentDate)
                                                .leaveStatus(l.getStatus().toString())
                                                .color("#8b5cf6")
                                                .isAllDay(true)
                                                .build());
                        }
                        if (holiday.isPresent()) {
                                events.add(ResourceCalendarEvent.builder()
                                                .id(holiday.get().getId().toString())
                                                .type(CalendarEventType.HOLIDAY)
                                                .title(holiday.get().getHolidayName())
                                                .startDate(currentDate)
                                                .endDate(currentDate)
                                                .color("#6b7280")
                                                .isAllDay(true)
                                                .build());
                        }

                        days.add(ResourceAvailabilityDay.builder()
                                        .date(currentDate)
                                        .dayOfWeek(currentDate.getDayOfWeek().getValue())
                                        .isWeekend(isWeekend)
                                        .isHoliday(isHoliday)
                                        .holidayName(holiday.map(Holiday::getHolidayName).orElse(null))
                                        .status(status)
                                        .allocatedCapacity(allocatedCapacity)
                                        .availableCapacity(100 - allocatedCapacity)
                                        .events(events)
                                        .build());
                }

                AvailabilitySummary summary = AvailabilitySummary.builder()
                                .periodStart(startDate)
                                .periodEnd(endDate)
                                .totalDays((int) totalDays)
                                .workingDays(workingDays)
                                .availableDays(availableDays)
                                .partialDays(partialDays)
                                .fullyAllocatedDays(fullyAllocatedDays)
                                .leaveDays(leaveDays)
                                .holidays(holidayCount)
                                .averageAvailability(workingDays > 0 ? (double) totalCapacitySum / workingDays : 0.0)
                                .build();

                String departmentName = employee.getDepartmentId() != null
                                ? departmentRepository.findById(employee.getDepartmentId())
                                        .map(d -> d.getName())
                                        .orElse("N/A")
                                : "N/A";

                return EmployeeAvailability.builder()
                                .employeeId(employeeId)
                                .employeeName(employee.getFullName())
                                .employeeCode(employee.getEmployeeCode())
                                .departmentId(employee.getDepartmentId())
                                .departmentName(departmentName)
                                .designation(employee.getDesignation())
                                .availability(days)
                                .summary(summary)
                                .build();
        }

        @Transactional(readOnly = true)
        public TeamAvailabilityView getTeamAvailability(ResourceCalendarFilter filter) {
                if (filter == null) {
                        return getTeamAvailability(null, LocalDate.now(), LocalDate.now().plusMonths(1));
                }
                // Map filter to the existing method
                return getTeamAvailability(filter.getDepartmentIds(),
                                filter.getStartDate() != null ? filter.getStartDate() : LocalDate.now(),
                                filter.getEndDate() != null ? filter.getEndDate() : LocalDate.now().plusMonths(1));
        }

        @Transactional(readOnly = true)
        public TeamAvailabilityView getTeamAvailability(List<UUID> departmentIds, LocalDate startDate,
                        LocalDate endDate) {
                UUID tenantId = SecurityContext.getCurrentTenantId();
                List<Employee> employees;
                if (departmentIds == null || departmentIds.isEmpty()) {
                        employees = employeeRepository.findByTenantId(tenantId);
                } else {
                        employees = employeeRepository.findByTenantId(tenantId).stream()
                                        .filter(e -> departmentIds.contains(e.getDepartmentId()))
                                        .collect(Collectors.toList());
                }

                List<EmployeeAvailability> employeeAvails = employees.stream()
                                .map(e -> getEmployeeAvailability(e.getId(), startDate, endDate))
                                .collect(Collectors.toList());

                List<AggregatedAvailability> aggregated = new ArrayList<>();
                for (LocalDate date = startDate; !date.isAfter(endDate); date = date.plusDays(1)) {
                        final LocalDate currentDate = date;
                        List<ResourceAvailabilityDay> dayAvails = employeeAvails.stream()
                                        .flatMap(ea -> ea.getAvailability().stream())
                                        .filter(d -> d.getDate().equals(currentDate))
                                        .collect(Collectors.toList());

                        int total = dayAvails.size();
                        int avail = (int) dayAvails.stream().filter(d -> d.getStatus() == AvailabilityStatus.AVAILABLE)
                                        .count();
                        int partial = (int) dayAvails.stream().filter(d -> d.getStatus() == AvailabilityStatus.PARTIAL)
                                        .count();
                        int fully = (int) dayAvails.stream().filter(d -> d.getStatus() == AvailabilityStatus.ALLOCATED)
                                        .count();
                        int onLeave = (int) dayAvails.stream().filter(d -> d.getStatus() == AvailabilityStatus.ON_LEAVE)
                                        .count();
                        double avgCap = dayAvails.stream().mapToInt(ResourceAvailabilityDay::getAvailableCapacity)
                                        .average()
                                        .orElse(0.0);

                        aggregated.add(AggregatedAvailability.builder()
                                        .date(currentDate)
                                        .totalEmployees(total)
                                        .availableCount(avail)
                                        .partialCount(partial)
                                        .fullyAllocatedCount(fully)
                                        .onLeaveCount(onLeave)
                                        .averageCapacity(avgCap)
                                        .build());
                }

                return TeamAvailabilityView.builder()
                                .employees(employeeAvails)
                                .periodStart(startDate)
                                .periodEnd(endDate)
                                .aggregatedAvailability(aggregated)
                                .build();
        }

        @Transactional(readOnly = true)
        public byte[] exportWorkloadReport(String format, WorkloadFilterOptions filters) {
                WorkloadDashboardData data = getWorkloadDashboard(filters);

                String normalizedFormat = format != null ? format.toLowerCase().trim() : "csv";

                switch (normalizedFormat) {
                        case "csv":
                                return exportWorkloadAsCsv(data);
                        case "xlsx":
                        case "excel":
                                log.warn("Excel workload export requested but not implemented; falling back to CSV");
                                return exportWorkloadAsCsv(data);
                        case "pdf":
                                log.warn("PDF workload export requested but not implemented; falling back to CSV");
                                return exportWorkloadAsCsv(data);
                        default:
                                throw new IllegalArgumentException(
                                                "Unsupported export format: " + format + ". Supported formats: csv");
                }
        }

        private byte[] exportWorkloadAsCsv(WorkloadDashboardData data) {
                StringBuilder csv = new StringBuilder();

                // Header
                csv.append("Employee,Employee Code,Department,Designation,Total Allocation,Approved Allocation,");
                csv.append("Pending Allocation,Status,Project Count,Has Pending Approvals\n");

                // Employee workloads
                for (EmployeeWorkload wl : data.getEmployeeWorkloads()) {
                        csv.append(String.format("\"%s\",\"%s\",\"%s\",\"%s\",%d%%,%d%%,%d%%,\"%s\",%d,%s\n",
                                        escapeForCsv(wl.getEmployeeName()),
                                        escapeForCsv(wl.getEmployeeCode()),
                                        escapeForCsv(wl.getDepartmentName()),
                                        escapeForCsv(wl.getDesignation()),
                                        wl.getTotalAllocation(),
                                        wl.getApprovedAllocation(),
                                        wl.getPendingAllocation(),
                                        wl.getAllocationStatus(),
                                        wl.getProjectCount(),
                                        wl.getHasPendingApprovals()));
                }

                // Add summary section
                WorkloadSummary summary = data.getSummary();
                csv.append("\n--- Summary ---\n");
                csv.append(String.format("Total Employees,%d\n", summary.getTotalEmployees()));
                csv.append(String.format("Active Projects,%d\n", summary.getActiveProjects()));
                csv.append(String.format("Average Allocation,%.1f%%\n", summary.getAverageAllocation()));
                csv.append(String.format("Over-Allocated,%d\n", summary.getOverAllocatedCount()));
                csv.append(String.format("Optimal,%d\n", summary.getOptimalCount()));
                csv.append(String.format("Under-Utilized,%d\n", summary.getUnderUtilizedCount()));
                csv.append(String.format("Unassigned,%d\n", summary.getUnassignedCount()));
                csv.append(String.format("Pending Approvals,%d\n", summary.getPendingApprovals()));

                return csv.toString().getBytes();
        }

        private String escapeForCsv(String value) {
                if (value == null) {
                        return "";
                }
                return value.replace("\"", "\"\"");
        }

        private AllocationApprovalResponse mapToApprovalResponse(AllocationApprovalRequest request) {
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
