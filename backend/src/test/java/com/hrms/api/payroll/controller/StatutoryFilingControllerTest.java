package com.hrms.api.payroll.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.payroll.dto.StatutoryFilingDto.*;
import com.hrms.application.payroll.service.StatutoryFilingService;
import com.hrms.common.security.*;
import com.hrms.domain.payroll.StatutoryFilingRun;
import com.hrms.domain.payroll.StatutoryFilingRun.FilingStatus;
import com.hrms.domain.payroll.StatutoryFilingTemplate.FilingType;
import com.hrms.domain.payroll.StatutoryFilingTemplate.OutputFormat;
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

import java.io.ByteArrayInputStream;
import java.time.LocalDateTime;
import java.util.*;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(StatutoryFilingController.class)
@ContextConfiguration(classes = {StatutoryFilingController.class, StatutoryFilingControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("StatutoryFilingController Unit Tests")
class StatutoryFilingControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @MockitoBean
    private StatutoryFilingService statutoryFilingService;
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

    private UUID filingId;
    private FilingRunResponse filingRunResponse;

    @BeforeEach
    void setUp() {
        filingId = UUID.randomUUID();

        filingRunResponse = FilingRunResponse.builder()
                .id(filingId)
                .filingType(FilingType.PF_ECR)
                .filingTypeName("PF ECR")
                .periodMonth(4)
                .periodYear(2026)
                .periodLabel("April 2026")
                .status(FilingStatus.GENERATED)
                .generatedBy(UUID.randomUUID())
                .generatedAt(LocalDateTime.now())
                .fileName("pf_ecr_apr_2026.txt")
                .fileSize(2048L)
                .totalRecords(50)
                .createdAt(LocalDateTime.now())
                .build();
    }

    @Configuration
    static class TestConfig {
        @Bean
        public org.springframework.data.domain.AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }

    @Test
    @DisplayName("Should return available filing types")
    void shouldReturnFilingTypes() throws Exception {
        FilingTypeInfo typeInfo = FilingTypeInfo.builder()
                .filingType(FilingType.PF_ECR)
                .name("PF ECR")
                .description("PF Electronic Challan-cum-Return")
                .format(OutputFormat.TEXT)
                .frequency("Monthly")
                .portalName("EPFO")
                .portalUrl("https://unifiedportal-epfo.epfindia.gov.in")
                .build();

        when(statutoryFilingService.getAvailableFilingTypes()).thenReturn(List.of(typeInfo));

        mockMvc.perform(get("/api/v1/payroll/statutory-filings/types"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].filingType").value("PF_ECR"))
                .andExpect(jsonPath("$[0].portalName").value("EPFO"));

        verify(statutoryFilingService).getAvailableFilingTypes();
    }

    @Test
    @DisplayName("Should generate filing successfully")
    void shouldGenerateFiling() throws Exception {
        GenerateRequest request = GenerateRequest.builder()
                .filingType(FilingType.PF_ECR)
                .month(4)
                .year(2026)
                .remarks("Monthly PF filing")
                .build();

        when(statutoryFilingService.generateFiling(any(GenerateRequest.class)))
                .thenReturn(filingRunResponse);

        mockMvc.perform(post("/api/v1/payroll/statutory-filings/generate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.filingType").value("PF_ECR"))
                .andExpect(jsonPath("$.periodMonth").value(4))
                .andExpect(jsonPath("$.status").value("GENERATED"));

        verify(statutoryFilingService).generateFiling(any(GenerateRequest.class));
    }

    @Test
    @DisplayName("Should return 400 for invalid generate request with missing fields")
    void shouldReturn400ForInvalidGenerateRequest() throws Exception {
        GenerateRequest request = new GenerateRequest();

        mockMvc.perform(post("/api/v1/payroll/statutory-filings/generate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Should return paginated filing history")
    void shouldReturnFilingHistory() throws Exception {
        Page<FilingRunResponse> page = new PageImpl<>(
                List.of(filingRunResponse), PageRequest.of(0, 20), 1);

        when(statutoryFilingService.getFilingHistory(any(), any(Pageable.class)))
                .thenReturn(page);

        mockMvc.perform(get("/api/v1/payroll/statutory-filings"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].filingType").value("PF_ECR"));

        verify(statutoryFilingService).getFilingHistory(any(), any(Pageable.class));
    }

    @Test
    @DisplayName("Should return filing run detail by ID")
    void shouldReturnFilingRunDetail() throws Exception {
        when(statutoryFilingService.getFilingRunDetail(filingId)).thenReturn(filingRunResponse);

        mockMvc.perform(get("/api/v1/payroll/statutory-filings/{id}", filingId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(filingId.toString()))
                .andExpect(jsonPath("$.fileName").value("pf_ecr_apr_2026.txt"));

        verify(statutoryFilingService).getFilingRunDetail(filingId);
    }

    @Test
    @DisplayName("Should download filing as stream")
    void shouldDownloadFiling() throws Exception {
        StatutoryFilingRun run = StatutoryFilingRun.builder()
                .fileName("pf_ecr_apr_2026.txt")
                .contentType("text/plain")
                .build();
        ByteArrayInputStream stream = new ByteArrayInputStream("file-content".getBytes());

        when(statutoryFilingService.getFilingRun(filingId)).thenReturn(run);
        when(statutoryFilingService.downloadFiling(filingId)).thenReturn(stream);

        mockMvc.perform(get("/api/v1/payroll/statutory-filings/{id}/download", filingId))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition",
                        containsString("pf_ecr_apr_2026.txt")));

        verify(statutoryFilingService).getFilingRun(filingId);
        verify(statutoryFilingService).downloadFiling(filingId);
    }

    @Test
    @DisplayName("Should validate filing and return result")
    void shouldValidateFiling() throws Exception {
        ValidationResult result = ValidationResult.builder()
                .filingRunId(filingId)
                .valid(true)
                .errorCount(0)
                .warningCount(1)
                .build();

        when(statutoryFilingService.validateFiling(filingId)).thenReturn(result);

        mockMvc.perform(post("/api/v1/payroll/statutory-filings/{id}/validate", filingId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valid").value(true))
                .andExpect(jsonPath("$.errorCount").value(0));

        verify(statutoryFilingService).validateFiling(filingId);
    }

    @Test
    @DisplayName("Should submit filing with remarks")
    void shouldSubmitFiling() throws Exception {
        SubmitRequest submitRequest = SubmitRequest.builder()
                .remarks("Submitted to EPFO portal")
                .build();

        FilingRunResponse submitted = FilingRunResponse.builder()
                .id(filingId)
                .filingType(FilingType.PF_ECR)
                .status(FilingStatus.SUBMITTED)
                .submittedAt(LocalDateTime.now())
                .build();

        when(statutoryFilingService.markAsSubmitted(eq(filingId), any(SubmitRequest.class)))
                .thenReturn(submitted);

        mockMvc.perform(put("/api/v1/payroll/statutory-filings/{id}/submit", filingId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(submitRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUBMITTED"));

        verify(statutoryFilingService).markAsSubmitted(eq(filingId), any(SubmitRequest.class));
    }

    @Test
    @DisplayName("Should filter filing history by type")
    void shouldFilterFilingHistoryByType() throws Exception {
        Page<FilingRunResponse> page = new PageImpl<>(
                List.of(filingRunResponse), PageRequest.of(0, 20), 1);

        when(statutoryFilingService.getFilingHistory(eq(FilingType.PF_ECR), any(Pageable.class)))
                .thenReturn(page);

        mockMvc.perform(get("/api/v1/payroll/statutory-filings")
                        .param("filingType", "PF_ECR"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)));

        verify(statutoryFilingService).getFilingHistory(eq(FilingType.PF_ECR), any(Pageable.class));
    }
}
