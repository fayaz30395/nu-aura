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
import com.nulogic.hrms.project.dto.ProjectCreateRequest;
import java.time.LocalDate;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ProjectServiceTest {
    @Mock
    private ProjectRepository projectRepository;
    @Mock
    private ProjectAllocationRepository projectAllocationRepository;
    @Mock
    private EmployeeRepository employeeRepository;
    @Mock
    private AuthorizationService authorizationService;
    @Mock
    private OrgService orgService;
    @Mock
    private ProjectCodeGenerator projectCodeGenerator;
    @Mock
    private AuditService auditService;
    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private ProjectService projectService;

    @Test
    void createClientProjectRequiresClientName() {
        UUID userId = UUID.randomUUID();
        Org org = new Org();
        org.setId(UUID.randomUUID());
        Employee owner = new Employee();
        owner.setId(UUID.randomUUID());
        owner.setOrg(org);

        ProjectCreateRequest request = new ProjectCreateRequest();
        request.setName("Client rollout");
        request.setType(ProjectType.CLIENT);
        request.setOwnerId(owner.getId());
        request.setStartDate(LocalDate.now());

        when(authorizationService.allowedScopes(userId, "PROJECT", "CREATE"))
                .thenReturn(Set.of(PermissionScope.ORG));
        when(orgService.getOrCreateOrg()).thenReturn(org);
        when(employeeRepository.findById(owner.getId())).thenReturn(Optional.of(owner));
        when(projectCodeGenerator.nextCode(org.getId())).thenReturn("NLG-PRJ-0001");

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> projectService.create(userId, request));
        assertEquals("Client name is required for client projects", ex.getMessage());
    }

    @Test
    void createProjectRejectsOwnerOutsideScope() {
        UUID userId = UUID.randomUUID();
        Org org = new Org();
        org.setId(UUID.randomUUID());

        Employee owner = new Employee();
        owner.setId(UUID.randomUUID());
        owner.setOrg(org);

        Employee self = new Employee();
        self.setId(UUID.randomUUID());
        self.setOrg(org);

        ProjectCreateRequest request = new ProjectCreateRequest();
        request.setName("Internal revamp");
        request.setType(ProjectType.INTERNAL);
        request.setOwnerId(owner.getId());
        request.setStartDate(LocalDate.now());

        when(authorizationService.allowedScopes(userId, "PROJECT", "CREATE"))
                .thenReturn(Set.of(PermissionScope.TEAM));
        when(orgService.getOrCreateOrg()).thenReturn(org);
        when(employeeRepository.findById(owner.getId())).thenReturn(Optional.of(owner));
        when(employeeRepository.findByOrg_IdAndUser_Id(org.getId(), userId))
                .thenReturn(Optional.of(self));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> projectService.create(userId, request));
        assertEquals("Project owner must be current user", ex.getMessage());
    }
}
