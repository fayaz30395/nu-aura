package com.hrms.api.statutory.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.application.statutory.service.StatutoryService;
import com.hrms.common.security.*;
import com.hrms.domain.statutory.EmployeePFRecord;
import com.hrms.domain.statutory.ProvidentFundConfig;
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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ProvidentFundController.class)
@ContextConfiguration(classes = {ProvidentFundController.class, ProvidentFundControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("ProvidentFundController Unit Tests")
class ProvidentFundControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @MockitoBean
    private StatutoryService statutoryService;
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
    private ProvidentFundConfig pfConfig;
    private EmployeePFRecord pfRecord;

    @BeforeEach
    void setUp() {
        employeeId = UUID.randomUUID();

        pfConfig = new ProvidentFundConfig();
        pfConfig.setId(UUID.randomUUID());
        pfConfig.setTenantId(UUID.randomUUID());
        pfConfig.setIsActive(true);

        pfRecord = new EmployeePFRecord();
        pfRecord.setId(UUID.randomUUID());
        pfRecord.setEmployeeId(employeeId);
        pfRecord.setTenantId(UUID.randomUUID());
    }

    @Test
    @DisplayName("Should create PF config successfully")
    void shouldCreatePFConfig() throws Exception {
        when(statutoryService.createPFConfig(any(ProvidentFundConfig.class))).thenReturn(pfConfig);

        mockMvc.perform(post("/api/v1/statutory/pf/config")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(pfConfig)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.isActive").value(true));

        verify(statutoryService).createPFConfig(any(ProvidentFundConfig.class));
    }

    @Test
    @DisplayName("Should return active PF configs")
    void shouldReturnActivePFConfigs() throws Exception {
        when(statutoryService.getActivePFConfigs()).thenReturn(List.of(pfConfig));

        mockMvc.perform(get("/api/v1/statutory/pf/config"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)));

        verify(statutoryService).getActivePFConfigs();
    }

    @Test
    @DisplayName("Should enroll employee in PF")
    void shouldEnrollEmployeeInPF() throws Exception {
        when(statutoryService.enrollEmployeePF(any(EmployeePFRecord.class))).thenReturn(pfRecord);

        mockMvc.perform(post("/api/v1/statutory/pf/employee")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(pfRecord)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.employeeId").value(employeeId.toString()));

        verify(statutoryService).enrollEmployeePF(any(EmployeePFRecord.class));
    }

    @Test
    @DisplayName("Should return employee PF record when found")
    void shouldReturnEmployeePFRecord() throws Exception {
        when(statutoryService.getEmployeePFRecord(employeeId)).thenReturn(Optional.of(pfRecord));

        mockMvc.perform(get("/api/v1/statutory/pf/employee/{employeeId}", employeeId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.employeeId").value(employeeId.toString()));

        verify(statutoryService).getEmployeePFRecord(employeeId);
    }

    @Test
    @DisplayName("Should return 404 when employee PF record not found")
    void shouldReturn404WhenPFRecordNotFound() throws Exception {
        UUID unknownId = UUID.randomUUID();
        when(statutoryService.getEmployeePFRecord(unknownId)).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/statutory/pf/employee/{employeeId}", unknownId))
                .andExpect(status().isNotFound());

        verify(statutoryService).getEmployeePFRecord(unknownId);
    }

    @Test
    @DisplayName("Should return empty list when no active PF configs")
    void shouldReturnEmptyListWhenNoActivePFConfigs() throws Exception {
        when(statutoryService.getActivePFConfigs()).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/statutory/pf/config"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));

        verify(statutoryService).getActivePFConfigs();
    }

    @Test
    @DisplayName("Should propagate service exception on PF enrollment")
    void shouldPropagateExceptionOnEnrollment() throws Exception {
        when(statutoryService.enrollEmployeePF(any(EmployeePFRecord.class)))
                .thenThrow(new RuntimeException("Employee already enrolled"));

        mockMvc.perform(post("/api/v1/statutory/pf/employee")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(pfRecord)))
                .andExpect(status().isInternalServerError());

        verify(statutoryService).enrollEmployeePF(any(EmployeePFRecord.class));
    }

    @Test
    @DisplayName("Should handle multiple active PF configs")
    void shouldHandleMultipleActivePFConfigs() throws Exception {
        ProvidentFundConfig config2 = new ProvidentFundConfig();
        config2.setId(UUID.randomUUID());
        config2.setIsActive(true);

        when(statutoryService.getActivePFConfigs()).thenReturn(List.of(pfConfig, config2));

        mockMvc.perform(get("/api/v1/statutory/pf/config"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)));

        verify(statutoryService).getActivePFConfigs();
    }

    @Configuration
    static class TestConfig {
        @Bean
        public org.springframework.data.domain.AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }
}
