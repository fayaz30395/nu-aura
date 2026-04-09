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

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(OffboardingController.class)
@ContextConfiguration(classes = {OffboardingController.class, OffboardingControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("OffboardingController Tests")
class OffboardingControllerTest {

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
    private ExitProcessResponse offboardingResponse;
    private ExitProcessRequest offboardingRequest;

    @BeforeEach
    void setUp() {
        processId = UUID.randomUUID();
        employeeId = UUID.randomUUID();

        offboardingResponse = ExitProcessResponse.builder()
                .id(processId)
                .employeeId(employeeId)
                .exitType(ExitProcess.ExitType.RESIGNATION)
                .status(ExitProcess.ExitStatus.INITIATED)
                .lastWorkingDate(LocalDate.now().plusDays(30))
                .createdAt(LocalDateTime.now())
                .build();

        offboardingRequest = new ExitProcessRequest();
        offboardingRequest.setEmployeeId(employeeId);
        offboardingRequest.setExitType(ExitProcess.ExitType.RESIGNATION);
        offboardingRequest.setLastWorkingDate(LocalDate.now().plusDays(30));
    }

    @Configuration
    static class TestConfig {
        @Bean
        public org.springframework.data.domain.AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }

    @Test
    @DisplayName("Should create offboarding process successfully")
    void shouldCreateOffboarding() throws Exception {
        when(exitService.createExitProcess(any(ExitProcessRequest.class)))
                .thenReturn(offboardingResponse);

        mockMvc.perform(post("/api/v1/offboarding")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(offboardingRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(processId.toString()))
                .andExpect(jsonPath("$.status").value("INITIATED"));

        verify(exitService).createExitProcess(any(ExitProcessRequest.class));
    }

    @Test
    @DisplayName("Should return 400 for invalid offboarding request")
    void shouldReturn400ForInvalidRequest() throws Exception {
        ExitProcessRequest invalidRequest = new ExitProcessRequest();

        mockMvc.perform(post("/api/v1/offboarding")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Should get all offboarding processes with pagination")
    void shouldGetAllOffboardings() throws Exception {
        Page<ExitProcessResponse> page = new PageImpl<>(
                Collections.singletonList(offboardingResponse), PageRequest.of(0, 20), 1);

        when(exitService.getAllExitProcesses(any(Pageable.class))).thenReturn(page);

        mockMvc.perform(get("/api/v1/offboarding"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.totalElements").value(1));

        verify(exitService).getAllExitProcesses(any(Pageable.class));
    }

    @Test
    @DisplayName("Should get offboarding by ID")
    void shouldGetOffboardingById() throws Exception {
        when(exitService.getExitProcessById(processId)).thenReturn(offboardingResponse);

        mockMvc.perform(get("/api/v1/offboarding/{id}", processId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(processId.toString()));

        verify(exitService).getExitProcessById(processId);
    }

    @Test
    @DisplayName("Should get offboarding by employee ID")
    void shouldGetOffboardingByEmployee() throws Exception {
        when(exitService.getExitProcessByEmployee(employeeId)).thenReturn(offboardingResponse);

        mockMvc.perform(get("/api/v1/offboarding/employee/{employeeId}", employeeId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.employeeId").value(employeeId.toString()));

        verify(exitService).getExitProcessByEmployee(employeeId);
    }

    @Test
    @DisplayName("Should update offboarding process")
    void shouldUpdateOffboarding() throws Exception {
        when(exitService.updateExitProcess(eq(processId), any(ExitProcessRequest.class)))
                .thenReturn(offboardingResponse);

        mockMvc.perform(put("/api/v1/offboarding/{id}", processId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(offboardingRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(processId.toString()));

        verify(exitService).updateExitProcess(eq(processId), any(ExitProcessRequest.class));
    }

    @Test
    @DisplayName("Should update offboarding status")
    void shouldUpdateOffboardingStatus() throws Exception {
        ExitProcessResponse updatedResponse = ExitProcessResponse.builder()
                .id(processId)
                .status(ExitProcess.ExitStatus.IN_PROGRESS)
                .build();

        when(exitService.updateExitStatus(eq(processId), eq(ExitProcess.ExitStatus.IN_PROGRESS)))
                .thenReturn(updatedResponse);

        mockMvc.perform(patch("/api/v1/offboarding/{id}/status", processId)
                        .param("status", "IN_PROGRESS"))
                .andExpect(status().isOk());

        verify(exitService).updateExitStatus(processId, ExitProcess.ExitStatus.IN_PROGRESS);
    }

    @Test
    @DisplayName("Should delete offboarding process")
    void shouldDeleteOffboarding() throws Exception {
        doNothing().when(exitService).deleteExitProcess(processId);

        mockMvc.perform(delete("/api/v1/offboarding/{id}", processId))
                .andExpect(status().isNoContent());

        verify(exitService).deleteExitProcess(processId);
    }

    @Test
    @DisplayName("Should get offboarding processes by status")
    void shouldGetOffboardingsByStatus() throws Exception {
        Page<ExitProcessResponse> page = new PageImpl<>(
                Collections.singletonList(offboardingResponse), PageRequest.of(0, 20), 1);

        when(exitService.getExitProcessesByStatus(ExitProcess.ExitStatus.INITIATED))
                .thenReturn(Collections.singletonList(offboardingResponse));
        when(exitService.getAllExitProcesses(any(Pageable.class))).thenReturn(page);

        mockMvc.perform(get("/api/v1/offboarding/status/{status}", "INITIATED"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)));

        verify(exitService).getExitProcessesByStatus(ExitProcess.ExitStatus.INITIATED);
    }
}
