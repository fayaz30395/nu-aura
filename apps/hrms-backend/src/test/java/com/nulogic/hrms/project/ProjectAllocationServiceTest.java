package com.nulogic.hrms.project;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

import com.nulogic.hrms.audit.AuditService;
import com.nulogic.hrms.employee.Employee;
import com.nulogic.hrms.employee.EmployeeRepository;
import com.nulogic.hrms.iam.AuthorizationService;
import com.nulogic.hrms.iam.model.PermissionScope;
import com.nulogic.hrms.iam.repo.UserRepository;
import com.nulogic.hrms.org.Org;
import com.nulogic.hrms.org.OrgService;
import com.nulogic.hrms.project.dto.ProjectAllocationCreateRequest;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ProjectAllocationServiceTest {
    @Mock
    private ProjectAllocationRepository projectAllocationRepository;
    @Mock
    private ProjectRepository projectRepository;
    @Mock
    private EmployeeRepository employeeRepository;
    @Mock
    private AuthorizationService authorizationService;
    @Mock
    private OrgService orgService;
    @Mock
    private AuditService auditService;
    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private ProjectAllocationService projectAllocationService;

    @Test
    void createRejectsInactiveProject() {
        UUID userId = UUID.randomUUID();
        Org org = new Org();
        org.setId(UUID.randomUUID());

        Project project = new Project();
        project.setId(UUID.randomUUID());
        project.setOrg(org);
        project.setStatus(ProjectStatus.DRAFT);

        Employee employee = new Employee();
        employee.setId(UUID.randomUUID());
        employee.setOrg(org);

        ProjectAllocationCreateRequest request = new ProjectAllocationCreateRequest();
        request.setEmployeeId(employee.getId());
        request.setStartDate(LocalDate.now());
        request.setEndDate(LocalDate.now().plusDays(5));
        request.setAllocationPercent(BigDecimal.valueOf(50));

        when(authorizationService.allowedScopes(userId, "ALLOCATION", "CREATE"))
                .thenReturn(Set.of(PermissionScope.ORG));
        when(orgService.getOrCreateOrg()).thenReturn(org);
        when(projectRepository.findByOrg_IdAndId(org.getId(), project.getId()))
                .thenReturn(Optional.of(project));
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> projectAllocationService.create(userId, project.getId(), request));
        assertEquals("Allocations are only allowed on active projects", ex.getMessage());
    }

    @Test
    void createRejectsOverallocation() {
        UUID userId = UUID.randomUUID();
        Org org = new Org();
        org.setId(UUID.randomUUID());

        Employee owner = new Employee();
        owner.setId(UUID.randomUUID());
        owner.setOrg(org);

        Project project = new Project();
        project.setId(UUID.randomUUID());
        project.setOrg(org);
        project.setStatus(ProjectStatus.ACTIVE);
        project.setOwner(owner);

        Employee employee = new Employee();
        employee.setId(UUID.randomUUID());
        employee.setOrg(org);
        employee.setManager(owner);

        ProjectAllocation existing = new ProjectAllocation();
        existing.setStartDate(LocalDate.of(2025, 1, 1));
        existing.setEndDate(LocalDate.of(2025, 1, 31));
        existing.setAllocationPercent(BigDecimal.valueOf(70));

        ProjectAllocationCreateRequest request = new ProjectAllocationCreateRequest();
        request.setEmployeeId(employee.getId());
        request.setStartDate(LocalDate.of(2025, 1, 15));
        request.setEndDate(LocalDate.of(2025, 1, 20));
        request.setAllocationPercent(BigDecimal.valueOf(40));

        when(authorizationService.allowedScopes(userId, "ALLOCATION", "CREATE"))
                .thenReturn(Set.of(PermissionScope.TEAM));
        when(orgService.getOrCreateOrg()).thenReturn(org);
        when(projectRepository.findByOrg_IdAndId(org.getId(), project.getId()))
                .thenReturn(Optional.of(project));
        when(employeeRepository.findById(employee.getId())).thenReturn(Optional.of(employee));
        when(employeeRepository.findByOrg_IdAndUser_Id(org.getId(), userId))
                .thenReturn(Optional.of(owner));
        when(projectAllocationRepository.findOverlappingActiveAllocations(
                org.getId(), employee.getId(), request.getStartDate(), request.getEndDate(), null))
                .thenReturn(List.of(existing));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> projectAllocationService.create(userId, project.getId(), request));
        assertEquals("Allocation exceeds 100% capacity", ex.getMessage());
    }
}
