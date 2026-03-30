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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

import static com.hrms.api.resourcemanagement.dto.AllocationDTOs.*;
import static com.hrms.api.resourcemanagement.dto.ApprovalDTOs.*;
import static com.hrms.api.resourcemanagement.dto.WorkloadDTOs.*;
import static com.hrms.api.resourcemanagement.dto.AvailabilityDTOs.*;

/**
 * Facade for resource management. Owns core capacity and availability logic.
 * Delegates approval workflow to {@link AllocationApprovalService} and
 * analytics/dashboard concerns to {@link WorkloadAnalyticsService}.
 *
 * <p>No controller changes are required — all public method signatures are preserved.
 */
@Service
@RequiredArgsConstructor
public class ResourceManagementService {

        private final EmployeeRepository employeeRepository;
        private final ProjectEmployeeRepository projectEmployeeRepository;
        private final HrmsProjectRepository projectRepository;
        private final AllocationApprovalRequestRepository approvalRepository;
        private final DepartmentRepository departmentRepository;
        private final HolidayRepository holidayRepository;
        private final LeaveRequestRepository leaveRequestRepository;

        // Sub-services
        private final AllocationApprovalService allocationApprovalService;
        private final WorkloadAnalyticsService workloadAnalyticsService;

        // ============================================
        // CAPACITY & ALLOCATION (CORE)
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

                List<ProjectEmployee> existingProjectAllocations = projectEmployeeRepository
                                .findAllByEmployeeIdAndTenantIdAndIsActive(employeeId, tenantId, true)
                                .stream()
                                .filter(pe -> pe.getProjectId().equals(projectId))
                                .filter(pe -> {
                                        LocalDate peStart = pe.getStartDate();
                                        LocalDate peEnd = pe.getEndDate() != null ? pe.getEndDate() : LocalDate.MAX;
                                        LocalDate reqEnd = endDate != null ? endDate : LocalDate.MAX;
                                        return !startDate.isAfter(peEnd) && !reqEnd.isBefore(peStart);
                                })
                                .collect(Collectors.toList());

