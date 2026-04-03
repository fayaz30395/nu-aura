package com.hrms.application.project.service;

import com.hrms.api.project.dto.*;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.project.Project;
import com.hrms.domain.project.ProjectEmployee;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.project.repository.HrmsProjectRepository;
import com.hrms.infrastructure.project.repository.ProjectEmployeeRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Slf4j
public class ResourceAllocationService {

    private final ProjectEmployeeRepository projectEmployeeRepository;
    private final HrmsProjectRepository projectRepository;
    private final EmployeeRepository employeeRepository;

    public ResourceAllocationService(ProjectEmployeeRepository projectEmployeeRepository,
                                     HrmsProjectRepository projectRepository,
                                     EmployeeRepository employeeRepository) {
        this.projectEmployeeRepository = projectEmployeeRepository;
        this.projectRepository = projectRepository;
        this.employeeRepository = employeeRepository;
    }

    /**
     * Returns allocation summary per employee: total %, per-project breakdown, over-allocation flag.
     */
    @Transactional(readOnly = true)
    public List<AllocationSummaryResponse> getAllocationSummary() {
        UUID tenantId = TenantContext.requireCurrentTenant();
        List<ProjectEmployee> active = projectEmployeeRepository.findAllActiveAssignments(tenantId);

        // Group by employee
        Map<UUID, List<ProjectEmployee>> byEmployee = active.stream()
                .collect(Collectors.groupingBy(ProjectEmployee::getEmployeeId));

        List<AllocationSummaryResponse> result = new ArrayList<>();

        for (Map.Entry<UUID, List<ProjectEmployee>> entry : byEmployee.entrySet()) {
            UUID employeeId = entry.getKey();
            List<ProjectEmployee> assignments = entry.getValue();

            Employee emp = employeeRepository.findByIdAndTenantId(employeeId, tenantId).orElse(null);
            if (emp == null) continue;

            int total = assignments.stream()
                    .mapToInt(pe -> pe.getAllocationPercentage() != null ? pe.getAllocationPercentage() : 0)
                    .sum();

            List<AllocationSummaryResponse.AllocationEntry> projects = assignments.stream().map(pe -> {
                String projName = projectRepository.findByIdAndTenantId(pe.getProjectId(), tenantId)
                        .map(Project::getName)
                        .orElse("Unknown");
                return AllocationSummaryResponse.AllocationEntry.builder()
                        .projectId(pe.getProjectId())
                        .projectName(projName)
                        .role(pe.getRole())
                        .allocationPercent(pe.getAllocationPercentage() != null ? pe.getAllocationPercentage() : 0)
                        .startDate(pe.getStartDate() != null ? pe.getStartDate().toString() : null)
                        .endDate(pe.getEndDate() != null ? pe.getEndDate().toString() : null)
                        .build();
            }).collect(Collectors.toList());

            result.add(AllocationSummaryResponse.builder()
                    .employeeId(employeeId)
                    .employeeName(emp.getFullName())
                    .designation(emp.getDesignation())
                    .totalAllocationPercent(total)
                    .isOverAllocated(total > 100)
                    .projects(projects)
                    .build());
        }

        return result;
    }

    /**
     * Returns the full allocation timeline for a single employee (all-time, including past).
     */
    @Transactional(readOnly = true)
    public EmployeeTimelineResponse getEmployeeTimeline(UUID employeeId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        List<ProjectEmployee> all = projectEmployeeRepository.findAllByEmployeeIdAndTenantId(employeeId, tenantId);

        Employee emp = employeeRepository.findByIdAndTenantId(employeeId, tenantId)
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        List<EmployeeTimelineResponse.TimelineSlot> slots = all.stream().map(pe -> {
                    String projName = projectRepository.findByIdAndTenantId(pe.getProjectId(), tenantId)
                            .map(Project::getName)
                            .orElse("Unknown");
                    return EmployeeTimelineResponse.TimelineSlot.builder()
                            .projectId(pe.getProjectId())
                            .projectName(projName)
                            .startDate(pe.getStartDate() != null ? pe.getStartDate().toString() : null)
                            .endDate(pe.getEndDate() != null ? pe.getEndDate().toString() : null)
                            .allocationPercent(pe.getAllocationPercentage() != null ? pe.getAllocationPercentage() : 0)
                            .isActive(Boolean.TRUE.equals(pe.getIsActive()))
                            .build();
                }).sorted(Comparator.comparing(s -> s.getStartDate() != null ? s.getStartDate() : ""))
                .collect(Collectors.toList());

        return EmployeeTimelineResponse.builder()
                .employeeId(employeeId)
                .employeeName(emp.getFullName())
                .timeline(slots)
                .build();
    }

