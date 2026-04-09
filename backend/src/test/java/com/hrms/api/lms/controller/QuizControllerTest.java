package com.hrms.api.lms.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.lms.dto.*;
import com.hrms.application.lms.service.QuizAssessmentService;
import com.hrms.common.security.*;
import com.hrms.domain.lms.Certificate;
import com.hrms.domain.lms.QuizAttempt;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.MockedStatic;
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

import java.time.LocalDateTime;
import java.util.*;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(QuizController.class)
@ContextConfiguration(classes = {QuizController.class, QuizControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("QuizController Tests")
class QuizControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @MockitoBean
    private QuizAssessmentService quizAssessmentService;
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

    private UUID quizId;
    private UUID tenantId;
    private UUID employeeId;

    @BeforeEach
    void setUp() {
        quizId = UUID.randomUUID();
        tenantId = UUID.randomUUID();
        employeeId = UUID.randomUUID();
    }

    @Configuration
    static class TestConfig {
        @Bean
        public org.springframework.data.domain.AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }

    @Nested
    @DisplayName("Get Quiz Details Tests")
    class GetQuizTests {

        @Test
        @DisplayName("Should get quiz details by ID")
        void shouldGetQuizDetails() throws Exception {
            QuizDetailResponse response = QuizDetailResponse.builder()
                    .id(quizId)
                    .title("Java Basics Quiz")
                    .instructions("Answer all questions")
                    .timeLimitMinutes(30)
                    .passingScore(70)
                    .maxAttempts(3)
                    .build();

            try (MockedStatic<TenantContext> ctx = mockStatic(TenantContext.class)) {
                ctx.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
                when(quizAssessmentService.getQuizDetails(quizId, tenantId)).thenReturn(response);

                mockMvc.perform(get("/api/v1/lms/quizzes/{quizId}", quizId))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.title").value("Java Basics Quiz"))
                        .andExpect(jsonPath("$.passingScore").value(70));
            }
        }
    }

    @Nested
    @DisplayName("Quiz Attempt Tests")
    class AttemptTests {

        @Test
        @DisplayName("Should start quiz attempt")
        void shouldStartQuizAttempt() throws Exception {
            QuizAttemptResponse response = QuizAttemptResponse.builder()
                    .id(UUID.randomUUID())
                    .quizId(quizId)
                    .status(QuizAttempt.AttemptStatus.IN_PROGRESS)
                    .attemptNumber(1)
                    .startedAt(LocalDateTime.now())
                    .build();

            try (MockedStatic<TenantContext> tCtx = mockStatic(TenantContext.class);
                 MockedStatic<SecurityContext> sCtx = mockStatic(SecurityContext.class)) {
                tCtx.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
                sCtx.when(SecurityContext::getCurrentEmployeeId).thenReturn(employeeId);
                when(quizAssessmentService.startQuizAttempt(quizId, employeeId, tenantId)).thenReturn(response);

                mockMvc.perform(post("/api/v1/lms/quizzes/{quizId}/start", quizId))
                        .andExpect(status().isCreated())
                        .andExpect(jsonPath("$.status").value("IN_PROGRESS"))
                        .andExpect(jsonPath("$.attemptNumber").value(1));
            }
        }

        @Test
        @DisplayName("Should submit quiz attempt")
        void shouldSubmitQuizAttempt() throws Exception {
            UUID attemptId = UUID.randomUUID();
            QuizAttemptRequest request = QuizAttemptRequest.builder()
                    .quizId(quizId)
                    .answers(Map.of("q1", "A", "q2", "B"))
                    .build();

            QuizResultResponse result = QuizResultResponse.builder()
                    .passed(true)
                    .score(85)
                    .maxScore(100)
                    .passingScore(70)
                    .percentage(85.0)
                    .build();

            try (MockedStatic<TenantContext> ctx = mockStatic(TenantContext.class)) {
                ctx.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
                when(quizAssessmentService.submitQuizAttempt(eq(attemptId), any(QuizAttemptRequest.class), eq(tenantId)))
                        .thenReturn(result);

                mockMvc.perform(post("/api/v1/lms/quizzes/attempts/{attemptId}/submit", attemptId)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(request)))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.passed").value(true))
                        .andExpect(jsonPath("$.score").value(85));
            }
        }

        @Test
        @DisplayName("Should get attempt history")
        void shouldGetAttemptHistory() throws Exception {
            QuizAttemptResponse attempt = QuizAttemptResponse.builder()
                    .id(UUID.randomUUID())
                    .quizId(quizId)
                    .status(QuizAttempt.AttemptStatus.COMPLETED)
                    .score(85)
                    .passed(true)
                    .build();

            try (MockedStatic<TenantContext> tCtx = mockStatic(TenantContext.class);
                 MockedStatic<SecurityContext> sCtx = mockStatic(SecurityContext.class)) {
                tCtx.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
                sCtx.when(SecurityContext::getCurrentEmployeeId).thenReturn(employeeId);
                when(quizAssessmentService.getAttemptHistory(quizId, employeeId, tenantId))
                        .thenReturn(List.of(attempt));

                mockMvc.perform(get("/api/v1/lms/quizzes/{quizId}/attempts", quizId))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$", hasSize(1)))
                        .andExpect(jsonPath("$[0].passed").value(true));
            }
        }
    }

    @Nested
    @DisplayName("Certificate Tests")
    class CertificateTests {

        @Test
        @DisplayName("Should generate certificate after course completion")
        void shouldGenerateCertificate() throws Exception {
            UUID enrollmentId = UUID.randomUUID();
            Certificate certificate = new Certificate();
            certificate.setId(UUID.randomUUID());

            try (MockedStatic<TenantContext> tCtx = mockStatic(TenantContext.class);
                 MockedStatic<SecurityContext> sCtx = mockStatic(SecurityContext.class)) {
                tCtx.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
                sCtx.when(SecurityContext::getCurrentEmployeeId).thenReturn(employeeId);
                when(quizAssessmentService.generateCertificate(enrollmentId, employeeId, tenantId))
                        .thenReturn(certificate);

                mockMvc.perform(post("/api/v1/lms/quizzes/enrollments/{enrollmentId}/certificate", enrollmentId))
                        .andExpect(status().isCreated())
                        .andExpect(jsonPath("$.id").exists());
            }
        }
    }

    @Nested
    @DisplayName("Empty Attempt History Tests")
    class EmptyHistoryTests {

        @Test
        @DisplayName("Should return empty attempt history when no attempts")
        void shouldReturnEmptyHistory() throws Exception {
            try (MockedStatic<TenantContext> tCtx = mockStatic(TenantContext.class);
                 MockedStatic<SecurityContext> sCtx = mockStatic(SecurityContext.class)) {
                tCtx.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
                sCtx.when(SecurityContext::getCurrentEmployeeId).thenReturn(employeeId);
                when(quizAssessmentService.getAttemptHistory(quizId, employeeId, tenantId))
                        .thenReturn(Collections.emptyList());

                mockMvc.perform(get("/api/v1/lms/quizzes/{quizId}/attempts", quizId))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$", hasSize(0)));
            }
        }
    }
}
