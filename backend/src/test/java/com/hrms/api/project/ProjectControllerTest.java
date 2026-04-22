package com.hrms.api.project;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.project.dto.*;
import com.hrms.application.project.service.ProjectService;
import com.hrms.common.security.*;
import com.hrms.domain.project.Project;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.*;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ProjectController.class)
@ContextConfiguration(classes = {ProjectController.class, ProjectControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("ProjectController Unit Tests")
class ProjectControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @MockitoBean
    private ProjectService projectService;
    @MockitoBean
    private ApiKeyService apiKeyService;
    @MockitoBean
    private JwtTokenProvider jwtTokenProvider;
    @MockitoBean
    private UserDetailsService userDetailsService;
    @MockitoBean
    private ApiKeyAuthenticationFilter apiKeyAuthenticationFilter;
    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;
    @MockitoBean
    private RateLimitFilter rateLimitFilter;
    @MockitoBean
    private RateLimitingFilter rateLimitingFilter;
    @MockitoBean
    private TenantFilter tenantFilter;

    private UUID projectId;
    private UUID employeeId;
    private ProjectResponse projectResponse;

    @BeforeEach
    void setUp() {
        projectId = UUID.randomUUID();
        employeeId = UUID.randomUUID();

        projectResponse = ProjectResponse.builder()
                .id(projectId)
                .projectCode("PRJ-001")
                .name("Test Project")
                .description("A test project")
                .startDate(LocalDate.now())
                .status(Project.ProjectStatus.IN_PROGRESS)
                .priority(Project.Priority.HIGH)
                .budget(new BigDecimal("50000"))
                .currency("USD")
                .createdAt(LocalDateTime.now())
                .build();
    }

    @Test
    @DisplayName("Should create project successfully")
    void shouldCreateProjectSuccessfully() throws Exception {
        CreateProjectRequest request = new CreateProjectRequest();
        request.setProjectCode("PRJ-001");
        request.setName("Test Project");
        request.setStartDate(LocalDate.now());
        request.setStatus(Project.ProjectStatus.IN_PROGRESS);
        request.setPriority(Project.Priority.HIGH);

        when(projectService.createProject(org.mockito.ArgumentMatchers.any(CreateProjectRequest.class)))
                .thenReturn(projectResponse);

        mockMvc.perform(post("/api/v1/projects")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(projectId.toString()))
                .andExpect(jsonPath("$.name").value("Test Project"));

        verify(projectService).createProject(org.mockito.ArgumentMatchers.any(CreateProjectRequest.class));
    }

    @Test
    @DisplayName("Should return 400 for invalid create project request")
    void shouldReturn400ForInvalidCreateRequest() throws Exception {
        CreateProjectRequest request = new CreateProjectRequest();

        mockMvc.perform(post("/api/v1/projects")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Should get all projects with pagination")
    void shouldGetAllProjectsWithPagination() throws Exception {
        Page<ProjectResponse> page = new PageImpl<>(
                Collections.singletonList(projectResponse),
                PageRequest.of(0, 20),
                1
        );

        when(projectService.getAllProjects(any(), any(), org.mockito.ArgumentMatchers.any(Pageable.class)))
                .thenReturn(page);

        mockMvc.perform(get("/api/v1/projects"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.totalElements").value(1));

        verify(projectService).getAllProjects(any(), any(), org.mockito.ArgumentMatchers.any(Pageable.class));
    }

    @Test
    @DisplayName("Should search projects by query")
    void shouldSearchProjects() throws Exception {
        Page<ProjectResponse> page = new PageImpl<>(
                Collections.singletonList(projectResponse),
                PageRequest.of(0, 20),
                1
        );

        when(projectService.searchProjects(eq("Test"), org.mockito.ArgumentMatchers.any(Pageable.class)))
                .thenReturn(page);

        mockMvc.perform(get("/api/v1/projects/search")
                        .param("query", "Test"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].name").value("Test Project"));

        verify(projectService).searchProjects(eq("Test"), org.mockito.ArgumentMatchers.any(Pageable.class));
    }

    @Test
    @DisplayName("Should get project by ID")
    void shouldGetProjectById() throws Exception {
        when(projectService.getProject(projectId)).thenReturn(projectResponse);

        mockMvc.perform(get("/api/v1/projects/{id}", projectId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(projectId.toString()))
                .andExpect(jsonPath("$.projectCode").value("PRJ-001"));

        verify(projectService).getProject(projectId);
    }

    @Test
    @DisplayName("Should update project successfully")
    void shouldUpdateProjectSuccessfully() throws Exception {
        UpdateProjectRequest request = new UpdateProjectRequest();
        request.setName("Updated Project");

        ProjectResponse updated = ProjectResponse.builder()
                .id(projectId).name("Updated Project").build();

        when(projectService.updateProject(eq(projectId), org.mockito.ArgumentMatchers.any(UpdateProjectRequest.class)))
                .thenReturn(updated);

        mockMvc.perform(put("/api/v1/projects/{id}", projectId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Updated Project"));

        verify(projectService).updateProject(eq(projectId), org.mockito.ArgumentMatchers.any(UpdateProjectRequest.class));
    }

    @Test
    @DisplayName("Should delete project successfully")
    void shouldDeleteProjectSuccessfully() throws Exception {
        doNothing().when(projectService).deleteProject(projectId);

        mockMvc.perform(delete("/api/v1/projects/{id}", projectId))
                .andExpect(status().isNoContent());

        verify(projectService).deleteProject(projectId);
    }

    @Test
    @DisplayName("Should assign employee to project")
    void shouldAssignEmployeeToProject() throws Exception {
        AssignEmployeeRequest request = new AssignEmployeeRequest();
        request.setEmployeeId(employeeId);
        request.setStartDate(LocalDate.now());
        request.setAllocationPercentage(50);

        ProjectEmployeeResponse empResponse = ProjectEmployeeResponse.builder()
                .id(UUID.randomUUID())
                .projectId(projectId)
                .employeeId(employeeId)
                .role("Developer")
                .allocationPercentage(50)
                .build();

        when(projectService.assignEmployee(eq(projectId), org.mockito.ArgumentMatchers.any(AssignEmployeeRequest.class)))
                .thenReturn(empResponse);

        mockMvc.perform(post("/api/v1/projects/{id}/assign", projectId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.employeeId").value(employeeId.toString()));

        verify(projectService).assignEmployee(eq(projectId), org.mockito.ArgumentMatchers.any(AssignEmployeeRequest.class));
    }

    @Test
    @DisplayName("Should get project team members")
    void shouldGetProjectTeamMembers() throws Exception {
        ProjectEmployeeResponse member = ProjectEmployeeResponse.builder()
                .id(UUID.randomUUID()).projectId(projectId).employeeId(employeeId).role("Developer").build();

        when(projectService.getProjectTeamMembers(projectId))
                .thenReturn(Collections.singletonList(member));

        mockMvc.perform(get("/api/v1/projects/{id}/team", projectId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].role").value("Developer"));

        verify(projectService).getProjectTeamMembers(projectId);
    }

    @Test
    @DisplayName("Should get employee projects")
    void shouldGetEmployeeProjects() throws Exception {
        when(projectService.getEmployeeProjects(employeeId))
                .thenReturn(Collections.singletonList(projectResponse));

        mockMvc.perform(get("/api/v1/projects/employee/{employeeId}", employeeId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].name").value("Test Project"));

        verify(projectService).getEmployeeProjects(employeeId);
    }

    @Configuration
    static class TestConfig {
        @Bean
        public org.springframework.data.domain.AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }
}
