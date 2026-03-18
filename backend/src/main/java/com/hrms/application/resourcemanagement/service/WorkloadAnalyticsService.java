package com.hrms.application.resourcemanagement.service;

import com.hrms.api.resourcemanagement.dto.*;
import com.hrms.common.security.SecurityContext;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.project.Project;
import com.hrms.domain.project.ProjectEmployee;
import com.hrms.infrastructure.employee.repository.DepartmentRepository;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.attendance.repository.HolidayRepository;
import com.hrms.infrastructure.project.repository.HrmsProjectRepository;
import com.hrms.infrastructure.project.repository.ProjectEmployeeRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import static com.hrms.api.resourcemanagement.dto.AllocationDTOs.*;
import static com.hrms.api.resourcemanagement.dto.WorkloadDTOs.*;

/**
 * Handles workload dashboards, heatmaps, trends, department summaries,
 * and workload report exports.
 *
 * <p>This service depends on {@link ResourceManagementService} for
 * {@code getEmployeeCapacity} / {@code getEmployeeWorkload}. The dependency
 * is injected lazily to break the mutual reference cycle between the facade
 * and this sub-service.
 */
@Service
@Slf4j
public class WorkloadAnalyticsService {

    private final EmployeeRepository employeeRepository;
    private final HrmsProjectRepository projectRepository;
    private final ProjectEmployeeRepository projectEmployeeRepository;
    private final DepartmentRepository departmentRepository;
    private final HolidayRepository holidayRepository;

    /**
     * Lazy-injected to avoid Spring circular dependency:
     * ResourceManagementService → WorkloadAnalyticsService → ResourceManagementService.
     */
    private ResourceManagementService resourceManagementService;

    public WorkloadAnalyticsService(
            EmployeeRepository employeeRepository,
            HrmsProjectRepository projectRepository,
            ProjectEmployeeRepository projectEmployeeRepository,
            DepartmentRepository departmentRepository,
            HolidayRepository holidayRepository) {
        this.employeeRepository = employeeRepository;
        this.projectRepository = projectRepository;
        this.projectEmployeeRepository = projectEmployeeRepository;
        this.departmentRepository = departmentRepository;
        this.holidayRepository = holidayRepository;
    }

    @Autowired
    public void setResourceManagementService(@Lazy ResourceManagementService resourceManagementService) {
        this.resourceManagementService = resourceManagementService;
    }

    // ============================================
    // WORKLOAD DASHBOARD
    // ============================================

