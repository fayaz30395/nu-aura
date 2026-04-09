package com.hrms.api.probation.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.probation.dto.*;
import com.hrms.application.probation.service.ProbationService;
import com.hrms.common.security.*;
import com.hrms.domain.probation.ProbationPeriod.ProbationStatus;
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

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ProbationController.class)
@ContextConfiguration(classes = {ProbationController.class, ProbationControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("ProbationController Tests")
class ProbationControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @MockitoBean
    private ProbationService probationService;
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

    private UUID probationId;
    private UUID employeeId;
    private ProbationPeriodResponse probationResponse;

    @BeforeEach
    void setUp() {
        probationId = UUID.randomUUID();
        employeeId = UUID.randomUUID();

        probationResponse = ProbationPeriodResponse.builder()
                .id(probationId)
                .employeeId(employeeId)
                .startDate(LocalDate.now())
                .endDate(LocalDate.now().plusMonths(3))
                .status(ProbationStatus.ACTIVE)
                .durationMonths(3)
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
    @DisplayName("Should create probation period successfully")
    void shouldCreateProbationSuccessfully() throws Exception {
        ProbationPeriodRequest request = ProbationPeriodRequest.builder()
                .employeeId(employeeId)
                .startDate(LocalDate.now())
                .durationMonths(3)
                .build();

        when(probationService.createProbationPeriod(any(ProbationPeriodRequest.class)))
                .thenReturn(probationResponse);

        mockMvc.perform(post("/api/v1/probation")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.employeeId").value(employeeId.toString()))
                .andExpect(jsonPath("$.status").value("ACTIVE"));

        verify(probationService).createProbationPeriod(any(ProbationPeriodRequest.class));
    }

    @Test
    @DisplayName("Should get probation by ID")
    void shouldGetProbationById() throws Exception {
        when(probationService.getProbationById(probationId)).thenReturn(probationResponse);

        mockMvc.perform(get("/api/v1/probation/{probationId}", probationId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(probationId.toString()));

        verify(probationService).getProbationById(probationId);
    }

    @Test
    @DisplayName("Should get all probations with pagination")
    void shouldGetAllProbations() throws Exception {
        Page<ProbationPeriodResponse> page = new PageImpl<>(
                List.of(probationResponse), PageRequest.of(0, 20), 1);
        when(probationService.getAllProbations(any(Pageable.class))).thenReturn(page);

        mockMvc.perform(get("/api/v1/probation"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1));
    }

    @Test
    @DisplayName("Should get probations by status")
    void shouldGetProbationsByStatus() throws Exception {
        Page<ProbationPeriodResponse> page = new PageImpl<>(
                List.of(probationResponse), PageRequest.of(0, 20), 1);
        when(probationService.getProbationsByStatus(eq(ProbationStatus.ACTIVE), any(Pageable.class)))
                .thenReturn(page);

        mockMvc.perform(get("/api/v1/probation/status/{status}", "ACTIVE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].status").value("ACTIVE"));
    }

    @Test
    @DisplayName("Should extend probation successfully")
    void shouldExtendProbation() throws Exception {
        ProbationExtensionRequest request = ProbationExtensionRequest.builder()
                .extensionDays(30)
                .reason("Needs more time for skill development")
                .build();

        ProbationPeriodResponse extendedResponse = ProbationPeriodResponse.builder()
                .id(probationId)
                .status(ProbationStatus.EXTENDED)
                .build();

        when(probationService.extendProbation(eq(probationId), any(ProbationExtensionRequest.class)))
                .thenReturn(extendedResponse);

        mockMvc.perform(post("/api/v1/probation/{probationId}/extend", probationId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("EXTENDED"));
    }

    @Test
    @DisplayName("Should get overdue probations")
    void shouldGetOverdueProbations() throws Exception {
        when(probationService.getOverdueProbations()).thenReturn(List.of(probationResponse));

        mockMvc.perform(get("/api/v1/probation/overdue"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)));
    }

    @Test
    @DisplayName("Should get probations ending soon with default days")
    void shouldGetProbationsEndingSoon() throws Exception {
        when(probationService.getProbationsEndingSoon(7)).thenReturn(List.of(probationResponse));

        mockMvc.perform(get("/api/v1/probation/ending-soon"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)));

        verify(probationService).getProbationsEndingSoon(7);
    }

    @Test
    @DisplayName("Should get probation statistics")
    void shouldGetStatistics() throws Exception {
        ProbationStatisticsResponse stats = new ProbationStatisticsResponse();
        when(probationService.getStatistics()).thenReturn(stats);

        mockMvc.perform(get("/api/v1/probation/statistics"))
                .andExpect(status().isOk());

        verify(probationService).getStatistics();
    }

    @Test
    @DisplayName("Should get probation statuses enum values")
    void shouldGetStatuses() throws Exception {
        mockMvc.perform(get("/api/v1/probation/statuses"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThan(0))));
    }

    @Test
    @DisplayName("Should return 400 for invalid create request without employee ID")
    void shouldReturn400ForInvalidCreateRequest() throws Exception {
        ProbationPeriodRequest request = ProbationPeriodRequest.builder()
                .startDate(LocalDate.now())
                .durationMonths(3)
                .build();

        mockMvc.perform(post("/api/v1/probation")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }
}