    /**
     * Update allocation % / role / dates for a project member.
     */
    @Transactional
    public ProjectEmployeeResponse reallocate(UUID projectEmployeeId, ReallocateRequest request) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        ProjectEmployee pe = projectEmployeeRepository.findById(projectEmployeeId)
                .filter(e -> e.getTenantId().equals(tenantId))
                .orElseThrow(() -> new RuntimeException("Allocation not found"));

        if (request.getAllocationPercentage() > 0) {
            pe.setAllocationPercentage(request.getAllocationPercentage());
        }
        if (request.getRole() != null) {
            pe.setRole(request.getRole());
        }
        if (request.getStartDate() != null) {
            pe.setStartDate(request.getStartDate());
        }
        if (request.getEndDate() != null) {
            pe.setEndDate(request.getEndDate());
        }

        pe = projectEmployeeRepository.save(pe);
        log.info("Reallocated project employee {} to {}%", projectEmployeeId, pe.getAllocationPercentage());

        String empName = employeeRepository.findByIdAndTenantId(pe.getEmployeeId(), tenantId)
                .map(Employee::getFullName).orElse(null);
        String projName = projectRepository.findByIdAndTenantId(pe.getProjectId(), tenantId)
                .map(Project::getName).orElse(null);

        return ProjectEmployeeResponse.builder()
                .id(pe.getId())
                .projectId(pe.getProjectId())
                .projectName(projName)
                .employeeId(pe.getEmployeeId())
                .employeeName(empName)
                .role(pe.getRole())
                .allocationPercentage(pe.getAllocationPercentage())
                .startDate(pe.getStartDate())
                .endDate(pe.getEndDate())
                .isActive(pe.getIsActive())
                .build();
    }

    /**
     * Returns employees who have capacity (total allocation < 100%).
     */
    @Transactional(readOnly = true)
    public List<AvailableResourceResponse> getAvailableResources(int minAvailablePercent) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        List<ProjectEmployee> active = projectEmployeeRepository.findAllActiveAssignments(tenantId);

        // Sum allocations per employee
        Map<UUID, Integer> allocations = new HashMap<>();
        active.forEach(pe -> {
            int pct = pe.getAllocationPercentage() != null ? pe.getAllocationPercentage() : 0;
            allocations.merge(pe.getEmployeeId(), pct, Integer::sum);
        });

        // Fetch all active employees and compute availability
        List<Employee> employees = employeeRepository.findByTenantIdAndStatus(tenantId, Employee.EmployeeStatus.ACTIVE);
        return employees.stream()
                .map(emp -> {
                    int allocated = allocations.getOrDefault(emp.getId(), 0);
                    int available = 100 - allocated;
                    return AvailableResourceResponse.builder()
                            .employeeId(emp.getId())
                            .employeeName(emp.getFullName())
                            .designation(emp.getDesignation())
                            .currentAllocationPercent(allocated)
                            .availablePercent(Math.max(0, available))
                            .build();
                })
                .filter(r -> r.getAvailablePercent() >= minAvailablePercent)
                .sorted(Comparator.comparingInt(AvailableResourceResponse::getAvailablePercent).reversed())
                .collect(Collectors.toList());
    }
}
