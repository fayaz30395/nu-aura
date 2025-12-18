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
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ProjectService {

    @Autowired
    private HrmsProjectRepository projectRepository;

    @Autowired
    private ProjectEmployeeRepository projectEmployeeRepository;

    @Autowired
    private EmployeeRepository employeeRepository;

    @Transactional
    public ProjectResponse createProject(CreateProjectRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();

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
        UUID tenantId = TenantContext.getCurrentTenant();

        Project project = projectRepository.findById(projectId)
                .filter(p -> p.getTenantId().equals(tenantId))
                .orElseThrow(() -> new ResourceNotFoundException("Project not found"));

        // Update fields if provided
        if (request.getName() != null) project.setName(request.getName());
        if (request.getDescription() != null) project.setDescription(request.getDescription());
        if (request.getStartDate() != null) project.setStartDate(request.getStartDate());
        if (request.getEndDate() != null) project.setEndDate(request.getEndDate());
        if (request.getExpectedEndDate() != null) project.setExpectedEndDate(request.getExpectedEndDate());
        if (request.getStatus() != null) project.setStatus(request.getStatus());
        if (request.getPriority() != null) project.setPriority(request.getPriority());
        if (request.getProjectManagerId() != null) project.setProjectManagerId(request.getProjectManagerId());
        if (request.getClientName() != null) project.setClientName(request.getClientName());
        if (request.getBudget() != null) project.setBudget(request.getBudget());
        if (request.getCurrency() != null) project.setCurrency(request.getCurrency());

        project = projectRepository.save(project);
        return ProjectResponse.fromProject(project);
    }

    @Transactional(readOnly = true)
    public ProjectResponse getProject(UUID projectId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        Project project = projectRepository.findById(projectId)
                .filter(p -> p.getTenantId().equals(tenantId))
                .orElseThrow(() -> new ResourceNotFoundException("Project not found"));

        ProjectResponse response = ProjectResponse.fromProject(project);

        // Add project manager name if exists
        if (project.getProjectManagerId() != null) {
            employeeRepository.findById(project.getProjectManagerId())
                    .ifPresent(manager -> response.setProjectManagerName(manager.getFullName()));
        }

        // Add team members
        List<ProjectEmployeeResponse> teamMembers = getProjectTeamMembers(projectId);
        response.setTeamMembers(teamMembers);

        return response;
    }

    @Transactional(readOnly = true)
    public Page<ProjectResponse> getAllProjects(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return projectRepository.findAllByTenantId(tenantId, pageable)
                .map(ProjectResponse::fromProject);
    }

    @Transactional(readOnly = true)
    public Page<ProjectResponse> searchProjects(String search, Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return projectRepository.searchProjects(tenantId, search, pageable)
                .map(ProjectResponse::fromProject);
    }

    @Transactional
    public ProjectEmployeeResponse assignEmployee(UUID projectId, AssignEmployeeRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();

        // Verify project exists
        Project project = projectRepository.findById(projectId)
                .filter(p -> p.getTenantId().equals(tenantId))
                .orElseThrow(() -> new ResourceNotFoundException("Project not found"));

        // Verify employee exists
        Employee employee = employeeRepository.findById(request.getEmployeeId())
                .filter(e -> e.getTenantId().equals(tenantId))
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
                .allocationPercentage(request.getAllocationPercentage() != null ? request.getAllocationPercentage() : 100)
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
        UUID tenantId = TenantContext.getCurrentTenant();

        ProjectEmployee projectEmployee = projectEmployeeRepository
                .findByProjectIdAndEmployeeIdAndTenantId(projectId, employeeId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee assignment not found"));

        projectEmployee.deactivate();
        projectEmployeeRepository.save(projectEmployee);
    }

    @Transactional(readOnly = true)
    public List<ProjectEmployeeResponse> getProjectTeamMembers(UUID projectId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        List<ProjectEmployee> projectEmployees = projectEmployeeRepository
                .findAllByProjectIdAndTenantIdAndIsActive(projectId, tenantId, true);

        return projectEmployees.stream()
                .map(pe -> {
                    ProjectEmployeeResponse response = ProjectEmployeeResponse.fromProjectEmployee(pe);
                    employeeRepository.findById(pe.getEmployeeId())
                            .ifPresent(emp -> {
                                response.setEmployeeName(emp.getFullName());
                                response.setEmployeeCode(emp.getEmployeeCode());
                            });
                    return response;
                })
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ProjectResponse> getEmployeeProjects(UUID employeeId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        List<ProjectEmployee> projectEmployees = projectEmployeeRepository
                .findAllByEmployeeIdAndTenantIdAndIsActive(employeeId, tenantId, true);

        return projectEmployees.stream()
                .map(pe -> projectRepository.findById(pe.getProjectId())
                        .filter(p -> p.getTenantId().equals(tenantId))
                        .map(ProjectResponse::fromProject)
                        .orElse(null))
                .filter(p -> p != null)
                .collect(Collectors.toList());
    }

    @Transactional
    public void deleteProject(UUID projectId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        Project project = projectRepository.findById(projectId)
                .filter(p -> p.getTenantId().equals(tenantId))
                .orElseThrow(() -> new ResourceNotFoundException("Project not found"));

        // Soft delete - mark as cancelled
        project.cancel();
        projectRepository.save(project);
    }
}
