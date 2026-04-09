package com.hrms.api.statutory.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.application.statutory.service.StatutoryService;
import com.hrms.common.security.*;
import com.hrms.domain.statutory.ESIConfig;
import com.hrms.domain.statutory.EmployeeESIRecord;
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

import java.math.BigDecimal;
import java.util.*;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ESIController.class)
@ContextConfiguration(classes = {ESIController.class, ESIControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("ESIController Unit Tests")
class ESIControllerTest {

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
    private ESIConfig esiConfig;
    private EmployeeESIRecord esiRecord;

    @BeforeEach
    void setUp() {
        employeeId = UUID.randomUUID();

        esiConfig = new ESIConfig();
        esiConfig.setId(UUID.randomUUID());
        esiConfig.setTenantId(UUID.randomUUID());
        esiConfig.setIsActive(true);

        esiRecord = new EmployeeESIRecord();
        esiRecord.setId(UUID.randomUUID());
        esiRecord.setEmployeeId(employeeId);
        esiRecord.setTenantId(UUID.randomUUID());
    }

    @Configuration
    static class TestConfig {
        @Bean
        public org.springframework.data.domain.AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }

    @Test
    @DisplayName("Should create ESI config successfully")
    void shouldCreateESIConfig() throws Exception {
        when(statutoryService.createESIConfig(any(ESIConfig.class))).thenReturn(esiConfig);

        mockMvc.perform(post("/api/v1/statutory/esi/config")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(esiConfig)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.isActive").value(true));

        verify(statutoryService).createESIConfig(any(ESIConfig.class));
    }

    @Test
    @DisplayName("Should return active ESI configs")
    void shouldReturnActiveESIConfigs() throws Exception {
        when(statutoryService.getActiveESIConfigs()).thenReturn(List.of(esiConfig));

        mockMvc.perform(get("/api/v1/statutory/esi/config"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)));

        verify(statutoryService).getActiveESIConfigs();
    }

    @Test
    @DisplayName("Should enroll employee in ESI")
    void shouldEnrollEmployeeInESI() throws Exception {
        when(statutoryService.enrollEmployeeESI(any(EmployeeESIRecord.class))).thenReturn(esiRecord);

        mockMvc.perform(post("/api/v1/statutory/esi/employee")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(esiRecord)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.employeeId").value(employeeId.toString()));

        verify(statutoryService).enrollEmployeeESI(any(EmployeeESIRecord.class));
    }

    @Test
    @DisplayName("Should return employee ESI record when found")
    void shouldReturnEmployeeESIRecord() throws Exception {
        when(statutoryService.getEmployeeESIRecord(employeeId)).thenReturn(Optional.of(esiRecord));

        mockMvc.perform(get("/api/v1/statutory/esi/employee/{employeeId}", employeeId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.employeeId").value(employeeId.toString()));

        verify(statutoryService).getEmployeeESIRecord(employeeId);
    }

    @Test
    @DisplayName("Should return 404 when employee ESI record not found")
    void shouldReturn404WhenESIRecordNotFound() throws Exception {
        UUID unknownId = UUID.randomUUID();
        when(statutoryService.getEmployeeESIRecord(unknownId)).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/statutory/esi/employee/{employeeId}", unknownId))
                .andExpect(status().isNotFound());

        verify(statutoryService).getEmployeeESIRecord(unknownId);
    }

    @Test
    @DisplayName("Should return empty list when no active ESI configs")
    void shouldReturnEmptyListWhenNoActiveConfigs() throws Exception {
        when(statutoryService.getActiveESIConfigs()).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/statutory/esi/config"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));

        verify(statutoryService).getActiveESIConfigs();
    }
}
