package com.hrms.api.resourcemanagement;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.application.resourcemanagement.service.ResourceConflictService;
import com.hrms.common.security.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.MockedStatic;
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

import java.time.LocalDate;
import java.util.*;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ResourceConflictController.class)
@ContextConfiguration(classes = {ResourceConflictController.class, ResourceConflictControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("ResourceConflictController Unit Tests")
class ResourceConflictControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @MockitoBean
    private ResourceConflictService resourceConflictService;
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

    private UUID employeeId;
    private UUID projectId;
    private UUID tenantId;

    @BeforeEach
    void setUp() {
        employeeId = UUID.randomUUID();
        projectId = UUID.randomUUID();
        tenantId = UUID.randomUUID();
    }

    @Test
    @DisplayName("Should check allocation conflict with no conflicts found")
    void shouldCheckConflictWithNoConflicts() throws Exception {
        ResourceConflictController.ConflictCheckRequest request = new ResourceConflictController.ConflictCheckRequest();
        request.setEmployeeId(employeeId);
        request.setProjectId(projectId);
        request.setStartDate(LocalDate.now());
        request.setEndDate(LocalDate.now().plusMonths(3));
        request.setAllocationPercentage(50);

        when(resourceConflictService.checkAllocationConflict(
                eq(employeeId), eq(projectId), org.mockito.ArgumentMatchers.any(LocalDate.class), org.mockito.ArgumentMatchers.any(LocalDate.class), eq(50)))
                .thenReturn(Collections.emptyList());

        mockMvc.perform(post("/api/v1/resource-management/conflicts/check")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));

        verify(resourceConflictService).checkAllocationConflict(
                eq(employeeId), eq(projectId), org.mockito.ArgumentMatchers.any(LocalDate.class), org.mockito.ArgumentMatchers.any(LocalDate.class), eq(50));
    }

    @Test
    @DisplayName("Should check allocation conflict with conflicts detected")
    void shouldCheckConflictWithConflictsDetected() throws Exception {
        ResourceConflictController.ConflictCheckRequest request = new ResourceConflictController.ConflictCheckRequest();
        request.setEmployeeId(employeeId);
        request.setProjectId(projectId);
        request.setStartDate(LocalDate.now());
        request.setEndDate(LocalDate.now().plusMonths(3));
        request.setAllocationPercentage(80);

        ResourceConflictService.ConflictResult conflict = new ResourceConflictService.ConflictResult(
                employeeId, projectId, UUID.randomUUID(),
                LocalDate.now(), LocalDate.now().plusMonths(3), 130, "Over-allocated");

        when(resourceConflictService.checkAllocationConflict(
                eq(employeeId), eq(projectId), org.mockito.ArgumentMatchers.any(LocalDate.class), org.mockito.ArgumentMatchers.any(LocalDate.class), eq(80)))
                .thenReturn(Collections.singletonList(conflict));

        mockMvc.perform(post("/api/v1/resource-management/conflicts/check")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)));

        verify(resourceConflictService).checkAllocationConflict(
                eq(employeeId), eq(projectId), org.mockito.ArgumentMatchers.any(LocalDate.class), org.mockito.ArgumentMatchers.any(LocalDate.class), eq(80));
    }

    @Test
    @DisplayName("Should scan tenant conflicts")
    void shouldScanTenantConflicts() throws Exception {
        try (MockedStatic<TenantContext> mockedTenantContext = mockStatic(TenantContext.class)) {
            mockedTenantContext.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);

            when(resourceConflictService.scanTenantConflicts(tenantId))
                    .thenReturn(Collections.emptyList());

            mockMvc.perform(post("/api/v1/resource-management/conflicts/scan"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(0)));

            verify(resourceConflictService).scanTenantConflicts(tenantId);
        }
    }

    @Test
    @DisplayName("Should get open conflicts")
    void shouldGetOpenConflicts() throws Exception {
        try (MockedStatic<TenantContext> mockedTenantContext = mockStatic(TenantContext.class)) {
            mockedTenantContext.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);

            Map<String, Object> conflictMap = new HashMap<>();
            conflictMap.put("conflictId", UUID.randomUUID().toString());
            conflictMap.put("type", "OVER_ALLOCATION");

            when(resourceConflictService.getOpenConflicts(tenantId))
                    .thenReturn(Collections.singletonList(conflictMap));

            mockMvc.perform(get("/api/v1/resource-management/conflicts/open"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(1)))
                    .andExpect(jsonPath("$[0].type").value("OVER_ALLOCATION"));

            verify(resourceConflictService).getOpenConflicts(tenantId);
        }
    }

    @Test
    @DisplayName("Should resolve conflict successfully")
    void shouldResolveConflictSuccessfully() throws Exception {
        UUID conflictId = UUID.randomUUID();
        UUID resolvedBy = UUID.randomUUID();

        ResourceConflictController.ResolveDto dto = new ResourceConflictController.ResolveDto();
        dto.setResolvedBy(resolvedBy);

        doNothing().when(resourceConflictService).resolveConflict(conflictId, resolvedBy);

        mockMvc.perform(post("/api/v1/resource-management/conflicts/{conflictId}/resolve", conflictId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isNoContent());

        verify(resourceConflictService).resolveConflict(conflictId, resolvedBy);
    }

    @Test
    @DisplayName("Should return 400 for invalid conflict check request - missing required fields")
    void shouldReturn400ForInvalidConflictCheckRequest() throws Exception {
        ResourceConflictController.ConflictCheckRequest request = new ResourceConflictController.ConflictCheckRequest();
        // Missing required fields: employeeId, projectId, startDate, allocationPercentage

        mockMvc.perform(post("/api/v1/resource-management/conflicts/check")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Configuration
    static class TestConfig {
        @Bean
        public org.springframework.data.domain.AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }
}
