package com.hrms.api.recruitment.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.recruitment.dto.*;
import com.hrms.application.recruitment.service.AgencyService;
import com.hrms.common.security.*;
import com.hrms.domain.recruitment.AgencySubmission;
import com.hrms.domain.recruitment.RecruitmentAgency;
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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AgencyController.class)
@ContextConfiguration(classes = {AgencyController.class, AgencyControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("AgencyController Unit Tests")
class AgencyControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @MockitoBean
    private AgencyService agencyService;
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

    private UUID agencyId;
    private UUID jobOpeningId;
    private AgencyDto agencyDto;
    private AgencySubmissionDto submissionDto;

    @BeforeEach
    void setUp() {
        agencyId = UUID.randomUUID();
        jobOpeningId = UUID.randomUUID();

        agencyDto = AgencyDto.builder()
                .id(agencyId)
                .tenantId(UUID.randomUUID())
                .name("TechRecruit Partners")
                .contactPerson("Jane Smith")
                .email("jane@techrecruit.com")
                .phone("+1234567890")
                .website("https://techrecruit.com")
                .feeType(RecruitmentAgency.FeeType.PERCENTAGE)
                .feeAmount(new BigDecimal("15.00"))
                .contractStartDate(LocalDate.now())
                .contractEndDate(LocalDate.now().plusYears(1))
                .status(RecruitmentAgency.AgencyStatus.ACTIVE)
                .specializations("Engineering, Product")
                .rating(4)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        submissionDto = AgencySubmissionDto.builder()
                .id(UUID.randomUUID())
                .tenantId(UUID.randomUUID())
                .agencyId(agencyId)
                .agencyName("TechRecruit Partners")
                .candidateId(UUID.randomUUID())
                .candidateName("John Doe")
                .jobOpeningId(jobOpeningId)
                .jobTitle("Software Engineer")
                .submittedAt(LocalDateTime.now())
                .feeAgreed(new BigDecimal("5000.00"))
                .feeCurrency("USD")
                .status(AgencySubmission.SubmissionStatus.SUBMITTED)
                .invoiceStatus(AgencySubmission.InvoiceStatus.NOT_APPLICABLE)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }

    @Configuration
    static class TestConfig {
        @Bean
        public org.springframework.data.domain.AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }

    @Nested
    @DisplayName("Agency CRUD Tests")
    class AgencyCrudTests {

        @Test
        @DisplayName("Should create agency successfully")
        void shouldCreateAgencySuccessfully() throws Exception {
            CreateAgencyRequest request = new CreateAgencyRequest();
            request.setName("TechRecruit Partners");
            request.setContactPerson("Jane Smith");
            request.setEmail("jane@techrecruit.com");
            request.setPhone("+1234567890");
            request.setFeeType(RecruitmentAgency.FeeType.PERCENTAGE);
            request.setFeeAmount(new BigDecimal("15.00"));
            request.setStatus(RecruitmentAgency.AgencyStatus.ACTIVE);

            when(agencyService.createAgency(any(CreateAgencyRequest.class))).thenReturn(agencyDto);

            mockMvc.perform(post("/api/v1/recruitment/agencies")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.id").exists())
                    .andExpect(jsonPath("$.name").value("TechRecruit Partners"))
                    .andExpect(jsonPath("$.status").value("ACTIVE"));

            verify(agencyService).createAgency(any(CreateAgencyRequest.class));
        }

        @Test
        @DisplayName("Should return 400 when agency name is blank")
        void shouldReturn400WhenAgencyNameBlank() throws Exception {
            CreateAgencyRequest request = new CreateAgencyRequest();
            // name is blank — @NotBlank validation should fail

            mockMvc.perform(post("/api/v1/recruitment/agencies")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("Should list agencies with pagination")
        void shouldListAgenciesWithPagination() throws Exception {
            Page<AgencyDto> page = new PageImpl<>(
                    List.of(agencyDto), PageRequest.of(0, 20), 1);

            when(agencyService.listAgencies(any(), any(), any(Pageable.class))).thenReturn(page);

            mockMvc.perform(get("/api/v1/recruitment/agencies")
                            .param("page", "0")
                            .param("size", "20"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content", hasSize(1)))
                    .andExpect(jsonPath("$.content[0].name").value("TechRecruit Partners"));

            verify(agencyService).listAgencies(any(), any(), any(Pageable.class));
        }

        @Test
        @DisplayName("Should list agencies with status and search filters")
        void shouldListAgenciesWithFilters() throws Exception {
            Page<AgencyDto> page = new PageImpl<>(
                    List.of(agencyDto), PageRequest.of(0, 20), 1);

            when(agencyService.listAgencies(eq("ACTIVE"), eq("Tech"), any(Pageable.class)))
                    .thenReturn(page);

            mockMvc.perform(get("/api/v1/recruitment/agencies")
                            .param("status", "ACTIVE")
                            .param("search", "Tech")
                            .param("page", "0")
                            .param("size", "20"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content", hasSize(1)));

            verify(agencyService).listAgencies(eq("ACTIVE"), eq("Tech"), any(Pageable.class));
        }

        @Test
        @DisplayName("Should get agency by ID")
        void shouldGetAgencyById() throws Exception {
            when(agencyService.getAgencyById(agencyId)).thenReturn(agencyDto);

            mockMvc.perform(get("/api/v1/recruitment/agencies/{id}", agencyId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(agencyId.toString()))
                    .andExpect(jsonPath("$.name").value("TechRecruit Partners"))
                    .andExpect(jsonPath("$.contactPerson").value("Jane Smith"));

            verify(agencyService).getAgencyById(agencyId);
        }

        @Test
        @DisplayName("Should update agency successfully")
        void shouldUpdateAgencySuccessfully() throws Exception {
            UpdateAgencyRequest request = new UpdateAgencyRequest();
            request.setName("TechRecruit Global");
            request.setRating(5);

            AgencyDto updatedDto = AgencyDto.builder()
                    .id(agencyId)
                    .name("TechRecruit Global")
                    .rating(5)
                    .status(RecruitmentAgency.AgencyStatus.ACTIVE)
                    .build();

            when(agencyService.updateAgency(eq(agencyId), any(UpdateAgencyRequest.class)))
                    .thenReturn(updatedDto);

            mockMvc.perform(put("/api/v1/recruitment/agencies/{id}", agencyId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.name").value("TechRecruit Global"))
                    .andExpect(jsonPath("$.rating").value(5));

            verify(agencyService).updateAgency(eq(agencyId), any(UpdateAgencyRequest.class));
        }

        @Test
        @DisplayName("Should delete agency successfully")
        void shouldDeleteAgencySuccessfully() throws Exception {
            doNothing().when(agencyService).deleteAgency(agencyId);

            mockMvc.perform(delete("/api/v1/recruitment/agencies/{id}", agencyId))
                    .andExpect(status().isNoContent());

            verify(agencyService).deleteAgency(agencyId);
        }
    }

    @Nested
    @DisplayName("Submission Tests")
    class SubmissionTests {

        @Test
        @DisplayName("Should get agency submissions with pagination")
        void shouldGetAgencySubmissions() throws Exception {
            Page<AgencySubmissionDto> page = new PageImpl<>(
                    List.of(submissionDto), PageRequest.of(0, 20), 1);

            when(agencyService.getAgencySubmissions(eq(agencyId), any(Pageable.class)))
                    .thenReturn(page);

            mockMvc.perform(get("/api/v1/recruitment/agencies/{id}/submissions", agencyId)
                            .param("page", "0")
                            .param("size", "20"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content", hasSize(1)))
                    .andExpect(jsonPath("$.content[0].agencyName").value("TechRecruit Partners"))
                    .andExpect(jsonPath("$.content[0].candidateName").value("John Doe"));

            verify(agencyService).getAgencySubmissions(eq(agencyId), any(Pageable.class));
        }

        @Test
        @DisplayName("Should submit candidate through agency")
        void shouldSubmitCandidateThroughAgency() throws Exception {
            CreateSubmissionRequest request = new CreateSubmissionRequest();
            request.setCandidateId(UUID.randomUUID());
            request.setJobOpeningId(jobOpeningId);
            request.setFeeAgreed(new BigDecimal("5000.00"));
            request.setFeeCurrency("USD");
            request.setNotes("Strong candidate from agency pipeline");

            when(agencyService.submitCandidate(eq(agencyId), any(CreateSubmissionRequest.class)))
                    .thenReturn(submissionDto);

            mockMvc.perform(post("/api/v1/recruitment/agencies/{id}/submissions", agencyId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.id").exists())
                    .andExpect(jsonPath("$.status").value("SUBMITTED"));

            verify(agencyService).submitCandidate(eq(agencyId), any(CreateSubmissionRequest.class));
        }

        @Test
        @DisplayName("Should update submission status")
        void shouldUpdateSubmissionStatus() throws Exception {
            UUID submissionId = UUID.randomUUID();
            UpdateSubmissionStatusRequest request = new UpdateSubmissionStatusRequest();
            request.setStatus(AgencySubmission.SubmissionStatus.HIRED);
            request.setHiredAt(LocalDate.now());
            request.setInvoiceStatus(AgencySubmission.InvoiceStatus.PENDING);
            request.setInvoiceAmount(new BigDecimal("5000.00"));

            AgencySubmissionDto updatedDto = AgencySubmissionDto.builder()
                    .id(submissionId)
                    .status(AgencySubmission.SubmissionStatus.HIRED)
                    .hiredAt(LocalDate.now())
                    .invoiceStatus(AgencySubmission.InvoiceStatus.PENDING)
                    .invoiceAmount(new BigDecimal("5000.00"))
                    .build();

            when(agencyService.updateSubmissionStatus(eq(submissionId), any(UpdateSubmissionStatusRequest.class)))
                    .thenReturn(updatedDto);

            mockMvc.perform(put("/api/v1/recruitment/agencies/submissions/{submissionId}/status", submissionId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("HIRED"))
                    .andExpect(jsonPath("$.invoiceStatus").value("PENDING"));

            verify(agencyService).updateSubmissionStatus(eq(submissionId), any(UpdateSubmissionStatusRequest.class));
        }
    }

    @Nested
    @DisplayName("Performance Tests")
    class PerformanceTests {

        @Test
        @DisplayName("Should get agency performance metrics")
        void shouldGetAgencyPerformance() throws Exception {
            AgencyPerformanceDto performanceDto = AgencyPerformanceDto.builder()
                    .agencyId(agencyId)
                    .agencyName("TechRecruit Partners")
                    .totalSubmissions(50)
                    .hiredCount(12)
                    .rejectedCount(15)
                    .activeSubmissions(23)
                    .hireRate(new BigDecimal("24.00"))
                    .totalFeesPaid(new BigDecimal("60000.00"))
                    .rating(4)
                    .build();

            when(agencyService.getAgencyPerformance(agencyId)).thenReturn(performanceDto);

            mockMvc.perform(get("/api/v1/recruitment/agencies/{id}/performance", agencyId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.agencyName").value("TechRecruit Partners"))
                    .andExpect(jsonPath("$.totalSubmissions").value(50))
                    .andExpect(jsonPath("$.hiredCount").value(12))
                    .andExpect(jsonPath("$.rating").value(4));

            verify(agencyService).getAgencyPerformance(agencyId);
        }
    }

    @Nested
    @DisplayName("Cross-Entity Query Tests")
    class CrossEntityQueryTests {

        @Test
        @DisplayName("Should get submissions by job opening")
        void shouldGetSubmissionsByJobOpening() throws Exception {
            Page<AgencySubmissionDto> page = new PageImpl<>(
                    List.of(submissionDto), PageRequest.of(0, 20), 1);

            when(agencyService.getSubmissionsByJobOpening(eq(jobOpeningId), any(Pageable.class)))
                    .thenReturn(page);

            mockMvc.perform(get("/api/v1/recruitment/agencies/submissions/job/{jobOpeningId}", jobOpeningId)
                            .param("page", "0")
                            .param("size", "20"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content", hasSize(1)))
                    .andExpect(jsonPath("$.content[0].jobOpeningId").value(jobOpeningId.toString()));

            verify(agencyService).getSubmissionsByJobOpening(eq(jobOpeningId), any(Pageable.class));
        }
    }
}
