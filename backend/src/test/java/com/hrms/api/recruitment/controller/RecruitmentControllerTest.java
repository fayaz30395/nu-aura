package com.hrms.api.recruitment.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.recruitment.dto.*;
import com.hrms.application.recruitment.service.RecruitmentManagementService;
import com.hrms.common.security.*;
import com.hrms.domain.recruitment.Candidate;
import com.hrms.domain.recruitment.JobOpening;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.*;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.*;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(RecruitmentController.class)
@ContextConfiguration(classes = {RecruitmentController.class, RecruitmentControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("RecruitmentController Integration Tests")
class RecruitmentControllerTest {

    @Configuration
    static class TestConfig {
        @Bean
        public org.springframework.data.domain.AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private RecruitmentManagementService recruitmentManagementService;

    @MockBean
    private ApiKeyService apiKeyService;

    @MockBean
    private JwtTokenProvider jwtTokenProvider;

    @MockBean
    private UserDetailsService userDetailsService;

    @MockBean
    private ApiKeyAuthenticationFilter apiKeyAuthenticationFilter;

    @MockBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockBean
    private RateLimitFilter rateLimitFilter;

    @MockBean
    private RateLimitingFilter rateLimitingFilter;

    @MockBean
    private TenantFilter tenantFilter;

    private UUID jobOpeningId;
    private UUID candidateId;
    private JobOpeningResponse jobOpeningResponse;
    private CandidateResponse candidateResponse;

    @BeforeEach
    void setUp() {
        jobOpeningId = UUID.randomUUID();
        candidateId = UUID.randomUUID();

        jobOpeningResponse = JobOpeningResponse.builder()
                .id(jobOpeningId)
                .jobTitle("Software Engineer")
                .departmentName("Engineering")
                .jobDescription("Senior software engineer position")
                .status(JobOpening.JobStatus.OPEN)
                .build();

        candidateResponse = CandidateResponse.builder()
                .id(candidateId)
                .fullName("John Doe")
                .email("john@example.com")
                .phone("+1234567890")
                .jobOpeningId(jobOpeningId)
                .build();
    }

    @Nested
    @DisplayName("Job Opening Tests")
    class JobOpeningTests {

        @Test
        @DisplayName("Should create job opening successfully")
        void shouldCreateJobOpeningSuccessfully() throws Exception {
            JobOpeningRequest request = new JobOpeningRequest();
            request.setJobTitle("Software Engineer");
            request.setJobDescription("Senior software engineer position");

            when(recruitmentManagementService.createJobOpening(any(JobOpeningRequest.class)))
                    .thenReturn(jobOpeningResponse);

            mockMvc.perform(post("/api/v1/recruitment/job-openings")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").exists())
                    .andExpect(jsonPath("$.jobTitle").value("Software Engineer"))
                    .andExpect(jsonPath("$.status").value("OPEN"));

            verify(recruitmentManagementService).createJobOpening(any(JobOpeningRequest.class));
        }

        @Test
        @DisplayName("Should return 400 for invalid job opening request")
        void shouldReturn400ForInvalidRequest() throws Exception {
            JobOpeningRequest request = new JobOpeningRequest();
            // Missing required fields

            mockMvc.perform(post("/api/v1/recruitment/job-openings")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("Should update job opening successfully")
        void shouldUpdateJobOpeningSuccessfully() throws Exception {
            JobOpeningRequest request = new JobOpeningRequest();
            request.setJobTitle("Senior Software Engineer");
            request.setJobDescription("Updated job description");

            JobOpeningResponse updatedResponse = JobOpeningResponse.builder()
                    .id(jobOpeningId)
                    .jobTitle("Senior Software Engineer")
                    .departmentName("Engineering")
                    .jobDescription("Updated job description")
                    .status(JobOpening.JobStatus.OPEN)
                    .build();

            when(recruitmentManagementService.updateJobOpening(eq(jobOpeningId), any(JobOpeningRequest.class)))
                    .thenReturn(updatedResponse);

            mockMvc.perform(put("/api/v1/recruitment/job-openings/{id}", jobOpeningId)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.jobTitle").value("Senior Software Engineer"));

            verify(recruitmentManagementService).updateJobOpening(eq(jobOpeningId), any(JobOpeningRequest.class));
        }

        @Test
        @DisplayName("Should get job opening by ID")
        void shouldGetJobOpeningById() throws Exception {
            when(recruitmentManagementService.getJobOpeningById(jobOpeningId))
                    .thenReturn(jobOpeningResponse);

            mockMvc.perform(get("/api/v1/recruitment/job-openings/{id}", jobOpeningId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(jobOpeningId.toString()))
                    .andExpect(jsonPath("$.jobTitle").value("Software Engineer"));

            verify(recruitmentManagementService).getJobOpeningById(jobOpeningId);
        }

        @Test
        @DisplayName("Should get all job openings with pagination")
        void shouldGetAllJobOpenings() throws Exception {
            Page<JobOpeningResponse> page = new PageImpl<>(
                    Collections.singletonList(jobOpeningResponse),
                    PageRequest.of(0, 20),
                    1
            );

            when(recruitmentManagementService.getAllJobOpenings(any(Pageable.class)))
                    .thenReturn(page);

            mockMvc.perform(get("/api/v1/recruitment/job-openings")
                    .param("page", "0")
                    .param("size", "20"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content", hasSize(1)))
                    .andExpect(jsonPath("$.content[0].jobTitle").value("Software Engineer"));

            verify(recruitmentManagementService).getAllJobOpenings(any(Pageable.class));
        }

        @Test
        @DisplayName("Should get job openings by status")
        void shouldGetJobOpeningsByStatus() throws Exception {
            Page<JobOpeningResponse> page = new PageImpl<>(
                    Collections.singletonList(jobOpeningResponse),
                    PageRequest.of(0, 20),
                    1
            );

            when(recruitmentManagementService.getJobOpeningsByStatus(
                    eq(JobOpening.JobStatus.OPEN), any(Pageable.class)))
                    .thenReturn(page);

            mockMvc.perform(get("/api/v1/recruitment/job-openings/status/{status}", "OPEN")
                    .param("page", "0")
                    .param("size", "20"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content[0].status").value("OPEN"));

            verify(recruitmentManagementService).getJobOpeningsByStatus(
                    eq(JobOpening.JobStatus.OPEN), any(Pageable.class));
        }

        @Test
        @DisplayName("Should delete job opening successfully")
        void shouldDeleteJobOpeningSuccessfully() throws Exception {
            doNothing().when(recruitmentManagementService).deleteJobOpening(jobOpeningId);

            mockMvc.perform(delete("/api/v1/recruitment/job-openings/{id}", jobOpeningId))
                    .andExpect(status().isNoContent());

            verify(recruitmentManagementService).deleteJobOpening(jobOpeningId);
        }
    }

    @Nested
    @DisplayName("Candidate Tests")
    class CandidateTests {

        @Test
        @DisplayName("Should create candidate successfully")
        void shouldCreateCandidateSuccessfully() throws Exception {
            CandidateRequest request = new CandidateRequest();
            request.setFirstName("John");
            request.setLastName("Doe");
            request.setEmail("john@example.com");
            request.setPhone("+1234567890");
            request.setJobOpeningId(jobOpeningId);

            when(recruitmentManagementService.createCandidate(any(CandidateRequest.class)))
                    .thenReturn(candidateResponse);

            mockMvc.perform(post("/api/v1/recruitment/candidates")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.fullName").value("John Doe"))
                    .andExpect(jsonPath("$.email").value("john@example.com"));

            verify(recruitmentManagementService).createCandidate(any(CandidateRequest.class));
        }

        @Test
        @DisplayName("Should update candidate successfully")
        void shouldUpdateCandidateSuccessfully() throws Exception {
            CandidateRequest request = new CandidateRequest();
            request.setFirstName("John");
            request.setLastName("Doe Updated");
            request.setEmail("john.updated@example.com");
            request.setPhone("+1234567890");
            request.setJobOpeningId(jobOpeningId);

            CandidateResponse updatedResponse = CandidateResponse.builder()
                    .id(candidateId)
                    .fullName("John Doe Updated")
                    .email("john.updated@example.com")
                    .phone("+1234567890")
                    .jobOpeningId(jobOpeningId)
                    .build();

            when(recruitmentManagementService.updateCandidate(eq(candidateId), any(CandidateRequest.class)))
                    .thenReturn(updatedResponse);

            mockMvc.perform(put("/api/v1/recruitment/candidates/{id}", candidateId)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.fullName").value("John Doe Updated"));

            verify(recruitmentManagementService).updateCandidate(eq(candidateId), any(CandidateRequest.class));
        }

        @Test
        @DisplayName("Should get candidate by ID")
        void shouldGetCandidateById() throws Exception {
            when(recruitmentManagementService.getCandidateById(candidateId))
                    .thenReturn(candidateResponse);

            mockMvc.perform(get("/api/v1/recruitment/candidates/{id}", candidateId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(candidateId.toString()))
                    .andExpect(jsonPath("$.fullName").value("John Doe"));

            verify(recruitmentManagementService).getCandidateById(candidateId);
        }

        @Test
        @DisplayName("Should get all candidates with pagination")
        void shouldGetAllCandidates() throws Exception {
            Page<CandidateResponse> page = new PageImpl<>(
                    Collections.singletonList(candidateResponse),
                    PageRequest.of(0, 20),
                    1
            );

            when(recruitmentManagementService.getAllCandidates(any(Pageable.class)))
                    .thenReturn(page);

            mockMvc.perform(get("/api/v1/recruitment/candidates")
                    .param("page", "0")
                    .param("size", "20"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content", hasSize(1)))
                    .andExpect(jsonPath("$.content[0].fullName").value("John Doe"));

            verify(recruitmentManagementService).getAllCandidates(any(Pageable.class));
        }

        @Test
        @DisplayName("Should get candidates by job opening")
        void shouldGetCandidatesByJobOpening() throws Exception {
            Page<CandidateResponse> page = new PageImpl<>(
                    Collections.singletonList(candidateResponse),
                    PageRequest.of(0, 20),
                    1
            );

            when(recruitmentManagementService.getCandidatesByJobOpening(eq(jobOpeningId), any(Pageable.class)))
                    .thenReturn(page);

            mockMvc.perform(get("/api/v1/recruitment/candidates/job-opening/{jobOpeningId}", jobOpeningId)
                    .param("page", "0")
                    .param("size", "20"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content[0].jobOpeningId").value(jobOpeningId.toString()));

            verify(recruitmentManagementService).getCandidatesByJobOpening(eq(jobOpeningId), any(Pageable.class));
        }

        @Test
        @DisplayName("Should move candidate to next stage")
        void shouldMoveCandidateStage() throws Exception {
            MoveStageRequest request = MoveStageRequest.builder()
                    .stage(Candidate.RecruitmentStage.INTERVIEW)
                    .notes("Passed initial screening")
                    .build();

            CandidateResponse movedResponse = CandidateResponse.builder()
                    .id(candidateId)
                    .fullName("John Doe")
                    .email("john@example.com")
                    .phone("+1234567890")
                    .jobOpeningId(jobOpeningId)
                    .build();

            when(recruitmentManagementService.moveCandidateStage(
                    eq(candidateId), any(Candidate.RecruitmentStage.class), any()))
                    .thenReturn(movedResponse);

            mockMvc.perform(put("/api/v1/recruitment/candidates/{id}/stage", candidateId)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk());

            verify(recruitmentManagementService).moveCandidateStage(
                    eq(candidateId), any(Candidate.RecruitmentStage.class), any());
        }

        @Test
        @DisplayName("Should create offer for candidate")
        void shouldCreateOfferForCandidate() throws Exception {
            CreateOfferRequest request = CreateOfferRequest.builder()
                    .positionTitle("Software Engineer")
                    .offeredSalary(new java.math.BigDecimal("100000.0"))
                    .build();

            when(recruitmentManagementService.createOffer(eq(candidateId), any(CreateOfferRequest.class)))
                    .thenReturn(candidateResponse);

            mockMvc.perform(post("/api/v1/recruitment/candidates/{id}/offer", candidateId)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk());

            verify(recruitmentManagementService).createOffer(eq(candidateId), any(CreateOfferRequest.class));
        }

        @Test
        @DisplayName("Should accept offer")
        void shouldAcceptOffer() throws Exception {
            when(recruitmentManagementService.acceptOffer(eq(candidateId), any()))
                    .thenReturn(candidateResponse);

            mockMvc.perform(post("/api/v1/recruitment/candidates/{id}/accept-offer", candidateId))
                    .andExpect(status().isOk());

            verify(recruitmentManagementService).acceptOffer(eq(candidateId), any());
        }

        @Test
        @DisplayName("Should decline offer")
        void shouldDeclineOffer() throws Exception {
            OfferResponseRequest request = OfferResponseRequest.builder()
                    .declineReason("Found another opportunity")
                    .build();

            when(recruitmentManagementService.declineOffer(eq(candidateId), anyString()))
                    .thenReturn(candidateResponse);

            mockMvc.perform(post("/api/v1/recruitment/candidates/{id}/decline-offer", candidateId)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk());

            verify(recruitmentManagementService).declineOffer(eq(candidateId), anyString());
        }

        @Test
        @DisplayName("Should delete candidate")
        void shouldDeleteCandidate() throws Exception {
            doNothing().when(recruitmentManagementService).deleteCandidate(candidateId);

            mockMvc.perform(delete("/api/v1/recruitment/candidates/{id}", candidateId))
                    .andExpect(status().isNoContent());

            verify(recruitmentManagementService).deleteCandidate(candidateId);
        }
    }

    @Nested
    @DisplayName("Interview Tests")
    class InterviewTests {

        @Test
        @DisplayName("Should schedule interview successfully")
        void shouldScheduleInterviewSuccessfully() throws Exception {
            UUID interviewId = UUID.randomUUID();
            InterviewRequest request = new InterviewRequest();
            request.setCandidateId(candidateId);
            request.setJobOpeningId(jobOpeningId);
            request.setInterviewerId(UUID.randomUUID());
            request.setScheduledAt(LocalDateTime.now().plusDays(1));

            InterviewResponse response = InterviewResponse.builder()
                    .id(interviewId)
                    .candidateId(candidateId)
                    .jobOpeningId(jobOpeningId)
                    .build();

            when(recruitmentManagementService.scheduleInterview(any(InterviewRequest.class)))
                    .thenReturn(response);

            mockMvc.perform(post("/api/v1/recruitment/interviews")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.candidateId").value(candidateId.toString()));

            verify(recruitmentManagementService).scheduleInterview(any(InterviewRequest.class));
        }

        @Test
        @DisplayName("Should get all interviews")
        void shouldGetAllInterviews() throws Exception {
            UUID interviewId = UUID.randomUUID();
            InterviewResponse response = InterviewResponse.builder()
                    .id(interviewId)
                    .candidateId(candidateId)
                    .jobOpeningId(jobOpeningId)
                    .build();

            Page<InterviewResponse> page = new PageImpl<>(
                    Collections.singletonList(response),
                    PageRequest.of(0, 20),
                    1
            );

            when(recruitmentManagementService.getAllInterviews(any(Pageable.class)))
                    .thenReturn(page);

            mockMvc.perform(get("/api/v1/recruitment/interviews"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content", hasSize(1)));

            verify(recruitmentManagementService).getAllInterviews(any(Pageable.class));
        }

        @Test
        @DisplayName("Should get interviews by candidate")
        void shouldGetInterviewsByCandidate() throws Exception {
            UUID interviewId = UUID.randomUUID();
            InterviewResponse response = InterviewResponse.builder()
                    .id(interviewId)
                    .candidateId(candidateId)
                    .jobOpeningId(jobOpeningId)
                    .build();

            Page<InterviewResponse> page = new PageImpl<>(
                    Collections.singletonList(response),
                    PageRequest.of(0, 20),
                    1
            );

            when(recruitmentManagementService.getInterviewsByCandidate(eq(candidateId), any(Pageable.class)))
                    .thenReturn(page);

            mockMvc.perform(get("/api/v1/recruitment/interviews/candidate/{candidateId}", candidateId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content[0].candidateId").value(candidateId.toString()));

            verify(recruitmentManagementService).getInterviewsByCandidate(eq(candidateId), any(Pageable.class));
        }
    }
}
