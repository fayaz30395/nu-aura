package com.nulogic.hrms.project;

import com.nulogic.hrms.employee.Employee;
import com.nulogic.hrms.employee.EmployeeRepository;
import com.nulogic.hrms.iam.AuthorizationService;
import com.nulogic.hrms.iam.model.PermissionScope;
import com.nulogic.hrms.org.Org;
import com.nulogic.hrms.org.OrgService;
import java.io.IOException;
import java.io.StringWriter;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVPrinter;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProjectExportService {
    private final ProjectRepository projectRepository;
    private final ProjectAllocationRepository projectAllocationRepository;
    private final AuthorizationService authorizationService;
    private final OrgService orgService;
    private final EmployeeRepository employeeRepository;

    public ProjectExportService(ProjectRepository projectRepository,
                                ProjectAllocationRepository projectAllocationRepository,
                                AuthorizationService authorizationService,
                                OrgService orgService,
                                EmployeeRepository employeeRepository) {
        this.projectRepository = projectRepository;
        this.projectAllocationRepository = projectAllocationRepository;
        this.authorizationService = authorizationService;
        this.orgService = orgService;
        this.employeeRepository = employeeRepository;
    }

    @Transactional(readOnly = true)
    public byte[] exportProjects(UUID userId, ProjectStatus status, ProjectType type, UUID ownerId, String search) {
        PermissionScope scope = authorizationService.resolveScope(userId, "PROJECT", "EXPORT");
        Org org = orgService.getOrCreateOrg();
        String searchTerm = normalizeSearch(search);

        List<Project> projects = switch (scope) {
            case ORG -> projectRepository.findForOrgScope(org.getId(), status, type, ownerId, searchTerm, Pageable.unpaged())
                    .getContent();
            case DEPARTMENT -> {
                Employee self = getCurrentEmployee(userId, org);
                if (self.getDepartmentId() == null) {
                    yield List.of();
                }
                yield projectRepository.findForDepartmentScope(org.getId(), self.getDepartmentId(),
                                status, type, ownerId, searchTerm, Pageable.unpaged())
                        .getContent();
            }
            case TEAM -> {
                Employee self = getCurrentEmployee(userId, org);
                yield projectRepository.findForTeamScope(org.getId(), self.getId(),
                                status, type, ownerId, searchTerm, Pageable.unpaged())
                        .getContent();
            }
            case SELF -> {
                Employee self = getCurrentEmployee(userId, org);
                yield projectRepository.findForSelfScope(org.getId(), self.getId(),
                                status, type, ownerId, searchTerm, Pageable.unpaged())
                        .getContent();
            }
        };

        return toProjectCsv(projects);
    }

    @Transactional(readOnly = true)
    public byte[] exportAllocations(UUID userId, UUID employeeId, UUID projectId) {
        PermissionScope scope = authorizationService.resolveScope(userId, "ALLOCATION", "EXPORT");
        Org org = orgService.getOrCreateOrg();

        List<ProjectAllocation> allocations = switch (scope) {
            case ORG -> projectAllocationRepository.findForOrgScope(org.getId(), employeeId, projectId, Pageable.unpaged())
                    .getContent();
            case DEPARTMENT -> {
                Employee self = getCurrentEmployee(userId, org);
                if (self.getDepartmentId() == null) {
                    yield List.of();
                }
                yield projectAllocationRepository.findForDepartmentScope(
                                org.getId(), self.getDepartmentId(), employeeId, projectId, Pageable.unpaged())
                        .getContent();
            }
            case TEAM -> {
                Employee self = getCurrentEmployee(userId, org);
                yield projectAllocationRepository.findForTeamScope(
                                org.getId(), self.getId(), employeeId, projectId, Pageable.unpaged())
                        .getContent();
            }
            case SELF -> {
                Employee self = getCurrentEmployee(userId, org);
                if (employeeId != null && !employeeId.equals(self.getId())) {
                    yield List.of();
                }
                yield projectAllocationRepository.findForSelfScope(org.getId(), self.getId(), projectId, Pageable.unpaged())
                        .getContent();
            }
        };

        return toAllocationCsv(allocations);
    }

    private Employee getCurrentEmployee(UUID userId, Org org) {
        return employeeRepository.findByOrg_IdAndUser_Id(org.getId(), userId)
                .orElseThrow(() -> new IllegalArgumentException("Employee not found"));
    }

    private byte[] toProjectCsv(List<Project> projects) {
        StringWriter writer = new StringWriter();
        CSVFormat format = CSVFormat.DEFAULT.builder()
                .setHeader("project_id", "project_code", "name", "type", "status", "owner_id",
                        "owner_employee_code", "owner_name", "owner_email", "start_date", "end_date",
                        "client_name", "description", "activated_at", "closed_at", "created_at", "updated_at")
                .build();
        try (CSVPrinter printer = new CSVPrinter(writer, format)) {
            for (Project project : projects) {
                Employee owner = project.getOwner();
                printer.printRecord(
                        project.getId(),
                        project.getProjectCode(),
                        project.getName(),
                        project.getType(),
                        project.getStatus(),
                        owner != null ? owner.getId() : null,
                        owner != null ? owner.getEmployeeCode() : null,
                        owner != null ? buildEmployeeName(owner) : null,
                        owner != null ? owner.getOfficialEmail() : null,
                        project.getStartDate(),
                        project.getEndDate(),
                        project.getClientName(),
                        project.getDescription(),
                        project.getActivatedAt(),
                        project.getClosedAt(),
                        project.getCreatedAt(),
                        project.getUpdatedAt()
                );
            }
        } catch (IOException ex) {
            throw new IllegalStateException("Unable to export projects", ex);
        }
        return writer.toString().getBytes(StandardCharsets.UTF_8);
    }

    private byte[] toAllocationCsv(List<ProjectAllocation> allocations) {
        StringWriter writer = new StringWriter();
        CSVFormat format = CSVFormat.DEFAULT.builder()
                .setHeader("allocation_id", "project_id", "project_code", "project_name", "project_status",
                        "employee_id", "employee_code", "employee_name", "employee_email", "start_date",
                        "end_date", "allocation_percent")
                .build();
        try (CSVPrinter printer = new CSVPrinter(writer, format)) {
            for (ProjectAllocation allocation : allocations) {
                Employee employee = allocation.getEmployee();
                Project project = allocation.getProject();
                printer.printRecord(
                        allocation.getId(),
                        project != null ? project.getId() : null,
                        project != null ? project.getProjectCode() : null,
                        project != null ? project.getName() : null,
                        project != null ? project.getStatus() : null,
                        employee != null ? employee.getId() : null,
                        employee != null ? employee.getEmployeeCode() : null,
                        employee != null ? buildEmployeeName(employee) : null,
                        employee != null ? employee.getOfficialEmail() : null,
                        allocation.getStartDate(),
                        allocation.getEndDate(),
                        allocation.getAllocationPercent()
                );
            }
        } catch (IOException ex) {
            throw new IllegalStateException("Unable to export project allocations", ex);
        }
        return writer.toString().getBytes(StandardCharsets.UTF_8);
    }

    private String buildEmployeeName(Employee employee) {
        String first = employee.getFirstName();
        String last = employee.getLastName();
        if (last == null || last.isBlank()) {
            return first;
        }
        return first + " " + last;
    }

    private String normalizeSearch(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        if (trimmed.isEmpty()) {
            return null;
        }
        return "%" + trimmed.toLowerCase() + "%";
    }
}
