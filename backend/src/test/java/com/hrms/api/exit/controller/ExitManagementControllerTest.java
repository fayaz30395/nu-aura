package com.hrms.api.exit.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.exit.dto.*;
import com.hrms.application.exit.service.ExitManagementService;
import com.hrms.common.security.*;
import com.hrms.domain.exit.ExitProcess;
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

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ExitManagementController.class)
@ContextConfiguration(classes = {ExitManagementController.class, ExitManagementControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("ExitManagementController Tests")
class ExitManagementControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @MockitoBean
    private ExitManagementService exitService;
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

    private UUID processId;
    private UUID employeeId;
    private ExitProcessResponse exitProcessResponse;
    private ExitProcessRequest exitProcessRequest;

    @BeforeEach
    void setUp() {
        processId = UUID.randomUUID();
        employeeId = UUID.randomUUID();

        exitProcessResponse = ExitProcessResponse.builder()
                .id(processId)
                .employeeId(employeeId)
                .exitType(ExitProcess.ExitType.RESIGNATION)
                .status(ExitProcess.ExitStatus.INITIATED)
                .resignationDate(LocalDate.now())
                .lastWorkingDate(LocalDate.now().plusDays(30))
                .noticePeriodDays(30)
                .reasonForLeaving("Better opportunity")
                .createdAt(LocalDateTime.now())
                .build();

        exitProcessRequest = new ExitProcessRequest();
        exitProcessRequest.setEmployeeId(employeeId);
        exitProcessRequest.setExitType(ExitProcess.ExitType.RESIGNATION);
        exitProcessRequest.setLastWorkingDate(LocalDate.now().plusDays(30));
        exitProcessRequest.setReasonForLeaving("Better opportunity");
    }

    @Configuration
    static class TestConfig {
        @Bean
        public org.springframework.data.domain.AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }

    @Test
    @DisplayName("Should create exit process successfully")
    void shouldCreateExitProcessSuccessfully() throws Exception {
        when(exitService.createExitProcess(any(ExitProcessRequest.class)))
                .thenReturn(exitProcessResponse);

        mockMvc.perform(post("/api/v1/exit/processes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(exitProcessRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(processId.toString()))
                .andExpect(jsonPath("$.exitType").value("RESIGNATION"))
                .andExpect(jsonPath("$.status").value("INITIATED"));

        verify(exitService).createExitProcess(any(ExitProcessRequest.class));
    }

    @Test
    @DisplayName("Should return 400 for invalid exit process request")
    void shouldReturn400ForInvalidRequest() throws Exception {
        ExitProcessRequest invalidRequest = new ExitProcessRequest();

        mockMvc.perform(post("/api/v1/exit/processes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Should update exit process successfully")
    void shouldUpdateExitProcess() throws Exception {
        when(exitService.updateExitProcess(eq(processId), any(ExitProcessRequest.class)))
                .thenReturn(exitProcessResponse);

        mockMvc.perform(put("/api/v1/exit/processes/{id}", processId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(exitProcessRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(processId.toString()));

        verify(exitService).updateExitProcess(eq(processId), any(ExitProcessRequest.class));
    }

    @Test
    @DisplayName("Should update exit status")
    void shouldUpdateExitStatus() throws Exception {
        ExitProcessResponse updatedResponse = ExitProcessResponse.builder()
                .id(processId)
                .status(ExitProcess.ExitStatus.IN_PROGRESS)
                .build();

        when(exitService.updateExitStatus(eq(processId), eq(ExitProcess.ExitStatus.IN_PROGRESS)))
                .thenReturn(updatedResponse);

        mockMvc.perform(patch("/api/v1/exit/processes/{id}/status", processId)
                        .param("status", "IN_PROGRESS"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("IN_PROGRESS"));

        verify(exitService).updateExitStatus(processId, ExitProcess.ExitStatus.IN_PROGRESS);
    }

    @Test
    @DisplayName("Should get exit process by ID")
    void shouldGetExitProcessById() throws Exception {
        when(exitService.getExitProcessById(processId)).thenReturn(exitProcessResponse);

        mockMvc.perform(get("/api/v1/exit/processes/{id}", processId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(processId.toString()))
                .andExpect(jsonPath("$.reasonForLeaving").value("Better opportunity"));

        verify(exitService).getExitProcessById(processId);
    }

    @Test
    @DisplayName("Should get exit process by employee")
    void shouldGetExitProcessByEmployee() throws Exception {
        when(exitService.getExitProcessByEmployee(employeeId)).thenReturn(exitProcessResponse);

        mockMvc.perform(get("/api/v1/exit/processes/employee/{employeeId}", employeeId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.employeeId").value(employeeId.toString()));

        verify(exitService).getExitProcessByEmployee(employeeId);
    }

    @Test
    @DisplayName("Should get all exit processes with pagination")
    void shouldGetAllExitProcesses() throws Exception {
        Page<ExitProcessResponse> page = new PageImpl<>(
                Collections.singletonList(exitProcessResponse), PageRequest.of(0, 20), 1);

        when(exitService.getAllExitProcesses(any(Pageable.class))).thenReturn(page);

        mockMvc.perform(get("/api/v1/exit/processes"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.totalElements").value(1));

        verify(exitService).getAllExitProcesses(any(Pageable.class));
    }

    @Test
    @DisplayName("Should get exit processes by status")
    void shouldGetExitProcessesByStatus() throws Exception {
        when(exitService.getExitProcessesByStatus(ExitProcess.ExitStatus.INITIATED))
                .thenReturn(Collections.singletonList(exitProcessResponse));

        mockMvc.perform(get("/api/v1/exit/processes/status/{status}", "INITIATED"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)));

        verify(exitService).getExitProcessesByStatus(ExitProcess.ExitStatus.INITIATED);
    }

    @Test
    @DisplayName("Should delete exit process")
    void shouldDeleteExitProcess() throws Exception {
        doNothing().when(exitService).deleteExitProcess(processId);

        mockMvc.perform(delete("/api/v1/exit/processes/{id}", processId))
                .andExpect(status().isNoContent());

        verify(exitService).deleteExitProcess(processId);
    }

    @Test
    @DisplayName("Should get exit dashboard")
    void shouldGetExitDashboard() throws Exception {
        Map<String, Object> dashboard = new HashMap<>();
        dashboard.put("activeExits", 5);
        dashboard.put("pendingClearances", 3);

        when(exitService.getExitDashboard()).thenReturn(dashboard);

        mockMvc.perform(get("/api/v1/exit/dashboard"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.activeExits").value(5))
                .andExpect(jsonPath("$.pendingClearances").value(3));

        verify(exitService).getExitDashboard();
    }
}
