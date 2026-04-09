package com.hrms.api.psa.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.application.psa.service.PSAService;
import com.hrms.common.security.*;
import com.hrms.domain.psa.PSAProject;
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

import java.util.*;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(PSAProjectController.class)
@ContextConfiguration(classes = {PSAProjectController.class, PSAProjectControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("PSAProjectController Unit Tests")
class PSAProjectControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @MockitoBean private PSAService psaService;
    @MockitoBean private ApiKeyService apiKeyService;
    @MockitoBean private JwtTokenProvider jwtTokenProvider;
    @MockitoBean private UserDetailsService userDetailsService;
    @MockitoBean private ApiKeyAuthenticationFilter apiKeyAuthenticationFilter;
    @MockitoBean private JwtAuthenticationFilter jwtAuthenticationFilter;
    @MockitoBean private RateLimitFilter rateLimitFilter;
    @MockitoBean private RateLimitingFilter rateLimitingFilter;
    @MockitoBean private TenantFilter tenantFilter;

    private UUID psaProjectId;
    private PSAProject psaProject;

    @BeforeEach
    void setUp() {
        psaProjectId = UUID.randomUUID();
        psaProject = new PSAProject();
        psaProject.setId(psaProjectId);
        psaProject.setProjectName("PSA Test Project");
        psaProject.setStatus(PSAProject.ProjectStatus.ACTIVE);
    }

    @Configuration
    static class TestConfig {
        @Bean
        public org.springframework.data.domain.AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }

    @Test
    @DisplayName("Should create PSA project successfully")
    void shouldCreatePSAProjectSuccessfully() throws Exception {
        when(psaService.createProject(org.mockito.ArgumentMatchers.any(PSAProject.class))).thenReturn(psaProject);

        mockMvc.perform(post("/api/v1/psa/projects")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(psaProject)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(psaProjectId.toString()))
                .andExpect(jsonPath("$.projectName").value("PSA Test Project"));

        verify(psaService).createProject(org.mockito.ArgumentMatchers.any(PSAProject.class));
    }

    @Test
    @DisplayName("Should get all PSA projects with pagination")
    void shouldGetAllPSAProjectsWithPagination() throws Exception {
        Page<PSAProject> page = new PageImpl<>(
                Collections.singletonList(psaProject),
                PageRequest.of(0, 20),
                1
        );

        when(psaService.getAllProjects(org.mockito.ArgumentMatchers.any(Pageable.class))).thenReturn(page);

        mockMvc.perform(get("/api/v1/psa/projects"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.totalElements").value(1));

        verify(psaService).getAllProjects(org.mockito.ArgumentMatchers.any(Pageable.class));
    }

    @Test
    @DisplayName("Should get PSA project by ID")
    void shouldGetPSAProjectById() throws Exception {
        when(psaService.getProject(psaProjectId)).thenReturn(Optional.of(psaProject));

        mockMvc.perform(get("/api/v1/psa/projects/{id}", psaProjectId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.projectName").value("PSA Test Project"));

        verify(psaService).getProject(psaProjectId);
    }

    @Test
    @DisplayName("Should return 404 for non-existent PSA project")
    void shouldReturn404ForNonExistentPSAProject() throws Exception {
        UUID nonExistentId = UUID.randomUUID();
        when(psaService.getProject(nonExistentId)).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/psa/projects/{id}", nonExistentId))
                .andExpect(status().isNotFound());

        verify(psaService).getProject(nonExistentId);
    }

    @Test
    @DisplayName("Should get PSA projects by status")
    void shouldGetPSAProjectsByStatus() throws Exception {
        when(psaService.getProjectsByStatus(PSAProject.ProjectStatus.ACTIVE))
                .thenReturn(Collections.singletonList(psaProject));

        mockMvc.perform(get("/api/v1/psa/projects/status/{status}", "ACTIVE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].status").value("ACTIVE"));

        verify(psaService).getProjectsByStatus(PSAProject.ProjectStatus.ACTIVE);
    }

    @Test
    @DisplayName("Should update PSA project successfully")
    void shouldUpdatePSAProjectSuccessfully() throws Exception {
        PSAProject updated = new PSAProject();
        updated.setId(psaProjectId);
        updated.setProjectName("Updated PSA Project");
        updated.setStatus(PSAProject.ProjectStatus.COMPLETED);

        when(psaService.updateProject(eq(psaProjectId), org.mockito.ArgumentMatchers.any(PSAProject.class)))
                .thenReturn(Optional.of(updated));

        mockMvc.perform(put("/api/v1/psa/projects/{id}", psaProjectId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updated)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.projectName").value("Updated PSA Project"));

        verify(psaService).updateProject(eq(psaProjectId), org.mockito.ArgumentMatchers.any(PSAProject.class));
    }

    @Test
    @DisplayName("Should delete PSA project successfully")
    void shouldDeletePSAProjectSuccessfully() throws Exception {
        when(psaService.deleteProject(psaProjectId)).thenReturn(true);

        mockMvc.perform(delete("/api/v1/psa/projects/{id}", psaProjectId))
                .andExpect(status().isNoContent());

        verify(psaService).deleteProject(psaProjectId);
    }

    @Test
    @DisplayName("Should return 404 when deleting non-existent PSA project")
    void shouldReturn404WhenDeletingNonExistentProject() throws Exception {
        UUID nonExistentId = UUID.randomUUID();
        when(psaService.deleteProject(nonExistentId)).thenReturn(false);

        mockMvc.perform(delete("/api/v1/psa/projects/{id}", nonExistentId))
                .andExpect(status().isNotFound());

        verify(psaService).deleteProject(nonExistentId);
    }

    @Test
    @DisplayName("Should allocate resources to PSA project")
    void shouldAllocateResourcesToPSAProject() throws Exception {
        Map<String, Object> allocation = new HashMap<>();
        allocation.put("employeeId", UUID.randomUUID().toString());
        allocation.put("allocationPercentage", 50);

        when(psaService.allocateResources(eq(psaProjectId), org.mockito.ArgumentMatchers.any(Map.class)))
                .thenReturn(Optional.of(psaProject));

        mockMvc.perform(post("/api/v1/psa/projects/{id}/allocate", psaProjectId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(allocation)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(psaProjectId.toString()));

        verify(psaService).allocateResources(eq(psaProjectId), org.mockito.ArgumentMatchers.any(Map.class));
    }
}
