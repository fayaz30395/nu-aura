package com.hrms.api.resourcemanagement;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.application.resourcemanagement.service.ResourceManagementService;
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
import org.springframework.data.domain.*;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.*;

import static com.hrms.api.resourcemanagement.dto.AllocationDTOs.*;
import static com.hrms.api.resourcemanagement.dto.ApprovalDTOs.*;
import static com.hrms.api.resourcemanagement.dto.WorkloadDTOs.*;
import static com.hrms.api.resourcemanagement.dto.AvailabilityDTOs.*;
import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ResourceManagementController.class)
@ContextConfiguration(classes = {ResourceManagementController.class, ResourceManagementControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("ResourceManagementController Unit Tests")
class ResourceManagementControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @MockitoBean
    private ResourceManagementService resourceManagementService;
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
    private UUID requestId;
    private EmployeeCapacity employeeCapacity;

    @BeforeEach
    void setUp() {
        employeeId = UUID.randomUUID();
        projectId = UUID.randomUUID();
        requestId = UUID.randomUUID();

        employeeCapacity = EmployeeCapacity.builder()
                .employeeId(employeeId)
                .employeeName("John Doe")
                .totalAllocation(60)
                .availableCapacity(40)
                .isOverAllocated(false)
                .allocationStatus(AllocationStatus.OPTIMAL)
                .build();
    }

    @Test
    @DisplayName("Should get employee capacity")
    void shouldGetEmployeeCapacity() throws Exception {
        when(resourceManagementService.getEmployeeCapacity(eq(employeeId), org.mockito.ArgumentMatchers.any(LocalDate.class)))
                .thenReturn(employeeCapacity);

        mockMvc.perform(get("/api/v1/resource-management/capacity/employee/{employeeId}", employeeId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.employeeId").value(employeeId.toString()))
                .andExpect(jsonPath("$.totalAllocation").value(60))
                .andExpect(jsonPath("$.availableCapacity").value(40));

        verify(resourceManagementService).getEmployeeCapacity(eq(employeeId), org.mockito.ArgumentMatchers.any(LocalDate.class));
    }

    @Test
    @DisplayName("Should get multiple employees capacity")
    void shouldGetEmployeesCapacity() throws Exception {
        when(resourceManagementService.getEmployeesCapacity(any(), org.mockito.ArgumentMatchers.any(LocalDate.class)))
                .thenReturn(Collections.singletonList(employeeCapacity));

        mockMvc.perform(get("/api/v1/resource-management/capacity/employees"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)));

        verify(resourceManagementService).getEmployeesCapacity(any(), org.mockito.ArgumentMatchers.any(LocalDate.class));
    }

    @Test
    @DisplayName("Should validate allocation")
    void shouldValidateAllocation() throws Exception {
        AllocationValidationResult result = AllocationValidationResult.builder()
                .isValid(true)
                .requiresApproval(false)
                .currentTotalAllocation(40)
                .proposedAllocation(30)
                .resultingAllocation(70)
                .message("Allocation is valid")
                .build();

        when(resourceManagementService.validateAllocation(
                eq(employeeId), eq(projectId), eq(30), org.mockito.ArgumentMatchers.any(LocalDate.class), isNull()))
                .thenReturn(result);

        mockMvc.perform(get("/api/v1/resource-management/allocation/validate")
                        .param("employeeId", employeeId.toString())
                        .param("projectId", projectId.toString())
                        .param("allocationPercentage", "30"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isValid").value(true))
                .andExpect(jsonPath("$.resultingAllocation").value(70));

        verify(resourceManagementService).validateAllocation(
                eq(employeeId), eq(projectId), eq(30), org.mockito.ArgumentMatchers.any(LocalDate.class), isNull());
    }

    @Test
    @DisplayName("Should get over-allocated employees")
    void shouldGetOverAllocatedEmployees() throws Exception {
        EmployeeCapacity overAllocated = EmployeeCapacity.builder()
                .employeeId(employeeId)
                .totalAllocation(120)
                .isOverAllocated(true)
                .allocationStatus(AllocationStatus.OVER_ALLOCATED)
                .build();

        when(resourceManagementService.getOverAllocatedEmployees(any(), org.mockito.ArgumentMatchers.any(Pageable.class)))
                .thenReturn(Collections.singletonList(overAllocated));

        mockMvc.perform(get("/api/v1/resource-management/capacity/over-allocated"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].isOverAllocated").value(true));

        verify(resourceManagementService).getOverAllocatedEmployees(any(), org.mockito.ArgumentMatchers.any(Pageable.class));
    }

    @Test
    @DisplayName("Should get available employees")
    void shouldGetAvailableEmployees() throws Exception {
        when(resourceManagementService.getAvailableEmployees(eq(20), any(), org.mockito.ArgumentMatchers.any(Pageable.class)))
                .thenReturn(Collections.singletonList(employeeCapacity));

        mockMvc.perform(get("/api/v1/resource-management/capacity/available"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)));

        verify(resourceManagementService).getAvailableEmployees(eq(20), any(), org.mockito.ArgumentMatchers.any(Pageable.class));
    }

    @Test
    @DisplayName("Should get pending approvals count")
    void shouldGetPendingApprovalsCount() throws Exception {
        when(resourceManagementService.getPendingApprovalsCount()).thenReturn(5L);

        mockMvc.perform(get("/api/v1/resource-management/allocation-requests/pending/count"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.count").value(5));

        verify(resourceManagementService).getPendingApprovalsCount();
    }

    @Test
    @DisplayName("Should approve allocation request")
    void shouldApproveAllocationRequest() throws Exception {
        ApproveRequest request = new ApproveRequest();
        request.setComment("Approved for project needs");

        doNothing().when(resourceManagementService)
                .approveAllocationRequest(eq(requestId), anyString());

        mockMvc.perform(post("/api/v1/resource-management/allocation-requests/{requestId}/approve", requestId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());

        verify(resourceManagementService).approveAllocationRequest(eq(requestId), anyString());
    }

    @Test
    @DisplayName("Should reject allocation request")
    void shouldRejectAllocationRequest() throws Exception {
        RejectRequest request = new RejectRequest();
        request.setReason("Over-allocation risk");

        doNothing().when(resourceManagementService)
                .rejectAllocationRequest(eq(requestId), anyString());

        mockMvc.perform(post("/api/v1/resource-management/allocation-requests/{requestId}/reject", requestId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());

        verify(resourceManagementService).rejectAllocationRequest(eq(requestId), anyString());
    }

    @Test
    @DisplayName("Should get employee workload")
    void shouldGetEmployeeWorkload() throws Exception {
        EmployeeWorkload workload = EmployeeWorkload.builder()
                .employeeId(employeeId)
                .employeeName("John Doe")
                .totalAllocation(60)
                .projectCount(2)
                .build();

        when(resourceManagementService.getEmployeeWorkload(employeeId))
                .thenReturn(workload);

        mockMvc.perform(get("/api/v1/resource-management/workload/employee/{employeeId}", employeeId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.employeeId").value(employeeId.toString()))
                .andExpect(jsonPath("$.totalAllocation").value(60))
                .andExpect(jsonPath("$.projectCount").value(2));

        verify(resourceManagementService).getEmployeeWorkload(employeeId);
    }

    @Configuration
    static class TestConfig {
        @Bean
        public org.springframework.data.domain.AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }
}
