package com.nulogic.hrms.project;

import com.nulogic.hrms.audit.AuditService;
import com.nulogic.hrms.employee.Employee;
import com.nulogic.hrms.employee.EmployeeRepository;
import com.nulogic.hrms.iam.AuthorizationService;
import com.nulogic.hrms.iam.model.PermissionScope;
import com.nulogic.hrms.iam.model.User;
import com.nulogic.hrms.iam.repo.UserRepository;
import com.nulogic.hrms.org.Org;
import com.nulogic.hrms.org.OrgService;
import com.nulogic.hrms.project.dto.ProjectCloseRequest;
import com.nulogic.hrms.project.dto.ProjectCreateRequest;
import com.nulogic.hrms.project.dto.ProjectResponse;
import com.nulogic.hrms.project.dto.ProjectUpdateRequest;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProjectService {
    private final ProjectRepository projectRepository;
    private final ProjectAllocationRepository projectAllocationRepository;
    private final EmployeeRepository employeeRepository;
    private final AuthorizationService authorizationService;
    private final OrgService orgService;
    private final ProjectCodeGenerator projectCodeGenerator;
    private final AuditService auditService;
    private final UserRepository userRepository;

    public ProjectService(ProjectRepository projectRepository,
                          ProjectAllocationRepository projectAllocationRepository,
                          EmployeeRepository employeeRepository,
                          AuthorizationService authorizationService,
                          OrgService orgService,
                          ProjectCodeGenerator projectCodeGenerator,
                          AuditService auditService,
                          UserRepository userRepository) {
        this.projectRepository = projectRepository;
        this.projectAllocationRepository = projectAllocationRepository;
        this.employeeRepository = employeeRepository;
        this.authorizationService = authorizationService;
        this.orgService = orgService;
        this.projectCodeGenerator = projectCodeGenerator;
        this.auditService = auditService;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public Page<ProjectResponse> list(UUID userId, ProjectStatus status, ProjectType type,
                                      UUID ownerId, String search, Pageable pageable) {
        PermissionScope scope = authorizationService.resolveScope(userId, "PROJECT", "VIEW");
        Org org = orgService.getOrCreateOrg();
        String searchTerm = normalizeSearch(search);
        return switch (scope) {
            case ORG -> projectRepository.findForOrgScope(org.getId(), status, type, ownerId, searchTerm, pageable)
                    .map(this::toResponse);
            case DEPARTMENT -> {
                Employee self = getCurrentEmployee(userId, org);
                if (self.getDepartmentId() == null) {
                    yield Page.empty(pageable);
                }
                yield projectRepository.findForDepartmentScope(org.getId(), self.getDepartmentId(),
                                status, type, ownerId, searchTerm, pageable)
                        .map(this::toResponse);
            }
            case TEAM -> {
                Employee self = getCurrentEmployee(userId, org);
                yield projectRepository.findForTeamScope(org.getId(), self.getId(),
                                status, type, ownerId, searchTerm, pageable)
                        .map(this::toResponse);
            }
            case SELF -> {
                Employee self = getCurrentEmployee(userId, org);
                yield projectRepository.findForSelfScope(org.getId(), self.getId(),
                                status, type, ownerId, searchTerm, pageable)
                        .map(this::toResponse);
            }
        };
    }

    @Transactional(readOnly = true)
    public ProjectResponse get(UUID userId, UUID projectId) {
        Org org = orgService.getOrCreateOrg();
        Project project = projectRepository.findByOrg_IdAndId(org.getId(), projectId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found"));
        ensureOrg(project, org);
        ensureProjectAccess(userId, project, org);
        return toResponse(project);
    }

    @Transactional
    public ProjectResponse create(UUID userId, ProjectCreateRequest request) {
        PermissionScope scope = requireManageScope(userId, "CREATE");
        Org org = orgService.getOrCreateOrg();

        Employee owner = resolveOwner(org, request.getOwnerId());
        if (scope != PermissionScope.ORG) {
            ensureOwnerMatchesScope(owner, userId, org, scope);
        }

        Project project = new Project();
        project.setOrg(org);
        project.setProjectCode(projectCodeGenerator.nextCode(org.getId()));
        project.setName(normalizeRequired(request.getName(), "Project name is required"));
        ProjectType type = request.getType();
        if (type == null) {
            throw new IllegalArgumentException("Project type is required");
        }
        project.setType(type);
        project.setStatus(ProjectStatus.DRAFT);
        project.setOwner(owner);
        project.setStartDate(request.getStartDate());
        project.setEndDate(request.getEndDate());
        project.setClientName(normalizeOptional(request.getClientName()));
        project.setDescription(normalizeOptional(request.getDescription()));

        validateDates(project.getStartDate(), project.getEndDate());
        validateClientName(project.getType(), project.getClientName());
        if (project.getType() == ProjectType.INTERNAL) {
            project.setClientName(null);
        }

        Project saved = projectRepository.save(project);
        auditService.recordEvent(org, loadActor(userId, org), "PROJECT", "CREATE",
                "PROJECT", saved.getId(), "SUCCESS", null, null,
                Map.of("projectCode", saved.getProjectCode(), "name", saved.getName()));
        return toResponse(saved);
    }

    @Transactional
    public ProjectResponse update(UUID userId, UUID projectId, ProjectUpdateRequest request) {
        PermissionScope scope = requireManageScope(userId, "UPDATE");
        Org org = orgService.getOrCreateOrg();
        Project project = projectRepository.findByOrg_IdAndId(org.getId(), projectId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found"));
        ensureOrg(project, org);

        if (project.getStatus() == ProjectStatus.CLOSED) {
            throw new IllegalArgumentException("Closed projects cannot be updated");
        }

        Employee owner = resolveOwner(org, request.getOwnerId());
        if (scope != PermissionScope.ORG) {
            ensureOwnerMatchesScope(owner, userId, org, scope);
            if (!project.getOwner().getId().equals(owner.getId())) {
                throw new IllegalArgumentException("Forbidden");
            }
        }

        project.setName(normalizeRequired(request.getName(), "Project name is required"));
        ProjectType type = request.getType();
        if (type == null) {
            throw new IllegalArgumentException("Project type is required");
        }
        project.setType(type);
        project.setOwner(owner);
        project.setStartDate(request.getStartDate());
        project.setEndDate(request.getEndDate());
        project.setClientName(normalizeOptional(request.getClientName()));
        project.setDescription(normalizeOptional(request.getDescription()));

        validateDates(project.getStartDate(), project.getEndDate());
        validateClientName(project.getType(), project.getClientName());
        if (project.getType() == ProjectType.INTERNAL) {
            project.setClientName(null);
        }

        Project saved = projectRepository.save(project);
        auditService.recordEvent(org, loadActor(userId, org), "PROJECT", "UPDATE",
                "PROJECT", saved.getId(), "SUCCESS", null, null,
                Map.of("projectCode", saved.getProjectCode(), "status", saved.getStatus().name()));
        return toResponse(saved);
    }

    @Transactional
    public ProjectResponse activate(UUID userId, UUID projectId) {
        PermissionScope scope = requireManageScope(userId, "ACTIVATE");
        Org org = orgService.getOrCreateOrg();
        Project project = projectRepository.findByOrg_IdAndId(org.getId(), projectId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found"));
        ensureOrg(project, org);

        if (project.getStatus() != ProjectStatus.DRAFT) {
            throw new IllegalArgumentException("Only draft projects can be activated");
        }

        if (scope != PermissionScope.ORG) {
            ensureOwnerMatchesScope(project.getOwner(), userId, org, scope);
        }

        project.setStatus(ProjectStatus.ACTIVE);
        project.setActivatedAt(OffsetDateTime.now());
        Project saved = projectRepository.save(project);

        auditService.recordEvent(org, loadActor(userId, org), "PROJECT", "ACTIVATE",
                "PROJECT", saved.getId(), "SUCCESS", null, null,
                Map.of("projectCode", saved.getProjectCode()));
        return toResponse(saved);
    }

    @Transactional
    public ProjectResponse close(UUID userId, UUID projectId, ProjectCloseRequest request) {
        PermissionScope scope = requireManageScope(userId, "CLOSE");
        Org org = orgService.getOrCreateOrg();
        Project project = projectRepository.findByOrg_IdAndId(org.getId(), projectId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found"));
        ensureOrg(project, org);

        if (project.getStatus() != ProjectStatus.ACTIVE) {
            throw new IllegalArgumentException("Only active projects can be closed");
        }

        if (scope != PermissionScope.ORG) {
            ensureOwnerMatchesScope(project.getOwner(), userId, org, scope);
        }

        LocalDate closeDate = request != null && request.getCloseDate() != null
                ? request.getCloseDate()
                : LocalDate.now();
        if (closeDate.isBefore(project.getStartDate())) {
            throw new IllegalArgumentException("Close date cannot be before start date");
        }

        if (project.getEndDate() == null || project.getEndDate().isAfter(closeDate)) {
            project.setEndDate(closeDate);
        }

        project.setStatus(ProjectStatus.CLOSED);
        project.setClosedAt(OffsetDateTime.now());
        Project saved = projectRepository.save(project);

        projectAllocationRepository.endAllocationsAt(project.getId(), closeDate);

        auditService.recordEvent(org, loadActor(userId, org), "PROJECT", "CLOSE",
                "PROJECT", saved.getId(), "SUCCESS", null, null,
                Map.of("projectCode", saved.getProjectCode(), "closeDate", closeDate.toString()));
        return toResponse(saved);
    }

    private PermissionScope requireManageScope(UUID userId, String action) {
        Set<PermissionScope> scopes = authorizationService.allowedScopes(userId, "PROJECT", action);
        if (scopes.isEmpty()) {
            throw new AccessDeniedException("Forbidden");
        }
        if (scopes.contains(PermissionScope.ORG)) {
            return PermissionScope.ORG;
        }
        if (scopes.contains(PermissionScope.DEPARTMENT)) {
            return PermissionScope.DEPARTMENT;
        }
        if (scopes.contains(PermissionScope.TEAM)) {
            return PermissionScope.TEAM;
        }
        return PermissionScope.SELF;
    }

    private void ensureProjectAccess(UUID userId, Project project, Org org) {
        PermissionScope scope = authorizationService.resolveScope(userId, "PROJECT", "VIEW");
        if (scope == PermissionScope.ORG) {
            return;
        }

        Employee self = getCurrentEmployee(userId, org);
        UUID projectId = project.getId();
        switch (scope) {
            case SELF -> {
                if (!project.getOwner().getId().equals(self.getId())
                        && !projectAllocationRepository.existsByOrg_IdAndProject_IdAndEmployee_Id(
                                org.getId(), projectId, self.getId())) {
                    throw new IllegalArgumentException("Project not found");
                }
            }
            case TEAM -> {
                if (!project.getOwner().getId().equals(self.getId())
                        && !projectAllocationRepository.existsByOrg_IdAndProject_IdAndEmployee_Manager_Id(
                                org.getId(), projectId, self.getId())) {
                    throw new IllegalArgumentException("Project not found");
                }
            }
            case DEPARTMENT -> {
                UUID departmentId = self.getDepartmentId();
                if (departmentId == null) {
                    throw new IllegalArgumentException("Project not found");
                }
                if (!departmentId.equals(project.getOwner().getDepartmentId())
                        && !projectAllocationRepository.existsByOrg_IdAndProject_IdAndEmployee_DepartmentId(
                                org.getId(), projectId, departmentId)) {
                    throw new IllegalArgumentException("Project not found");
                }
            }
            default -> throw new IllegalArgumentException("Project not found");
        }
    }

    private void ensureOwnerMatchesScope(Employee owner, UUID userId, Org org, PermissionScope scope) {
        Employee self = getCurrentEmployee(userId, org);
        if (scope == PermissionScope.DEPARTMENT) {
            if (self.getDepartmentId() == null || owner.getDepartmentId() == null
                    || !self.getDepartmentId().equals(owner.getDepartmentId())) {
                throw new IllegalArgumentException("Forbidden");
            }
            return;
        }
        if (!owner.getId().equals(self.getId())) {
            throw new IllegalArgumentException("Project owner must be current user");
        }
    }

    private Employee resolveOwner(Org org, UUID ownerId) {
        if (ownerId == null) {
            throw new IllegalArgumentException("Project owner is required");
        }
        Employee owner = employeeRepository.findById(ownerId)
                .orElseThrow(() -> new IllegalArgumentException("Owner not found"));
        if (!owner.getOrg().getId().equals(org.getId())) {
            throw new IllegalArgumentException("Owner not found");
        }
        return owner;
    }

    private Employee getCurrentEmployee(UUID userId, Org org) {
        return employeeRepository.findByOrg_IdAndUser_Id(org.getId(), userId)
                .orElseThrow(() -> new IllegalArgumentException("Employee not found"));
    }

    private void ensureOrg(Project project, Org org) {
        if (!project.getOrg().getId().equals(org.getId())) {
            throw new IllegalArgumentException("Project not found");
        }
    }

    private void validateDates(LocalDate startDate, LocalDate endDate) {
        if (startDate == null) {
            throw new IllegalArgumentException("Start date is required");
        }
        if (endDate != null && endDate.isBefore(startDate)) {
            throw new IllegalArgumentException("End date cannot be before start date");
        }
    }

    private void validateClientName(ProjectType type, String clientName) {
        if (type == ProjectType.CLIENT && (clientName == null || clientName.isBlank())) {
            throw new IllegalArgumentException("Client name is required for client projects");
        }
    }

    private String normalizeRequired(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(message);
        }
        return value.trim();
    }

    private String normalizeOptional(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
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

    private ProjectResponse toResponse(Project project) {
        String ownerName = null;
        String ownerEmployeeCode = null;
        String ownerEmail = null;
        if (project.getOwner() != null) {
            String firstName = project.getOwner().getFirstName();
            String lastName = project.getOwner().getLastName();
            if (lastName == null || lastName.isBlank()) {
                ownerName = firstName;
            } else {
                ownerName = firstName + " " + lastName;
            }
            ownerEmployeeCode = project.getOwner().getEmployeeCode();
            ownerEmail = project.getOwner().getOfficialEmail();
        }
        return ProjectResponse.builder()
                .id(project.getId())
                .projectCode(project.getProjectCode())
                .name(project.getName())
                .type(project.getType())
                .status(project.getStatus())
                .ownerId(project.getOwner() != null ? project.getOwner().getId() : null)
                .ownerName(ownerName)
                .ownerEmployeeCode(ownerEmployeeCode)
                .ownerEmail(ownerEmail)
                .startDate(project.getStartDate())
                .endDate(project.getEndDate())
                .clientName(project.getClientName())
                .description(project.getDescription())
                .activatedAt(project.getActivatedAt())
                .closedAt(project.getClosedAt())
                .createdAt(project.getCreatedAt())
                .updatedAt(project.getUpdatedAt())
                .build();
    }

    private User loadActor(UUID userId, Org org) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        if (!user.getOrg().getId().equals(org.getId())) {
            throw new IllegalArgumentException("User not found");
        }
        return user;
    }
}
