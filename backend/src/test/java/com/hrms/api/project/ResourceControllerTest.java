package com.hrms.api.project;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.project.dto.*;
import com.hrms.application.project.service.ResourceAllocationService;
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

import java.time.LocalDate;
import java.util.*;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ResourceController.class)
@ContextConfiguration(classes = {ResourceController.class, ResourceControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("ResourceController Unit Tests")
class ResourceControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @MockitoBean
    private ResourceAllocationService allocationService;
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
    private UUID allocationId;

    @BeforeEach
    void setUp() {
        employeeId = UUID.randomUUID();
        allocationId = UUID.randomUUID();
    }

    @Test
    @DisplayName("Should get allocation summary")
    void shouldGetAllocationSummary() throws Exception {
        AllocationSummaryResponse summary = AllocationSummaryResponse.builder()
                .employeeId(employeeId)
                .totalAllocationPercent(80)
                .isOverAllocated(false)
                .build();

        when(allocationService.getAllocationSummary())
                .thenReturn(Collections.singletonList(summary));

        mockMvc.perform(get("/api/v1/resources/allocation-summary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].totalAllocationPercent").value(80));

        verify(allocationService).getAllocationSummary();
    }

    @Test
    @DisplayName("Should get employee timeline")
    void shouldGetEmployeeTimeline() throws Exception {
        EmployeeTimelineResponse timeline = EmployeeTimelineResponse.builder()
                .employeeId(employeeId)
                .employeeName("John Doe")
                .build();

        when(allocationService.getEmployeeTimeline(employeeId))
                .thenReturn(timeline);

        mockMvc.perform(get("/api/v1/resources/employees/{employeeId}/timeline", employeeId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.employeeId").value(employeeId.toString()))
                .andExpect(jsonPath("$.employeeName").value("John Doe"));

        verify(allocationService).getEmployeeTimeline(employeeId);
    }

    @Test
    @DisplayName("Should reallocate resource successfully")
    void shouldReallocateResourceSuccessfully() throws Exception {
        ReallocateRequest request = new ReallocateRequest();
        request.setAllocationPercentage(60);
        request.setRole("Senior Developer");
        request.setStartDate(LocalDate.now());

        ProjectEmployeeResponse response = ProjectEmployeeResponse.builder()
                .id(allocationId)
                .allocationPercentage(60)
                .role("Senior Developer")
                .build();

        when(allocationService.reallocate(eq(allocationId), org.mockito.ArgumentMatchers.any(ReallocateRequest.class)))
                .thenReturn(response);

        mockMvc.perform(put("/api/v1/resources/allocations/{allocationId}", allocationId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.allocationPercentage").value(60))
                .andExpect(jsonPath("$.role").value("Senior Developer"));

        verify(allocationService).reallocate(eq(allocationId), org.mockito.ArgumentMatchers.any(ReallocateRequest.class));
    }

    @Test
    @DisplayName("Should get available resources with default minimum percent")
    void shouldGetAvailableResourcesWithDefault() throws Exception {
        AvailableResourceResponse resource = AvailableResourceResponse.builder()
                .employeeId(employeeId)
                .employeeName("Jane Doe")
                .availablePercent(40)
                .build();

        when(allocationService.getAvailableResources(20))
                .thenReturn(Collections.singletonList(resource));

        mockMvc.perform(get("/api/v1/resources/available"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].availablePercent").value(40));

        verify(allocationService).getAvailableResources(20);
    }

    @Test
    @DisplayName("Should get available resources with custom minimum percent")
    void shouldGetAvailableResourcesWithCustomPercent() throws Exception {
        when(allocationService.getAvailableResources(50))
                .thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/resources/available")
                        .param("minAvailablePercent", "50"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));

        verify(allocationService).getAvailableResources(50);
    }

    @Test
    @DisplayName("Should return empty allocation summary when no employees")
    void shouldReturnEmptyAllocationSummary() throws Exception {
        when(allocationService.getAllocationSummary())
                .thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/resources/allocation-summary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));

        verify(allocationService).getAllocationSummary();
    }

    @Configuration
    static class TestConfig {
        @Bean
        public org.springframework.data.domain.AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }
}
