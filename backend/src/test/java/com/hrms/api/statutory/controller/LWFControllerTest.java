package com.hrms.api.statutory.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.hrms.api.statutory.dto.LWFConfigurationDto;
import com.hrms.api.statutory.dto.LWFRemittanceReportDto;
import com.hrms.application.statutory.service.LWFService;
import com.hrms.domain.statutory.LWFConfiguration;
import com.hrms.domain.statutory.LWFConfiguration.LWFFrequency;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;
import org.springframework.data.web.config.SpringDataJacksonConfiguration;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class LWFControllerTest {

    @Mock
    private LWFService lwfService;

    @InjectMocks
    private LWFController lwfController;

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
        // Register Spring Data's page serialization module
        objectMapper.registerModule(new SpringDataJacksonConfiguration().pageModule());
        MappingJackson2HttpMessageConverter converter = new MappingJackson2HttpMessageConverter(objectMapper);
        mockMvc = MockMvcBuilders.standaloneSetup(lwfController)
                .setCustomArgumentResolvers(new PageableHandlerMethodArgumentResolver())
                .setMessageConverters(converter)
                .build();
    }

    @Test
    @DisplayName("GET /configurations returns list of state configs")
    void getConfigurations() throws Exception {
        LWFConfiguration config = LWFConfiguration.builder()
                .id(UUID.randomUUID())
                .tenantId(UUID.randomUUID())
                .stateCode("MH")
                .stateName("Maharashtra")
                .employeeContribution(new BigDecimal("25.00"))
                .employerContribution(new BigDecimal("75.00"))
                .frequency(LWFFrequency.HALF_YEARLY)
                .applicableMonths("[6,12]")
                .isActive(true)
                .effectiveFrom(LocalDate.of(2024, 4, 1))
                .build();

        when(lwfService.getStateConfigurations(any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(config)));

        mockMvc.perform(get("/api/v1/payroll/lwf/configurations")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].stateCode").value("MH"))
                .andExpect(jsonPath("$.content[0].stateName").value("Maharashtra"))
                .andExpect(jsonPath("$.content[0].employeeContribution").value(25.00))
                .andExpect(jsonPath("$.content[0].employerContribution").value(75.00))
                .andExpect(jsonPath("$.content[0].frequency").value("HALF_YEARLY"));
    }

    @Test
    @DisplayName("POST /configurations creates a new config")
    void createConfiguration() throws Exception {
        LWFConfigurationDto dto = LWFConfigurationDto.builder()
                .stateCode("MH")
                .stateName("Maharashtra")
                .employeeContribution(new BigDecimal("25.00"))
                .employerContribution(new BigDecimal("75.00"))
                .frequency(LWFFrequency.HALF_YEARLY)
                .applicableMonths("[6,12]")
                .effectiveFrom(LocalDate.of(2024, 4, 1))
                .build();

        LWFConfiguration saved = LWFConfiguration.builder()
                .id(UUID.randomUUID())
                .tenantId(UUID.randomUUID())
                .stateCode("MH")
                .stateName("Maharashtra")
                .employeeContribution(new BigDecimal("25.00"))
                .employerContribution(new BigDecimal("75.00"))
                .frequency(LWFFrequency.HALF_YEARLY)
                .applicableMonths("[6,12]")
                .isActive(true)
                .effectiveFrom(LocalDate.of(2024, 4, 1))
                .build();

        when(lwfService.configureState(any(LWFConfigurationDto.class))).thenReturn(saved);

        mockMvc.perform(post("/api/v1/payroll/lwf/configurations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .accept(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stateCode").value("MH"));
    }

    @Test
    @DisplayName("GET /deductions returns deductions for period")
    void getDeductions() throws Exception {
        when(lwfService.getDeductionsByPeriod(eq(6), eq(2025), any(Pageable.class)))
                .thenReturn(Page.empty());

        mockMvc.perform(get("/api/v1/payroll/lwf/deductions")
                        .param("month", "6")
                        .param("year", "2025")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());
    }

    @Test
    @DisplayName("GET /deductions/employee/{id} returns employee history")
    void getEmployeeDeductions() throws Exception {
        UUID empId = UUID.randomUUID();
        when(lwfService.getDeductionsByEmployee(empId)).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/payroll/lwf/deductions/employee/" + empId)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @DisplayName("GET /report returns remittance summary")
    void getRemittanceReport() throws Exception {
        LWFRemittanceReportDto report = LWFRemittanceReportDto.builder()
                .month(6)
                .year(2025)
                .totalEmployeeContribution(new BigDecimal("50.00"))
                .totalEmployerContribution(new BigDecimal("150.00"))
                .grandTotal(new BigDecimal("200.00"))
                .totalEmployees(2)
                .stateWiseSummary(Collections.emptyList())
                .build();

        when(lwfService.getRemittanceReport(6, 2025)).thenReturn(report);

        mockMvc.perform(get("/api/v1/payroll/lwf/report")
                        .param("month", "6")
                        .param("year", "2025")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.month").value(6))
                .andExpect(jsonPath("$.year").value(2025))
                .andExpect(jsonPath("$.totalEmployees").value(2))
                .andExpect(jsonPath("$.grandTotal").value(200.00));
    }

    @Test
    @DisplayName("DELETE /configurations/{stateCode} deactivates config")
    void deactivateConfiguration() throws Exception {
        doNothing().when(lwfService).deactivateState("MH");

        mockMvc.perform(delete("/api/v1/payroll/lwf/configurations/MH"))
                .andExpect(status().isNoContent());

        verify(lwfService).deactivateState("MH");
    }
}
