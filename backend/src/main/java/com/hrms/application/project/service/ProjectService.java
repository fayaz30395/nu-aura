package com.hrms.application.project.service;

import com.hrms.api.project.dto.*;
import com.hrms.common.exception.DuplicateResourceException;
import com.hrms.common.exception.ResourceNotFoundException;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.project.Project;
import com.hrms.domain.project.ProjectEmployee;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.project.repository.ProjectEmployeeRepository;
import com.hrms.infrastructure.project.repository.HrmsProjectRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class ProjectService {

    private final HrmsProjectRepository projectRepository;
    private final ProjectEmployeeRepository projectEmployeeRepository;
    private final EmployeeRepository employeeRepository;

    public ProjectService(HrmsProjectRepository projectRepository,
                          ProjectEmployeeRepository projectEmployeeRepository,
                          EmployeeRepository employeeRepository) {
        this.projectRepository = projectRepository;
        this.projectEmployeeRepository = projectEmployeeRepository;
        this.employeeRepository = employeeRepository;
    }

    @Transactional
    public ProjectResponse createProject(CreateProjectRequest request) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        // Check if project code already exists
        if (projectRepository.existsByProjectCodeAndTenantId(request.getProjectCode(), tenantId)) {
            throw new DuplicateResourceException("Project code already exists");
        }

        Project project = Project.builder()
                .projectCode(request.getProjectCode())
                .name(request.getName())
                .description(request.getDescription())
                .startDate(request.getStartDate())
                .expectedEndDate(request.getExpectedEndDate())
                .status(request.getStatus())
                .priority(request.getPriority())
                .projectManagerId(request.getProjectManagerId())
                .clientName(request.getClientName())
                .budget(request.getBudget())
                .currency(request.getCurrency() != null ? request.getCurrency() : "USD")
                .build();

        project.setTenantId(tenantId);
        project = projectRepository.save(project);

        return ProjectResponse.fromProject(project);
    }

    @Transactional
    public ProjectResponse updateProject(UUID projectId, UpdateProjectRequest request) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        Project project = projectRepository.findByIdAndTenantId(projectId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found"));

        // Update fields if provided
        if (request.getName() != null)
            project.setName(request.getName());
        if (request.getDescription() != null)
            project.setDescription(request.getDescription());
        if (request.getStartDate() != null)
            project.setStartDate(request.getStartDate());
        if (request.getEndDate() != null)
            project.setEndDate(request.getEndDate());
        if (request.getExpectedEndDate() != null)
            project.setExpectedEndDate(request.getExpectedEndDate());
        if (request.getStatus() != null)
            project.setStatus(request.getStatus());
        if (request.getPriority() != null)
            project.setPriority(request.getPriority());
        if (request.getProjectManagerId() != null)
            project.setProjectManagerId(request.getProjectManagerId());
        if (request.getClientName() != null)
            project.setClientName(request.getClientName());
        if (request.getBudget() != null)
            project.setBudget(request.getBudget());
        if (request.getCurrency() != null)
            project.setCurrency(request.getCurrency());

        project = projectRepository.save(project);
        return ProjectResponse.fromProject(project);
    }

    @Transactional(readOnly = true)
    public ProjectResponse getProject(UUID projectId) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        Project project = projectRepository.findByIdAndTenantId(projectId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found"));

        ProjectResponse response = ProjectResponse.fromProject(project);

        // Add project manager name if exists - tenant-scoped to prevent cross-tenant data leak
        if (project.getProjectManagerId() != null) {
            employeeRepository.findByIdAndTenantId(project.getProjectManagerId(), tenantId)
                    .ifPresent(manager -> response.setProjectManagerName(manager.getFullName()));
        }

        // Add team members
        List<ProjectEmployeeResponse> teamMembers = getProjectTeamMembers(projectId);
        response.setTeamMembers(teamMembers);

        return response;
    }

    @Transactional(readOnly = true)
    public Page<ProjectResponse> getAllProjects(Project.ProjectStatus status, Project.Priority priority,
                                                Pageable pageable) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        Page<Project> projects;

        if (status != null && priority != null) {
            projects = projectRepository.findAllByTenantIdAndStatusAndPriority(tenantId, status, priority,
                    pageable);
        } else if (status != null) {
            projects = projectRepository.findAllByTenantIdAndStatus(tenantId, status, pageable);
        } else if (priority != null) {
            projects = projectRepository.findAllByTenantIdAndPriority(tenantId, priority, pageable);
        } else {
            projects = projectRepository.findAllByTenantId(tenantId, pageable);
        }

        return projects.map(ProjectResponse::fromProject);
    }

    @Transactional(readOnly = true)
    public Page<ProjectResponse> searchProjects(String search, Pageable pageable) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        return projectRepository.searchProjects(tenantId, search, pageable)
                .map(ProjectResponse::fromProject);
    }

    @Transactional
    public ProjectEmployeeResponse assignEmployee(UUID projectId, AssignEmployeeRequest request) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        // Verify project exists
        Project project = projectRepository.findByIdAndTenantId(projectId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found"));

        // Verify employee exists
        Employee employee = employeeRepository.findByIdAndTenantId(request.getEmployeeId(), tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found"));

        // Check if already assigned
        if (projectEmployeeRepository.existsByProjectIdAndEmployeeIdAndTenantId(
                projectId, request.getEmployeeId(), tenantId)) {
            throw new DuplicateResourceException("Employee is already assigned to this project");
        }

        ProjectEmployee projectEmployee = ProjectEmployee.builder()
                .projectId(projectId)
                .employeeId(request.getEmployeeId())
                .role(request.getRole())
                .allocationPercentage(request.getAllocationPercentage() != null
                        ? request.getAllocationPercentage()
                        : 100)
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .isActive(true)
                .build();

        projectEmployee.setTenantId(tenantId);
        projectEmployee = projectEmployeeRepository.save(projectEmployee);

        ProjectEmployeeResponse response = ProjectEmployeeResponse.fromProjectEmployee(projectEmployee);
        response.setProjectName(project.getName());
        response.setEmployeeName(employee.getFullName());
        response.setEmployeeCode(employee.getEmployeeCode());

        return response;
    }

    @Transactional
    public void removeEmployeeFromProject(UUID projectId, UUID employeeId) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        ProjectEmployee projectEmployee = projectEmployeeRepository
                .findByProjectIdAndEmployeeIdAndTenantId(projectId, employeeId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee assignment not found"));

        projectEmployee.deactivate();
        projectEmployeeRepository.save(projectEmployee);
    }

    @Transactional(readOnly = true)
    public List<ProjectEmployeeResponse> getProjectTeamMembers(UUID projectId) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        List<ProjectEmployee> projectEmployees = projectEmployeeRepository
                .findAllByProjectIdAndTenantIdAndIsActive(projectId, tenantId, true);

        // Batch-fetch all employees in a single query instead of one query per member
        List<UUID> empIds = projectEmployees.stream()
                .map(ProjectEmployee::getEmployeeId).distinct().collect(Collectors.toList());
        Map<UUID, Employee> empMap = employeeRepository.findAllById(empIds).stream()
                .collect(Collectors.toMap(Employee::getId, Function.identity()));

        return projectEmployees.stream()
                .map(pe -> {
                    ProjectEmployeeResponse response = ProjectEmployeeResponse
                            .fromProjectEmployee(pe);
                    Employee emp = empMap.get(pe.getEmployeeId());
                    if (emp != null) {
                        response.setEmployeeName(emp.getFullName());
                        response.setEmployeeCode(emp.getEmployeeCode());
                    }
                    return response;
                })
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ProjectResponse> getEmployeeProjects(UUID employeeId) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        List<ProjectEmployee> projectEmployees = projectEmployeeRepository
                .findAllByEmployeeIdAndTenantIdAndIsActive(employeeId, tenantId, true);

        // Batch-fetch all projects in one query
        List<UUID> projectIds = projectEmployees.stream()
                .map(ProjectEmployee::getProjectId).distinct().collect(Collectors.toList());
        Map<UUID, Project> projectMap = projectRepository.findAllById(projectIds).stream()
                .filter(p -> p.getTenantId().equals(tenantId))
                .collect(Collectors.toMap(Project::getId, Function.identity()));

        return projectEmployees.stream()
                .map(pe -> projectMap.get(pe.getProjectId()))
                .filter(p -> p != null)
                .map(ProjectResponse::fromProject)
                .collect(Collectors.toList());
    }

    /**
     * Get all allocations for an employee across all projects.
     * Returns ProjectEmployeeResponse with allocation percentages and status.
     */
    @Transactional(readOnly = true)
    public List<ProjectEmployeeResponse> getEmployeeAllocations(UUID employeeId) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        List<ProjectEmployee> projectEmployees = projectEmployeeRepository
                .findAllByEmployeeIdAndTenantId(employeeId, tenantId);

        // Batch-fetch all projects in one query
        List<UUID> projectIds = projectEmployees.stream()
                .map(ProjectEmployee::getProjectId).distinct().collect(Collectors.toList());
        Map<UUID, String> projectNameMap = projectRepository.findAllById(projectIds).stream()
                .filter(p -> p.getTenantId().equals(tenantId))
                .collect(Collectors.toMap(Project::getId, Project::getName));

        return projectEmployees.stream()
                .map(pe -> {
                    ProjectEmployeeResponse response = ProjectEmployeeResponse
                            .fromProjectEmployee(pe);
                    String projName = projectNameMap.get(pe.getProjectId());
                    if (projName != null) {
                        response.setProjectName(projName);
                    }
                    return response;
                })
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<ProjectEmployeeResponse> getProjectAllocations(UUID projectId, Pageable pageable) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        Page<ProjectEmployee> projectEmployees = projectEmployeeRepository
                .findAllByProjectIdAndTenantId(projectId, tenantId, pageable);

        // Batch-fetch employees for the current page in one query
        List<UUID> empIds = projectEmployees.getContent().stream()
                .map(ProjectEmployee::getEmployeeId).distinct().collect(Collectors.toList());
        Map<UUID, Employee> empMap = employeeRepository.findAllById(empIds).stream()
                .collect(Collectors.toMap(Employee::getId, Function.identity()));

        return projectEmployees.map(pe -> {
            ProjectEmployeeResponse response = ProjectEmployeeResponse.fromProjectEmployee(pe);
            Employee emp = empMap.get(pe.getEmployeeId());
            if (emp != null) {
                response.setEmployeeName(emp.getFullName());
                response.setEmployeeCode(emp.getEmployeeCode());
            }
            return response;
        });
    }

    @Transactional
    public ProjectEmployeeResponse endAllocation(UUID projectId, UUID memberId) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        ProjectEmployee projectEmployee = projectEmployeeRepository.findById(memberId)
                .filter(pe -> pe.getTenantId().equals(tenantId)
                        && pe.getProjectId().equals(projectId))
                .orElseThrow(() -> new ResourceNotFoundException("Allocation not found"));

        projectEmployee.deactivate();
        projectEmployee = projectEmployeeRepository.save(projectEmployee);

        ProjectEmployeeResponse response = ProjectEmployeeResponse.fromProjectEmployee(projectEmployee);
        employeeRepository.findByIdAndTenantId(projectEmployee.getEmployeeId(), tenantId)
                .ifPresent(emp -> {
                    response.setEmployeeName(emp.getFullName());
                    response.setEmployeeCode(emp.getEmployeeCode());
                });
        return response;
    }

    @Transactional
    public void deleteProject(UUID projectId) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        Project project = projectRepository.findByIdAndTenantId(projectId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found"));

        // Soft delete - mark as cancelled
        project.cancel();
        projectRepository.save(project);
    }
}
