package com.hrms.api.exit;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.application.exit.dto.*;
import com.hrms.application.exit.service.ExitInterviewPublicService;
import com.hrms.application.exit.service.FnFCalculationService;
import com.hrms.common.security.*;
import com.hrms.domain.exit.FullAndFinalSettlement;
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

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(FnFController.class)
@ContextConfiguration(classes = {FnFController.class, FnFControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("FnFController Tests")
class FnFControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @MockitoBean
    private FnFCalculationService fnfService;
    @MockitoBean
    private ExitInterviewPublicService publicInterviewService;
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

    private UUID exitProcessId;
    private FnFCalculationResponse fnfResponse;

    @BeforeEach
    void setUp() {
        exitProcessId = UUID.randomUUID();

        fnfResponse = FnFCalculationResponse.builder()
                .id(UUID.randomUUID())
                .exitProcessId(exitProcessId)
                .employeeId(UUID.randomUUID())
                .employeeName("John Doe")
                .pendingSalary(new BigDecimal("50000.00"))
                .leaveEncashment(new BigDecimal("10000.00"))
                .totalEarnings(new BigDecimal("60000.00"))
                .totalDeductions(new BigDecimal("5000.00"))
                .netPayable(new BigDecimal("55000.00"))
                .status(FullAndFinalSettlement.SettlementStatus.DRAFT)
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
    @DisplayName("Should get or calculate FnF settlement")
    void shouldGetOrCalculateFnF() throws Exception {
        when(fnfService.getOrCalculate(exitProcessId)).thenReturn(fnfResponse);

        mockMvc.perform(get("/api/v1/exit/{exitProcessId}/fnf", exitProcessId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.exitProcessId").value(exitProcessId.toString()))
                .andExpect(jsonPath("$.netPayable").value(55000.00))
                .andExpect(jsonPath("$.status").value("DRAFT"));

        verify(fnfService).getOrCalculate(exitProcessId);
    }

    @Test
    @DisplayName("Should add FnF adjustment")
    void shouldAddFnFAdjustment() throws Exception {
        FnFAdjustmentRequest request = new FnFAdjustmentRequest();
        request.setLoanRecovery(new BigDecimal("2000.00"));
        request.setRemarks("Loan balance recovery");

        FnFCalculationResponse adjustedResponse = FnFCalculationResponse.builder()
                .id(fnfResponse.getId())
                .exitProcessId(exitProcessId)
                .loanRecovery(new BigDecimal("2000.00"))
                .totalDeductions(new BigDecimal("7000.00"))
                .netPayable(new BigDecimal("53000.00"))
                .status(FullAndFinalSettlement.SettlementStatus.DRAFT)
                .build();

        when(fnfService.addAdjustment(eq(exitProcessId), any(FnFAdjustmentRequest.class)))
                .thenReturn(adjustedResponse);

        mockMvc.perform(put("/api/v1/exit/{exitProcessId}/fnf/adjustments", exitProcessId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.loanRecovery").value(2000.00));

        verify(fnfService).addAdjustment(eq(exitProcessId), any(FnFAdjustmentRequest.class));
    }

    @Test
    @DisplayName("Should approve FnF settlement")
    void shouldApproveFnFSettlement() throws Exception {
        FnFCalculationResponse approvedResponse = FnFCalculationResponse.builder()
                .id(fnfResponse.getId())
                .exitProcessId(exitProcessId)
                .status(FullAndFinalSettlement.SettlementStatus.APPROVED)
                .approvalDate(LocalDate.now())
                .build();

        when(fnfService.approve(exitProcessId)).thenReturn(approvedResponse);

        mockMvc.perform(post("/api/v1/exit/{exitProcessId}/fnf/approve", exitProcessId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"));

        verify(fnfService).approve(exitProcessId);
    }

    @Test
    @DisplayName("Should get all FnF settlements with pagination")
    void shouldGetAllFnFSettlements() throws Exception {
        Page<FnFCalculationResponse> page = new PageImpl<>(
                Collections.singletonList(fnfResponse), PageRequest.of(0, 20), 1);

        when(fnfService.getAll(any(Pageable.class))).thenReturn(page);

        mockMvc.perform(get("/api/v1/exit/fnf"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.totalElements").value(1));

        verify(fnfService).getAll(any(Pageable.class));
    }

    @Test
    @DisplayName("Should generate public interview token")
    void shouldGeneratePublicToken() throws Exception {
        UUID interviewId = UUID.randomUUID();
        String token = "abc-123-public-token";

        when(publicInterviewService.generatePublicToken(interviewId)).thenReturn(token);

        mockMvc.perform(post("/api/v1/exit/interviews/{interviewId}/generate-token", interviewId))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString(token)));

        verify(publicInterviewService).generatePublicToken(interviewId);
    }

    @Test
    @DisplayName("Should get public interview by token")
    void shouldGetPublicInterview() throws Exception {
        String token = "valid-public-token";
        ExitInterviewPublicResponse publicResponse = ExitInterviewPublicResponse.builder()
                .id(UUID.randomUUID())
                .employeeName("John Doe")
                .scheduledDate("2026-04-15")
                .build();

        when(publicInterviewService.getByToken(token)).thenReturn(publicResponse);

        mockMvc.perform(get("/api/v1/exit/interview/public/{token}", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.employeeName").value("John Doe"));

        verify(publicInterviewService).getByToken(token);
    }

    @Test
    @DisplayName("Should submit public interview")
    void shouldSubmitPublicInterview() throws Exception {
        String token = "valid-public-token";
        ExitInterviewSubmitRequest request = new ExitInterviewSubmitRequest();
        request.setOverallExperienceRating(4);
        request.setManagementRating(3);
        request.setDetailedReason("Looking for new challenges");

        doNothing().when(publicInterviewService).submitByToken(eq(token), any(ExitInterviewSubmitRequest.class));

        mockMvc.perform(post("/api/v1/exit/interview/public/{token}/submit", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());

        verify(publicInterviewService).submitByToken(eq(token), any(ExitInterviewSubmitRequest.class));
    }

    @Test
    @DisplayName("Should get all FnF settlements with custom page size")
    void shouldGetAllFnFWithCustomPageSize() throws Exception {
        Page<FnFCalculationResponse> page = new PageImpl<>(
                Collections.singletonList(fnfResponse), PageRequest.of(0, 10), 1);

        when(fnfService.getAll(any(Pageable.class))).thenReturn(page);

        mockMvc.perform(get("/api/v1/exit/fnf")
                        .param("page", "0")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)));

        verify(fnfService).getAll(any(Pageable.class));
    }
}