    @Transactional(readOnly = true)
    public WorkloadDashboardData getWorkloadDashboard(WorkloadFilterOptions filters) {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        List<Employee> allEmployees = employeeRepository.findByTenantId(tenantId).stream()
                .filter(e -> e.getStatus() == Employee.EmployeeStatus.ACTIVE)
                .collect(Collectors.toList());
        List<Project> activeProjects = projectRepository
                .findAllByTenantId(tenantId, PageRequest.of(0, 10_000))
                .getContent();

        List<EmployeeWorkload> allWorkloads = allEmployees.stream()
                .map(emp -> resourceManagementService.getEmployeeWorkload(emp.getId()))
                .collect(Collectors.toList());

        List<EmployeeWorkload> workloads = allWorkloads.stream()
                .filter(wl -> applyFilters(wl, filters))
                .collect(Collectors.toList());

        WorkloadSummary summary = calculateWorkloadSummary(workloads, activeProjects.size(), filters);

        List<DepartmentWorkload> deptWorkloads = departmentRepository.findByTenantId(tenantId).stream()
                .map(dept -> calculateDepartmentWorkload(dept.getId(), dept.getName(), workloads))
                .collect(Collectors.toList());

        List<ProjectWorkloadSummary> projectWorkloads = calculateProjectWorkloads(activeProjects, tenantId);
        List<WorkloadHeatmapRow> heatmapData = calculateHeatmapData(allEmployees, filters);
        List<WorkloadTrend> trends = calculateWorkloadTrends(allEmployees);

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
    public Page<EmployeeWorkload> getEmployeeWorkloads(WorkloadFilterOptions filters, Pageable pageable) {
        WorkloadDashboardData dashboardData = getWorkloadDashboard(filters);
        List<EmployeeWorkload> workloads = dashboardData.getEmployeeWorkloads();
        int start = (int) pageable.getOffset();
        int end = Math.min((start + pageable.getPageSize()), workloads.size());
        if (start > workloads.size()) {
            return new PageImpl<>(Collections.emptyList(), pageable, workloads.size());
        }
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
    public List<WorkloadHeatmapRow> getWorkloadHeatmap(LocalDate startDate, LocalDate endDate,
            UUID departmentId, Integer limit) {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        List<Employee> employees = departmentId != null
                ? employeeRepository.findByTenantId(tenantId).stream()
                        .filter(e -> departmentId.equals(e.getDepartmentId()))
                        .limit(limit != null ? limit : 50)
                        .collect(Collectors.toList())
                : employeeRepository.findByTenantId(tenantId).stream()
                        .limit(limit != null ? limit : 50)
                        .collect(Collectors.toList());

        return employees.stream().map(emp -> {
            List<WorkloadHeatmapCell> cells = new ArrayList<>();
            for (LocalDate date = startDate; !date.isAfter(endDate); date = date.plusWeeks(1)) {
                LocalDate weekStart = date;
                LocalDate weekEnd = date.plusDays(6).isAfter(endDate) ? endDate : date.plusDays(6);
                EmployeeCapacity cap = resourceManagementService.getEmployeeCapacity(emp.getId(), weekStart);
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

    public List<AvailabilityDTOs.Holiday> getHolidays(LocalDate startDate, LocalDate endDate) {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        return holidayRepository.findAllByTenantIdAndHolidayDateBetween(tenantId, startDate, endDate).stream()
                .map(h -> AvailabilityDTOs.Holiday.builder()
                        .id(h.getId().toString())
                        .name(h.getHolidayName())
                        .date(h.getHolidayDate())
                        .isOptional(h.getIsOptional())
                        .build())
                .collect(Collectors.toList());
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

    // ============================================
    // PRIVATE HELPERS
    // ============================================

    private boolean applyFilters(EmployeeWorkload wl, WorkloadFilterOptions filters) {
        if (filters == null) return true;
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
        if (workloads.isEmpty()) {
            return WorkloadSummary.builder()
                    .totalEmployees(0).activeProjects(projectCount).averageAllocation(0.0)
                    .medianAllocation(0.0)
                    .overAllocatedCount(0).optimalCount(0).underUtilizedCount(0).unassignedCount(0)
                    .pendingApprovals(0).totalAllocatedHours(0L)
                    .periodStart(filters != null ? filters.getStartDate() : LocalDate.now())
                    .periodEnd(filters != null ? filters.getEndDate() : LocalDate.now().plusMonths(1))
                    .build();
        }

        double avg = workloads.stream().mapToInt(EmployeeWorkload::getTotalAllocation).average().orElse(0.0);
        int over = (int) workloads.stream()
                .filter(w -> w.getAllocationStatus() == AllocationStatus.OVER_ALLOCATED).count();
        int optimal = (int) workloads.stream()
                .filter(w -> w.getAllocationStatus() == AllocationStatus.OPTIMAL).count();
        int under = (int) workloads.stream()
                .filter(w -> w.getAllocationStatus() == AllocationStatus.UNDER_UTILIZED).count();
        int unassigned = (int) workloads.stream()
                .filter(w -> w.getAllocationStatus() == AllocationStatus.UNASSIGNED).count();
        int pending = (int) workloads.stream().filter(EmployeeWorkload::getHasPendingApprovals).count();

        return WorkloadSummary.builder()
                .totalEmployees(workloads.size())
                .activeProjects(projectCount)
                .averageAllocation(avg)
                .medianAllocation(avg)
                .overAllocatedCount(over)
                .optimalCount(optimal)
                .underUtilizedCount(under)
                .unassignedCount(unassigned)
                .pendingApprovals(pending)
                .totalAllocatedHours((long) (avg * workloads.size() * 1.6))
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
                    .mapToInt(ProjectEmployee::getAllocationPercentage).sum();
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

    private List<WorkloadHeatmapRow> calculateHeatmapData(List<Employee> employees,
            WorkloadFilterOptions filters) {
        LocalDate startDate = filters != null && filters.getStartDate() != null
                ? filters.getStartDate() : LocalDate.now();
        LocalDate endDate = filters != null && filters.getEndDate() != null
                ? filters.getEndDate() : LocalDate.now().plusWeeks(4);

        List<Employee> limitedEmployees = employees.stream().limit(20).collect(Collectors.toList());

        return limitedEmployees.stream().map(emp -> {
            List<WorkloadHeatmapCell> cells = new ArrayList<>();
            for (LocalDate date = startDate; !date.isAfter(endDate); date = date.plusWeeks(1)) {
                LocalDate weekStart = date;
                LocalDate weekEnd = date.plusDays(6).isAfter(endDate) ? endDate : date.plusDays(6);
                EmployeeCapacity cap = resourceManagementService.getEmployeeCapacity(emp.getId(), weekStart);
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
                            .map(d -> d.getName()).orElse("N/A")
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

    private List<WorkloadTrend> calculateWorkloadTrends(List<Employee> employees) {
        List<WorkloadTrend> trends = new ArrayList<>();
        LocalDate today = LocalDate.now();

        for (int i = 5; i >= 0; i--) {
            LocalDate monthStart = today.minusMonths(i).withDayOfMonth(1);
            String period = monthStart.getYear() + "-"
                    + String.format("%02d", monthStart.getMonthValue());
            String periodLabel = monthStart.getMonth().toString().substring(0, 3) + " "
                    + monthStart.getYear();

            int overCount = 0, optimalCount = 0, underCount = 0;
            double totalAllocation = 0;

            for (Employee emp : employees) {
                EmployeeCapacity capacity = resourceManagementService.getEmployeeCapacity(
                        emp.getId(), monthStart);
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

        if (deptWorkloads.isEmpty()) {
            return DepartmentWorkload.builder()
                    .departmentId(departmentId).departmentName(name).employeeCount(0)
                    .averageAllocation(0.0)
                    .overAllocatedCount(0).optimalCount(0).underUtilizedCount(0).unassignedCount(0)
                    .activeProjects(0).totalAllocatedHours(0L).build();
        }

        double avg = deptWorkloads.stream().mapToInt(EmployeeWorkload::getTotalAllocation)
                .average().orElse(0.0);

        return DepartmentWorkload.builder()
                .departmentId(departmentId)
                .departmentName(name)
                .employeeCount(deptWorkloads.size())
                .averageAllocation(avg)
                .overAllocatedCount((int) deptWorkloads.stream()
                        .filter(w -> w.getAllocationStatus() == AllocationStatus.OVER_ALLOCATED).count())
                .optimalCount((int) deptWorkloads.stream()
                        .filter(w -> w.getAllocationStatus() == AllocationStatus.OPTIMAL).count())
                .underUtilizedCount((int) deptWorkloads.stream()
                        .filter(w -> w.getAllocationStatus() == AllocationStatus.UNDER_UTILIZED).count())
                .unassignedCount((int) deptWorkloads.stream()
                        .filter(w -> w.getAllocationStatus() == AllocationStatus.UNASSIGNED).count())
                .activeProjects(deptWorkloads.stream().mapToInt(EmployeeWorkload::getProjectCount).sum())
                .totalAllocatedHours((long) (avg * deptWorkloads.size() * 1.6))
                .build();
    }

    private byte[] exportWorkloadAsCsv(WorkloadDashboardData data) {
        StringBuilder csv = new StringBuilder();
        csv.append("Employee,Employee Code,Department,Designation,Total Allocation,Approved Allocation,");
        csv.append("Pending Allocation,Status,Project Count,Has Pending Approvals\n");

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
        if (value == null) return "";
        return value.replace("\"", "\"\"");
    }
}
