package com.hrms.api.resourcemanagement;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.common.security.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.util.*;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ResourcePoolController.class)
@ContextConfiguration(classes = {ResourcePoolController.class, ResourcePoolControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("ResourcePoolController Unit Tests")
class ResourcePoolControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @MockitoBean private ApiKeyService apiKeyService;
    @MockitoBean private JwtTokenProvider jwtTokenProvider;
    @MockitoBean private UserDetailsService userDetailsService;
    @MockitoBean private ApiKeyAuthenticationFilter apiKeyAuthenticationFilter;
    @MockitoBean private JwtAuthenticationFilter jwtAuthenticationFilter;
    @MockitoBean private RateLimitFilter rateLimitFilter;
    @MockitoBean private RateLimitingFilter rateLimitingFilter;
    @MockitoBean private TenantFilter tenantFilter;

    private UUID poolId;

    @BeforeEach
    void setUp() {
        poolId = UUID.randomUUID();
    }

    @Configuration
    static class TestConfig {
        @Bean
        public org.springframework.data.domain.AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }

    @Test
    @DisplayName("Should list resource pools returning empty list")
    void shouldListResourcePoolsReturningEmptyList() throws Exception {
        mockMvc.perform(get("/api/v1/resource-pools"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    @DisplayName("Should list resource pools with pagination params")
    void shouldListResourcePoolsWithPaginationParams() throws Exception {
        mockMvc.perform(get("/api/v1/resource-pools")
                        .param("page", "0")
                        .param("size", "10")
                        .param("poolType", "SHARED"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    @DisplayName("Should create resource pool successfully")
    void shouldCreateResourcePoolSuccessfully() throws Exception {
        ResourcePoolController.CreatePoolRequest request = new ResourcePoolController.CreatePoolRequest();
        request.setName("Engineering Pool");
        request.setDescription("Backend engineers");
        request.setPoolType("SHARED");
        request.setMemberEmployeeIds(Arrays.asList(UUID.randomUUID(), UUID.randomUUID()));

        mockMvc.perform(post("/api/v1/resource-pools")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Engineering Pool"))
                .andExpect(jsonPath("$.description").value("Backend engineers"))
                .andExpect(jsonPath("$.poolType").value("SHARED"))
                .andExpect(jsonPath("$.memberCount").value(2))
                .andExpect(jsonPath("$.active").value(true))
                .andExpect(jsonPath("$.message").exists());
    }

    @Test
    @DisplayName("Should return 400 for create pool with blank name")
    void shouldReturn400ForBlankName() throws Exception {
        ResourcePoolController.CreatePoolRequest request = new ResourcePoolController.CreatePoolRequest();
        request.setName("");

        mockMvc.perform(post("/api/v1/resource-pools")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Should get pool by ID returning 404 (stub)")
    void shouldGetPoolByIdReturning404() throws Exception {
        mockMvc.perform(get("/api/v1/resource-pools/{id}", poolId))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Should get pool members returning empty list")
    void shouldGetPoolMembersReturningEmptyList() throws Exception {
        mockMvc.perform(get("/api/v1/resource-pools/{id}/members", poolId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    @DisplayName("Should add members to pool")
    void shouldAddMembersToPool() throws Exception {
        List<UUID> employeeIds = Arrays.asList(UUID.randomUUID(), UUID.randomUUID());

        mockMvc.perform(post("/api/v1/resource-pools/{id}/members", poolId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(employeeIds)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.poolId").value(poolId.toString()))
                .andExpect(jsonPath("$.addedCount").value(2))
                .andExpect(jsonPath("$.message").value("Members added to pool."));
    }

    @Test
    @DisplayName("Should remove member from pool")
    void shouldRemoveMemberFromPool() throws Exception {
        UUID employeeId = UUID.randomUUID();

        mockMvc.perform(delete("/api/v1/resource-pools/{id}/members/{employeeId}", poolId, employeeId))
                .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("Should create pool with default pool type when not specified")
    void shouldCreatePoolWithDefaultPoolType() throws Exception {
        ResourcePoolController.CreatePoolRequest request = new ResourcePoolController.CreatePoolRequest();
        request.setName("Default Type Pool");

        mockMvc.perform(post("/api/v1/resource-pools")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.poolType").value("SHARED"))
                .andExpect(jsonPath("$.memberCount").value(0));
    }
}
