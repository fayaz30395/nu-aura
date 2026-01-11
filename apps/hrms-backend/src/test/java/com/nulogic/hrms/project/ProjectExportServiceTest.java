package com.nulogic.hrms.project;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

import com.nulogic.hrms.employee.Employee;
import com.nulogic.hrms.employee.EmployeeRepository;
import com.nulogic.hrms.iam.AuthorizationService;
import com.nulogic.hrms.iam.model.PermissionScope;
import com.nulogic.hrms.org.Org;
import com.nulogic.hrms.org.OrgService;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ProjectExportServiceTest {
    @Mock
    private ProjectRepository projectRepository;
    @Mock
    private ProjectAllocationRepository projectAllocationRepository;
    @Mock
    private AuthorizationService authorizationService;
    @Mock
    private OrgService orgService;
    @Mock
    private EmployeeRepository employeeRepository;

    @InjectMocks
    private ProjectExportService projectExportService;

    @Test
    void exportProjectsDepartmentWithoutDepartmentReturnsHeaderOnly() {
        UUID userId = UUID.randomUUID();
        Org org = new Org();
        org.setId(UUID.randomUUID());

        Employee self = new Employee();
        self.setId(UUID.randomUUID());
        self.setOrg(org);

        when(authorizationService.resolveScope(userId, "PROJECT", "EXPORT"))
                .thenReturn(PermissionScope.DEPARTMENT);
        when(orgService.getOrCreateOrg()).thenReturn(org);
        when(employeeRepository.findByOrg_IdAndUser_Id(org.getId(), userId))
                .thenReturn(java.util.Optional.of(self));

        String csv = new String(projectExportService.exportProjects(userId, null, null, null, null), StandardCharsets.UTF_8).trim();
        String[] lines = csv.split("\\R");
        assertEquals(1, lines.length);
        assertEquals("project_id,project_code,name,type,status,owner_id,owner_employee_code,owner_name,owner_email,start_date,end_date,client_name,description,activated_at,closed_at,created_at,updated_at",
                lines[0]);
    }

    @Test
    void exportAllocationsSelfScopeRejectsOtherEmployee() {
        UUID userId = UUID.randomUUID();
        Org org = new Org();
        org.setId(UUID.randomUUID());

        Employee self = new Employee();
        self.setId(UUID.randomUUID());
        self.setOrg(org);

        when(authorizationService.resolveScope(userId, "ALLOCATION", "EXPORT"))
                .thenReturn(PermissionScope.SELF);
        when(orgService.getOrCreateOrg()).thenReturn(org);
        when(employeeRepository.findByOrg_IdAndUser_Id(org.getId(), userId))
                .thenReturn(java.util.Optional.of(self));

        String csv = new String(projectExportService.exportAllocations(userId, UUID.randomUUID(), null), StandardCharsets.UTF_8).trim();
        String[] lines = csv.split("\\R");
        assertEquals(1, lines.length);
        assertEquals("allocation_id,project_id,project_code,project_name,project_status,employee_id,employee_code,employee_name,employee_email,start_date,end_date,allocation_percent",
                lines[0]);
    }
}