                boolean hasOverlappingAllocation = !existingProjectAllocations.isEmpty();
                int existingAllocationForProject = existingProjectAllocations.stream()
                                .mapToInt(ProjectEmployee::getAllocationPercentage)
                                .sum();

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
        public List<EmployeeCapacity> getAvailableEmployees(Integer minCapacity, UUID departmentId,
                        Pageable pageable) {
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

                int approvedAllocation = assignments.stream()
                                .mapToInt(ProjectEmployee::getAllocationPercentage).sum();
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
                                        .endDate(assignment.getEndDate() != null
                                                        ? assignment.getEndDate().toString()
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
                                        .endDate(request.getEndDate() != null
                                                        ? request.getEndDate().toString()
                                                        : null)
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

        @Transactional(readOnly = true)
        public EmployeeAvailability getEmployeeAvailability(UUID employeeId, LocalDate startDate,
                        LocalDate endDate) {
                UUID tenantId = SecurityContext.getCurrentTenantId();
                Employee employee = employeeRepository.findById(employeeId)
                                .filter(e -> e.getTenantId().equals(tenantId))
                                .orElseThrow(() -> new ResourceNotFoundException("Employee not found"));

                List<ProjectEmployee> projectAssignments = projectEmployeeRepository
                                .findAllByEmployeeIdAndTenantIdAndIsActive(employeeId, tenantId, true);
                List<LeaveRequest> leaves = (List<LeaveRequest>) leaveRequestRepository
                                .findOverlappingLeaves(tenantId, employeeId, startDate, endDate);
                List<Holiday> holidays = holidayRepository.findAllByTenantIdAndHolidayDateBetween(tenantId,
                                startDate, endDate);

                List<ResourceAvailabilityDay> days = new ArrayList<>();
                long totalDays = ChronoUnit.DAYS.between(startDate, endDate) + 1;
                int workingDays = 0, availableDays = 0, partialDays = 0, fullyAllocatedDays = 0,
                                leaveDays = 0, holidayCount = 0;
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

                        int allocatedCapacity = dayProjects.stream()
                                        .mapToInt(ProjectEmployee::getAllocationPercentage).sum();
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
                                status = AvailabilityStatus.HOLIDAY;
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
                                .averageAvailability(
                                                workingDays > 0 ? (double) totalCapacitySum / workingDays : 0.0)
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
                return getTeamAvailability(filter.getDepartmentIds(),
                                filter.getStartDate() != null ? filter.getStartDate() : LocalDate.now(),
                                filter.getEndDate() != null ? filter.getEndDate()
                                                : LocalDate.now().plusMonths(1));
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
                        int avail = (int) dayAvails.stream()
                                        .filter(d -> d.getStatus() == AvailabilityStatus.AVAILABLE).count();
                        int partial = (int) dayAvails.stream()
                                        .filter(d -> d.getStatus() == AvailabilityStatus.PARTIAL).count();
                        int fully = (int) dayAvails.stream()
                                        .filter(d -> d.getStatus() == AvailabilityStatus.ALLOCATED).count();
                        int onLeave = (int) dayAvails.stream()
                                        .filter(d -> d.getStatus() == AvailabilityStatus.ON_LEAVE).count();
                        double avgCap = dayAvails.stream()
                                        .mapToInt(ResourceAvailabilityDay::getAvailableCapacity)
                                        .average().orElse(0.0);

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

        // ============================================
        // FACADE: APPROVAL WORKFLOW — delegates to AllocationApprovalService
        // ============================================

        @Transactional
        public AllocationApprovalResponse createAllocationRequest(CreateAllocationRequest request) {
                return allocationApprovalService.createAllocationRequest(request);
        }

        @Transactional(readOnly = true)
        public AllocationApprovalResponse getAllocationRequest(UUID requestId) {
                return allocationApprovalService.getAllocationRequest(requestId);
        }

        @Transactional(readOnly = true)
        public Page<AllocationApprovalResponse> getAllPendingRequests(UUID departmentId, Pageable pageable) {
                return allocationApprovalService.getAllPendingRequests(departmentId, pageable);
        }

        @Transactional(readOnly = true)
        public Page<AllocationApprovalResponse> getEmployeeAllocationHistory(UUID employeeId, Pageable pageable) {
                return allocationApprovalService.getEmployeeAllocationHistory(employeeId, pageable);
        }

        @Transactional(readOnly = true)
        public long getPendingApprovalsCount() {
                return allocationApprovalService.getPendingApprovalsCount();
        }

        @Transactional
        public void approveAllocationRequest(UUID requestId, String comment) {
                allocationApprovalService.approveAllocationRequest(requestId, comment);
        }

        @Transactional
        public void rejectAllocationRequest(UUID requestId, String reason) {
                allocationApprovalService.rejectAllocationRequest(requestId, reason);
        }

        @Transactional(readOnly = true)
        public Page<AllocationApprovalResponse> getMyPendingApprovals(Pageable pageable) {
                return allocationApprovalService.getMyPendingApprovals(pageable);
        }

        // ============================================
        // FACADE: ANALYTICS & DASHBOARDS — delegates to WorkloadAnalyticsService
        // ============================================

        @Transactional(readOnly = true)
        public WorkloadDashboardData getWorkloadDashboard(WorkloadFilterOptions filters) {
                return workloadAnalyticsService.getWorkloadDashboard(filters);
        }

        @Transactional(readOnly = true)
        public Page<EmployeeWorkload> getEmployeeWorkloads(WorkloadFilterOptions filters, Pageable pageable) {
                return workloadAnalyticsService.getEmployeeWorkloads(filters, pageable);
        }

        @Transactional(readOnly = true)
        public List<DepartmentWorkload> getDepartmentWorkloads(LocalDate startDate, LocalDate endDate) {
                return workloadAnalyticsService.getDepartmentWorkloads(startDate, endDate);
        }

        @Transactional(readOnly = true)
        public List<WorkloadHeatmapRow> getWorkloadHeatmap(LocalDate startDate, LocalDate endDate,
                        UUID departmentId, Integer limit) {
                return workloadAnalyticsService.getWorkloadHeatmap(startDate, endDate, departmentId, limit);
        }

        public List<AvailabilityDTOs.Holiday> getHolidays(LocalDate startDate, LocalDate endDate) {
                return workloadAnalyticsService.getHolidays(startDate, endDate);
        }

        @Transactional(readOnly = true)
        public TeamAvailabilityView getAggregatedAvailability(LocalDate startDate, LocalDate endDate,
                        UUID departmentId) {
                return getTeamAvailability(
                                departmentId != null ? Collections.singletonList(departmentId) : null,
                                startDate, endDate);
        }

        @Transactional(readOnly = true)
        public byte[] exportWorkloadReport(String format, WorkloadFilterOptions filters) {
                return workloadAnalyticsService.exportWorkloadReport(format, filters);
        }

        // ============================================
        // PRIVATE HELPERS
        // ============================================

        private AllocationStatus calculateStatus(int allocation) {
                if (allocation > 100) return AllocationStatus.OVER_ALLOCATED;
                if (allocation >= 75) return AllocationStatus.OPTIMAL;
                if (allocation > 0) return AllocationStatus.UNDER_UTILIZED;
                return AllocationStatus.UNASSIGNED;
        }
}
