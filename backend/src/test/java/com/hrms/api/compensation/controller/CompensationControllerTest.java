package com.hrms.api.compensation.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.compensation.dto.*;
import com.hrms.application.compensation.service.CompensationService;
import com.hrms.common.security.*;
import com.hrms.domain.compensation.CompensationReviewCycle.CycleStatus;
import com.hrms.domain.compensation.CompensationReviewCycle.CycleType;
import com.hrms.domain.compensation.SalaryRevision.RevisionType;
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
import java.util.*;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(CompensationController.class)
@ContextConfiguration(classes = {CompensationController.class, CompensationControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("CompensationController Tests")
class CompensationControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @MockitoBean
    private CompensationService compensationService;
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

    private UUID cycleId;
    private UUID revisionId;
    private UUID employeeId;
    private CompensationCycleResponse cycleResponse;
    private SalaryRevisionResponse revisionResponse;

    @BeforeEach
    void setUp() {
        cycleId = UUID.randomUUID();
        revisionId = UUID.randomUUID();
        employeeId = UUID.randomUUID();

        cycleResponse = CompensationCycleResponse.builder()
                .id(cycleId)
                .name("Annual Review 2026")
                .cycleType(CycleType.ANNUAL)
                .status(CycleStatus.DRAFT)
                .fiscalYear(2026)
                .startDate(LocalDate.of(2026, 1, 1))
                .endDate(LocalDate.of(2026, 3, 31))
                .effectiveDate(LocalDate.of(2026, 4, 1))
                .build();

        revisionResponse = SalaryRevisionResponse.builder()
                .id(revisionId)
                .employeeId(employeeId)
                .revisionType(RevisionType.ANNUAL_INCREMENT)
                .newSalary(new BigDecimal("120000"))
                .previousSalary(new BigDecimal("100000"))
                .effectiveDate(LocalDate.of(2026, 4, 1))
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
    @DisplayName("Should create compensation cycle successfully")
    void shouldCreateCycleSuccessfully() throws Exception {
        CompensationCycleRequest request = CompensationCycleRequest.builder()
                .name("Annual Review 2026")
                .cycleType(CycleType.ANNUAL)
                .fiscalYear(2026)
                .startDate(LocalDate.of(2026, 1, 1))
                .endDate(LocalDate.of(2026, 3, 31))
                .effectiveDate(LocalDate.of(2026, 4, 1))
                .build();

        when(compensationService.createCycle(any(CompensationCycleRequest.class)))
                .thenReturn(cycleResponse);

        mockMvc.perform(post("/api/v1/compensation/cycles")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Annual Review 2026"))
                .andExpect(jsonPath("$.status").value("DRAFT"));

        verify(compensationService).createCycle(any(CompensationCycleRequest.class));
    }

    @Test
    @DisplayName("Should get cycle by ID")
    void shouldGetCycleById() throws Exception {
        when(compensationService.getCycleById(cycleId)).thenReturn(cycleResponse);

        mockMvc.perform(get("/api/v1/compensation/cycles/{cycleId}", cycleId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(cycleId.toString()));

        verify(compensationService).getCycleById(cycleId);
    }

    @Test
    @DisplayName("Should get all cycles with pagination")
    void shouldGetAllCycles() throws Exception {
        Page<CompensationCycleResponse> page = new PageImpl<>(
                List.of(cycleResponse), PageRequest.of(0, 20), 1);
        when(compensationService.getAllCycles(any(Pageable.class))).thenReturn(page);

        mockMvc.perform(get("/api/v1/compensation/cycles"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1));
    }

    @Test
    @DisplayName("Should get active cycles")
    void shouldGetActiveCycles() throws Exception {
        when(compensationService.getActiveCycles()).thenReturn(List.of(cycleResponse));

        mockMvc.perform(get("/api/v1/compensation/cycles/active"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)));
    }

    @Test
    @DisplayName("Should create salary revision successfully")
    void shouldCreateRevisionSuccessfully() throws Exception {
        SalaryRevisionRequest request = SalaryRevisionRequest.builder()
                .employeeId(employeeId)
                .revisionType(RevisionType.ANNUAL_INCREMENT)
                .newSalary(new BigDecimal("120000"))
                .effectiveDate(LocalDate.of(2026, 4, 1))
                .build();

        when(compensationService.createRevision(any(SalaryRevisionRequest.class)))
                .thenReturn(revisionResponse);

        mockMvc.perform(post("/api/v1/compensation/revisions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.employeeId").value(employeeId.toString()));

        verify(compensationService).createRevision(any(SalaryRevisionRequest.class));
    }

    @Test
    @DisplayName("Should submit revision for review")
    void shouldSubmitRevision() throws Exception {
        when(compensationService.submitRevision(revisionId)).thenReturn(revisionResponse);

        mockMvc.perform(post("/api/v1/compensation/revisions/{revisionId}/submit", revisionId))
                .andExpect(status().isOk());

        verify(compensationService).submitRevision(revisionId);
    }

    @Test
    @DisplayName("Should approve revision")
    void shouldApproveRevision() throws Exception {
        when(compensationService.approveRevision(eq(revisionId), anyString()))
                .thenReturn(revisionResponse);

        mockMvc.perform(post("/api/v1/compensation/revisions/{revisionId}/approve", revisionId)
                        .param("comments", "Looks good"))
                .andExpect(status().isOk());

        verify(compensationService).approveRevision(eq(revisionId), eq("Looks good"));
    }

    @Test
    @DisplayName("Should get employee revision history")
    void shouldGetEmployeeRevisionHistory() throws Exception {
        when(compensationService.getEmployeeRevisionHistory(employeeId))
                .thenReturn(List.of(revisionResponse));

        mockMvc.perform(get("/api/v1/compensation/employees/{employeeId}/revisions", employeeId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)));
    }

    @Test
    @DisplayName("Should get revision types enum values")
    void shouldGetRevisionTypes() throws Exception {
        mockMvc.perform(get("/api/v1/compensation/revision-types"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThan(0))));
    }

    @Test
    @DisplayName("Should get cycle statuses enum values")
    void shouldGetCycleStatuses() throws Exception {
        mockMvc.perform(get("/api/v1/compensation/cycle-statuses"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThan(0))));
    }
}
