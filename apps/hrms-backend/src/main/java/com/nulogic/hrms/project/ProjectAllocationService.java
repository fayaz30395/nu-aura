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
import com.nulogic.hrms.project.dto.ProjectAllocationCreateRequest;
import com.nulogic.hrms.project.dto.ProjectAllocationEndRequest;
import com.nulogic.hrms.project.dto.ProjectAllocationResponse;
import com.nulogic.hrms.project.dto.ProjectAllocationUpdateRequest;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProjectAllocationService {
    private static final BigDecimal ONE_HUNDRED = BigDecimal.valueOf(100);

    private final ProjectAllocationRepository projectAllocationRepository;
    private final ProjectRepository projectRepository;
    private final EmployeeRepository employeeRepository;
    private final AuthorizationService authorizationService;
    private final OrgService orgService;
    private final AuditService auditService;
    private final UserRepository userRepository;

    public ProjectAllocationService(ProjectAllocationRepository projectAllocationRepository,
                                    ProjectRepository projectRepository,
                                    EmployeeRepository employeeRepository,
                                    AuthorizationService authorizationService,
                                    OrgService orgService,
                                    AuditService auditService,
                                    UserRepository userRepository) {
        this.projectAllocationRepository = projectAllocationRepository;
        this.projectRepository = projectRepository;
        this.employeeRepository = employeeRepository;
        this.authorizationService = authorizationService;
        this.orgService = orgService;
        this.auditService = auditService;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public Page<ProjectAllocationResponse> list(UUID userId, UUID employeeId, UUID projectId, Pageable pageable) {
        PermissionScope scope = authorizationService.resolveScope(userId, "ALLOCATION", "VIEW");
        Org org = orgService.getOrCreateOrg();
        return listByScope(scope, org, userId, employeeId, projectId, pageable);
    }

    @Transactional(readOnly = true)
    public Page<ProjectAllocationResponse> listByProject(UUID userId, UUID projectId, Pageable pageable) {
        PermissionScope scope = authorizationService.resolveScope(userId, "ALLOCATION", "VIEW");
        Org org = orgService.getOrCreateOrg();
        return listByScope(scope, org, userId, null, projectId, pageable);
    }

    @Transactional
    public ProjectAllocationResponse create(UUID userId, UUID projectId, ProjectAllocationCreateRequest request) {
        PermissionScope scope = requireAllocationScope(userId, "CREATE");
        Org org = orgService.getOrCreateOrg();
        Project project = projectRepository.findByOrg_IdAndId(org.getId(), projectId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found"));

        if (project.getStatus() != ProjectStatus.ACTIVE) {
            throw new IllegalArgumentException("Allocations are only allowed on active projects");
        }

        Employee employee = resolveEmployee(org, request.getEmployeeId());
        enforceScopeRules(scope, userId, org, project, employee);

        LocalDate startDate = request.getStartDate();
        LocalDate endDate = request.getEndDate();
        BigDecimal percent = normalizePercent(request.getAllocationPercent());

        validateDates(startDate, endDate);
        validateOverallocation(org.getId(), employee.getId(), startDate, endDate, percent, null);

        ProjectAllocation allocation = new ProjectAllocation();
        allocation.setOrg(org);
        allocation.setProject(project);
        allocation.setEmployee(employee);
        allocation.setStartDate(startDate);
        allocation.setEndDate(endDate);
        allocation.setAllocationPercent(percent);

        ProjectAllocation saved = projectAllocationRepository.save(allocation);
        auditService.recordEvent(org, loadActor(userId, org), "ALLOCATION", "CREATE",
                "PROJECT_ALLOCATION", saved.getId(), "SUCCESS", null, null,
                Map.of("projectId", project.getId().toString(), "employeeId", employee.getId().toString(),
                        "percent", percent));

        return toResponse(saved);
    }

    @Transactional
    public ProjectAllocationResponse update(UUID userId, UUID projectId, UUID allocationId,
                                            ProjectAllocationUpdateRequest request) {
        PermissionScope scope = requireAllocationScope(userId, "UPDATE");
        Org org = orgService.getOrCreateOrg();
        ProjectAllocation allocation = projectAllocationRepository.findByOrg_IdAndId(org.getId(), allocationId)
                .orElseThrow(() -> new IllegalArgumentException("Allocation not found"));

        if (!allocation.getProject().getId().equals(projectId)) {
            throw new IllegalArgumentException("Allocation not found");
        }

        Project project = allocation.getProject();
        if (project.getStatus() != ProjectStatus.ACTIVE) {
            throw new IllegalArgumentException("Allocations are only allowed on active projects");
        }

        Employee employee = allocation.getEmployee();
        enforceScopeRules(scope, userId, org, project, employee);

        LocalDate startDate = request.getStartDate();
        LocalDate endDate = request.getEndDate();
        BigDecimal percent = normalizePercent(request.getAllocationPercent());

        validateDates(startDate, endDate);
        validateOverallocation(org.getId(), employee.getId(), startDate, endDate, percent, allocationId);

        allocation.setStartDate(startDate);
        allocation.setEndDate(endDate);
        allocation.setAllocationPercent(percent);

        ProjectAllocation saved = projectAllocationRepository.save(allocation);
        auditService.recordEvent(org, loadActor(userId, org), "ALLOCATION", "UPDATE",
                "PROJECT_ALLOCATION", saved.getId(), "SUCCESS", null, null,
                Map.of("projectId", project.getId().toString(), "employeeId", employee.getId().toString(),
                        "percent", percent));
        return toResponse(saved);
    }

    @Transactional
    public ProjectAllocationResponse end(UUID userId, UUID projectId, UUID allocationId,
                                         ProjectAllocationEndRequest request) {
        PermissionScope scope = requireAllocationScope(userId, "END");
        Org org = orgService.getOrCreateOrg();
        ProjectAllocation allocation = projectAllocationRepository.findByOrg_IdAndId(org.getId(), allocationId)
                .orElseThrow(() -> new IllegalArgumentException("Allocation not found"));

        if (!allocation.getProject().getId().equals(projectId)) {
            throw new IllegalArgumentException("Allocation not found");
        }

        Project project = allocation.getProject();
        if (project.getStatus() != ProjectStatus.ACTIVE) {
            throw new IllegalArgumentException("Allocations are only allowed on active projects");
        }

        Employee employee = allocation.getEmployee();
        enforceScopeRules(scope, userId, org, project, employee);

        LocalDate requestedEnd = request != null && request.getEndDate() != null
                ? request.getEndDate()
                : LocalDate.now();

        if (requestedEnd.isBefore(allocation.getStartDate())) {
            throw new IllegalArgumentException("End date cannot be before start date");
        }

        if (requestedEnd.isAfter(allocation.getEndDate())) {
            throw new IllegalArgumentException("End date cannot be after current end date");
        }

        allocation.setEndDate(requestedEnd);
        ProjectAllocation saved = projectAllocationRepository.save(allocation);

        auditService.recordEvent(org, loadActor(userId, org), "ALLOCATION", "END",
                "PROJECT_ALLOCATION", saved.getId(), "SUCCESS", null, null,
                Map.of("projectId", project.getId().toString(), "employeeId", employee.getId().toString(),
                        "endDate", requestedEnd.toString()));

        return toResponse(saved);
    }

    private Page<ProjectAllocationResponse> listByScope(PermissionScope scope, Org org, UUID userId,
                                                        UUID employeeId, UUID projectId, Pageable pageable) {
        return switch (scope) {
            case ORG -> projectAllocationRepository.findForOrgScope(org.getId(), employeeId, projectId, pageable)
                    .map(this::toResponse);
            case DEPARTMENT -> {
                Employee self = getCurrentEmployee(userId, org);
                if (self.getDepartmentId() == null) {
                    yield Page.empty(pageable);
                }
                yield projectAllocationRepository.findForDepartmentScope(
                                org.getId(), self.getDepartmentId(), employeeId, projectId, pageable)
                        .map(this::toResponse);
            }
            case TEAM -> {
                Employee self = getCurrentEmployee(userId, org);
                yield projectAllocationRepository.findForTeamScope(org.getId(), self.getId(), employeeId, projectId, pageable)
                        .map(this::toResponse);
            }
            case SELF -> {
                Employee self = getCurrentEmployee(userId, org);
                if (employeeId != null && !employeeId.equals(self.getId())) {
                    yield Page.empty(pageable);
                }
                yield projectAllocationRepository.findForSelfScope(org.getId(), self.getId(), projectId, pageable)
                        .map(this::toResponse);
            }
        };
    }

    private Employee enforceScopeRules(PermissionScope scope, UUID userId, Org org, Project project, Employee employee) {
        if (scope == PermissionScope.ORG) {
            return null;
        }

        Employee self = getCurrentEmployee(userId, org);
        if (scope == PermissionScope.TEAM || scope == PermissionScope.SELF) {
            if (!project.getOwner().getId().equals(self.getId())) {
                throw new IllegalArgumentException("Project owner must be current user");
            }
        }

        switch (scope) {
            case SELF -> {
                if (!employee.getId().equals(self.getId())) {
                    throw new IllegalArgumentException("Forbidden");
                }
            }
            case TEAM -> {
                if (employee.getManager() == null || !employee.getManager().getId().equals(self.getId())) {
                    throw new IllegalArgumentException("Forbidden");
                }
            }
            case DEPARTMENT -> {
                if (self.getDepartmentId() == null || employee.getDepartmentId() == null
                        || !self.getDepartmentId().equals(employee.getDepartmentId())) {
                    throw new IllegalArgumentException("Forbidden");
                }
            }
            default -> throw new IllegalArgumentException("Forbidden");
        }

        return self;
    }

    private PermissionScope requireAllocationScope(UUID userId, String action) {
        Set<PermissionScope> scopes = authorizationService.allowedScopes(userId, "ALLOCATION", action);
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

    private void validateDates(LocalDate startDate, LocalDate endDate) {
        if (startDate == null || endDate == null) {
            throw new IllegalArgumentException("Start date and end date are required");
        }
        if (endDate.isBefore(startDate)) {
            throw new IllegalArgumentException("End date cannot be before start date");
        }
    }

    private BigDecimal normalizePercent(BigDecimal percent) {
        if (percent == null) {
            throw new IllegalArgumentException("Allocation percent is required");
        }
        if (percent.compareTo(BigDecimal.ZERO) <= 0 || percent.compareTo(ONE_HUNDRED) > 0) {
            throw new IllegalArgumentException("Allocation percent must be between 0 and 100");
        }
        return percent;
    }

    private void validateOverallocation(UUID orgId, UUID employeeId, LocalDate startDate,
                                        LocalDate endDate, BigDecimal percent, UUID excludeId) {
        List<ProjectAllocation> overlaps = projectAllocationRepository.findOverlappingActiveAllocations(
                orgId, employeeId, startDate, endDate, excludeId);
        if (overlaps.isEmpty()) {
            return;
        }

        TreeSet<LocalDate> boundaries = new TreeSet<>();
        boundaries.add(startDate);
        boundaries.add(endDate.plusDays(1));
        for (ProjectAllocation allocation : overlaps) {
            LocalDate overlapStart = maxDate(startDate, allocation.getStartDate());
            LocalDate overlapEnd = minDate(endDate, allocation.getEndDate());
            boundaries.add(overlapStart);
            boundaries.add(overlapEnd.plusDays(1));
        }

        List<LocalDate> points = new ArrayList<>(boundaries);
        for (int i = 0; i < points.size() - 1; i++) {
            LocalDate segmentStart = points.get(i);
            LocalDate segmentEnd = points.get(i + 1).minusDays(1);
            BigDecimal total = percent;
            for (ProjectAllocation allocation : overlaps) {
                if (!allocation.getEndDate().isBefore(segmentStart)
                        && !allocation.getStartDate().isAfter(segmentEnd)) {
                    total = total.add(allocation.getAllocationPercent());
                }
            }
            if (total.compareTo(ONE_HUNDRED) > 0) {
                throw new IllegalArgumentException("Allocation exceeds 100% capacity");
            }
        }
    }

    private LocalDate maxDate(LocalDate left, LocalDate right) {
        return left.isAfter(right) ? left : right;
    }

    private LocalDate minDate(LocalDate left, LocalDate right) {
        return left.isBefore(right) ? left : right;
    }

    private Employee resolveEmployee(Org org, UUID employeeId) {
        if (employeeId == null) {
            throw new IllegalArgumentException("Employee is required");
        }
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new IllegalArgumentException("Employee not found"));
        if (!employee.getOrg().getId().equals(org.getId())) {
            throw new IllegalArgumentException("Employee not found");
        }
        return employee;
    }

    private Employee getCurrentEmployee(UUID userId, Org org) {
        return employeeRepository.findByOrg_IdAndUser_Id(org.getId(), userId)
                .orElseThrow(() -> new IllegalArgumentException("Employee not found"));
    }

    private ProjectAllocationResponse toResponse(ProjectAllocation allocation) {
        Employee employee = allocation.getEmployee();
        Project project = allocation.getProject();
        return ProjectAllocationResponse.builder()
                .id(allocation.getId())
                .projectId(project != null ? project.getId() : null)
                .projectCode(project != null ? project.getProjectCode() : null)
                .projectName(project != null ? project.getName() : null)
                .projectStatus(project != null ? project.getStatus() : null)
                .employeeId(employee != null ? employee.getId() : null)
                .employeeCode(employee != null ? employee.getEmployeeCode() : null)
                .employeeName(employee != null ? buildEmployeeName(employee) : null)
                .startDate(allocation.getStartDate())
                .endDate(allocation.getEndDate())
                .allocationPercent(allocation.getAllocationPercent())
                .build();
    }

    private String buildEmployeeName(Employee employee) {
        String first = employee.getFirstName();
        String last = employee.getLastName();
        if (last == null || last.isBlank()) {
            return first;
        }
        return first + " " + last;
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
