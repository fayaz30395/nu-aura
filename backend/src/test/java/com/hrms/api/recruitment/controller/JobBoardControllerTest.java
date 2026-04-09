package com.hrms.api.recruitment.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.application.recruitment.service.JobBoardIntegrationService;
import com.hrms.common.security.*;
import com.hrms.domain.recruitment.JobBoardPosting;
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

import java.util.*;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(JobBoardController.class)
@ContextConfiguration(classes = {JobBoardController.class, JobBoardControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("JobBoardController Tests")
class JobBoardControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @MockitoBean
    private JobBoardIntegrationService jobBoardService;
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

    private UUID jobOpeningId;
    private UUID postingId;
    private JobBoardPosting posting;

    @BeforeEach
    void setUp() {
        jobOpeningId = UUID.randomUUID();
        postingId = UUID.randomUUID();
        posting = new JobBoardPosting();
        posting.setId(postingId);
        posting.setJobOpeningId(jobOpeningId);
        posting.setBoardName(JobBoardPosting.JobBoard.LINKEDIN);
        posting.setStatus(JobBoardPosting.PostingStatus.ACTIVE);
    }

    @Configuration
    static class TestConfig {
        @Bean
        public org.springframework.data.domain.AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }

    @Test
    @DisplayName("Should post job to boards successfully")
    void shouldPostJobToBoards() throws Exception {
        JobBoardController.PostJobRequest request = new JobBoardController.PostJobRequest();
        request.setJobOpeningId(jobOpeningId);
        request.setBoards(List.of(JobBoardPosting.JobBoard.LINKEDIN, JobBoardPosting.JobBoard.INDEED));

        when(jobBoardService.postJob(eq(jobOpeningId), any())).thenReturn(List.of(posting));

        mockMvc.perform(post("/api/v1/recruitment/job-boards/post")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].boardName").value("LINKEDIN"));

        verify(jobBoardService).postJob(eq(jobOpeningId), any());
    }

    @Test
    @DisplayName("Should return 400 when posting without job opening ID")
    void shouldReturn400WhenMissingJobOpeningId() throws Exception {
        JobBoardController.PostJobRequest request = new JobBoardController.PostJobRequest();
        request.setBoards(List.of(JobBoardPosting.JobBoard.LINKEDIN));

        mockMvc.perform(post("/api/v1/recruitment/job-boards/post")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Should pause posting successfully")
    void shouldPausePosting() throws Exception {
        posting.setStatus(JobBoardPosting.PostingStatus.PAUSED);
        when(jobBoardService.pausePosting(postingId)).thenReturn(posting);

        mockMvc.perform(post("/api/v1/recruitment/job-boards/{postingId}/pause", postingId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PAUSED"));

        verify(jobBoardService).pausePosting(postingId);
    }

    @Test
    @DisplayName("Should get postings for a job opening")
    void shouldGetPostingsForJob() throws Exception {
        when(jobBoardService.getPostingsForJob(jobOpeningId)).thenReturn(List.of(posting));

        mockMvc.perform(get("/api/v1/recruitment/job-boards/job/{jobOpeningId}", jobOpeningId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].jobOpeningId").value(jobOpeningId.toString()));

        verify(jobBoardService).getPostingsForJob(jobOpeningId);
    }

    @Test
    @DisplayName("Should get all postings with pagination")
    void shouldGetAllPostings() throws Exception {
        Page<JobBoardPosting> page = new PageImpl<>(
                List.of(posting), PageRequest.of(0, 20), 1);

        when(jobBoardService.getAllPostings(any(Pageable.class))).thenReturn(page);

        mockMvc.perform(get("/api/v1/recruitment/job-boards")
                        .param("page", "0")
                        .param("size", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)));

        verify(jobBoardService).getAllPostings(any(Pageable.class));
    }

    @Test
    @DisplayName("Should get postings filtered by status")
    void shouldGetPostingsByStatus() throws Exception {
        Page<JobBoardPosting> page = new PageImpl<>(
                List.of(posting), PageRequest.of(0, 20), 1);

        when(jobBoardService.getPostingsByStatus(eq(JobBoardPosting.PostingStatus.ACTIVE), any(Pageable.class)))
                .thenReturn(page);

        mockMvc.perform(get("/api/v1/recruitment/job-boards/status/{status}", "ACTIVE")
                        .param("page", "0")
                        .param("size", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].status").value("ACTIVE"));

        verify(jobBoardService).getPostingsByStatus(eq(JobBoardPosting.PostingStatus.ACTIVE), any(Pageable.class));
    }

    @Test
    @DisplayName("Should return 400 when boards list is empty")
    void shouldReturn400WhenBoardsEmpty() throws Exception {
        JobBoardController.PostJobRequest request = new JobBoardController.PostJobRequest();
        request.setJobOpeningId(jobOpeningId);
        request.setBoards(List.of());

        mockMvc.perform(post("/api/v1/recruitment/job-boards/post")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }
}
