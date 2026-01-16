package com.hrms.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.resourcemanagement.dto.AllocationDTOs.UpdateAllocationRequest;
import com.hrms.common.security.Permission;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.config.TestSecurityConfig;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.project.Project;
import com.hrms.domain.project.ProjectEmployee;
import com.hrms.domain.user.RoleScope;
import com.hrms.domain.user.User;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.project.repository.HrmsProjectRepository;
import com.hrms.infrastructure.project.repository.ProjectEmployeeRepository;
import com.hrms.infrastructure.user.repository.UserRepository;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
@Import(TestSecurityConfig.class)
@Transactional
@DisplayName("Resource Management Allocation Integration Tests")
class ResourceManagementAllocationIntegrationTest {

    private static final String BASE_URL = "/api/v1/resource-management";
    private static final UUID TENANT_ID = UUID.fromString("550e8400-e29b-41d4-a716-446655440000");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EmployeeRepository employeeRepository;

    @Autowired
    private HrmsProjectRepository projectRepository;

    @Autowired
    private ProjectEmployeeRepository projectEmployeeRepository;

    @BeforeEach
    void setUp() {
        SecurityContext.clear();
        TenantContext.setCurrentTenant(TENANT_ID);
        setupProjectCreateScope(UUID.randomUUID());
    }

    @AfterEach
    void tearDown() {
        SecurityContext.clear();
    }

    @Test
    @WithMockUser(username = "manager@test.com", roles = {"MANAGER"})
    @DisplayName("PUT /allocation updates assignment and returns workload")
    void updateAllocationPersistsChanges() throws Exception {
        Employee employee = createEmployee("ALLOC-EMP");
        Project project = createProject("PRJ-ALLOC");
        ProjectEmployee assignment = createAssignment(employee.getId(), project.getId(), 25,
                LocalDate.now().minusDays(10), LocalDate.now().plusDays(20));

        UpdateAllocationRequest request = new UpdateAllocationRequest(
                employee.getId(),
                project.getId(),
                60,
                LocalDate.now(),
                LocalDate.now().plusDays(30)
        );

        mockMvc.perform(put(BASE_URL + "/allocation")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.employeeId").value(employee.getId().toString()))
                .andExpect(jsonPath("$.allocations").isArray())
                .andExpect(jsonPath("$.allocations[0].allocationPercentage").value(60));

        ProjectEmployee updated = projectEmployeeRepository
                .findByProjectIdAndEmployeeIdAndTenantId(project.getId(), employee.getId(), TENANT_ID)
                .orElseThrow();

        assertThat(updated.getAllocationPercentage()).isEqualTo(60);
        assertThat(updated.getStartDate()).isEqualTo(request.getStartDate());
        assertThat(updated.getEndDate()).isEqualTo(request.getEndDate());
        assertThat(updated.getIsActive()).isTrue();
        assertThat(updated.getId()).isEqualTo(assignment.getId());
    }

    private void setupProjectCreateScope(UUID employeeId) {
        Map<String, RoleScope> permissions = new HashMap<>();
        permissions.put(Permission.PROJECT_CREATE, RoleScope.ALL);
        permissions.put(Permission.SYSTEM_ADMIN, RoleScope.ALL);

        SecurityContext.setCurrentUser(UUID.randomUUID(), employeeId, Set.of("MANAGER"), permissions);
        SecurityContext.setCurrentTenantId(TENANT_ID);
    }

    private Employee createEmployee(String employeeCodePrefix) {
        User user = User.builder()
                .email(employeeCodePrefix.toLowerCase() + "@example.com")
                .firstName("Test")
                .lastName("User")
                .passwordHash("test-hash")
                .status(User.UserStatus.ACTIVE)
                .build();
        user.setTenantId(TENANT_ID);
        User savedUser = userRepository.save(user);

        Employee employee = Employee.builder()
                .employeeCode(employeeCodePrefix + "-" + UUID.randomUUID().toString().substring(0, 6))
                .firstName("Test")
                .lastName("Employee")
                .joiningDate(LocalDate.now().minusDays(30))
                .employmentType(Employee.EmploymentType.FULL_TIME)
                .status(Employee.EmployeeStatus.ACTIVE)
                .user(savedUser)
                .build();
        employee.setTenantId(TENANT_ID);
        return employeeRepository.save(employee);
    }

    private Project createProject(String projectCodePrefix) {
        Project project = Project.builder()
                .projectCode(projectCodePrefix + "-" + UUID.randomUUID().toString().substring(0, 6))
                .name("Test Project " + projectCodePrefix)
                .startDate(LocalDate.now().minusDays(30))
                .status(Project.ProjectStatus.IN_PROGRESS)
                .priority(Project.Priority.MEDIUM)
                .build();
        project.setTenantId(TENANT_ID);
        return projectRepository.save(project);
    }

    private ProjectEmployee createAssignment(UUID employeeId, UUID projectId, int allocation,
                                             LocalDate startDate, LocalDate endDate) {
        ProjectEmployee assignment = ProjectEmployee.builder()
                .employeeId(employeeId)
                .projectId(projectId)
                .allocationPercentage(allocation)
                .startDate(startDate)
                .endDate(endDate)
                .isActive(true)
                .build();
        assignment.setTenantId(TENANT_ID);
        return projectEmployeeRepository.save(assignment);
    }
}
