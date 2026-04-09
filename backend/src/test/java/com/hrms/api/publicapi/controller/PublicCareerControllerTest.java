package com.hrms.api.publicapi.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.application.publicapi.service.PublicCareerService;
import com.hrms.common.security.*;
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
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.util.*;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(PublicCareerController.class)
@ContextConfiguration(classes = {PublicCareerController.class, PublicCareerControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("PublicCareerController Unit Tests — No Auth Required")
class PublicCareerControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @MockitoBean
    private PublicCareerService publicCareerService;
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

    private UUID tenantId;
    private UUID jobId;

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
        jobId = UUID.randomUUID();
    }

    @Configuration
    static class TestConfig {
        @Bean
        public org.springframework.data.domain.AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }

    @Nested
    @DisplayName("List Public Jobs")
    class ListPublicJobsTests {

        @Test
        @DisplayName("Should list public jobs without authentication")
        void shouldListPublicJobsWithoutAuth() throws Exception {
            Map<String, Object> response = Map.of(
                    "content", List.of(Map.of(
                            "id", jobId.toString(),
                            "title", "Software Engineer",
                            "department", "Engineering",
                            "location", "Remote"
                    )),
                    "totalElements", 1,
                    "totalPages", 1
            );

            try (MockedStatic<TenantContext> tenantContext = mockStatic(TenantContext.class)) {
                tenantContext.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);

                when(publicCareerService.findPublicOpenJobs(
                        eq(tenantId), any(), any(), any(), any(), anyInt(), anyInt()))
                        .thenReturn(response);

                mockMvc.perform(get("/api/public/careers/jobs")
                                .param("page", "0")
                                .param("size", "9"))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.totalElements").value(1));

                verify(publicCareerService).findPublicOpenJobs(
                        eq(tenantId), any(), any(), any(), any(), eq(0), eq(9));
            }
        }

        @Test
        @DisplayName("Should list public jobs with search and filters")
        void shouldListPublicJobsWithFilters() throws Exception {
            Map<String, Object> response = Map.of(
                    "content", List.of(),
                    "totalElements", 0,
                    "totalPages", 0
            );

            try (MockedStatic<TenantContext> tenantContext = mockStatic(TenantContext.class)) {
                tenantContext.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);

                when(publicCareerService.findPublicOpenJobs(
                        eq(tenantId), eq("engineer"), eq("Engineering"), eq("Remote"), eq("FULL_TIME"),
                        eq(0), eq(9)))
                        .thenReturn(response);

                mockMvc.perform(get("/api/public/careers/jobs")
                                .param("q", "engineer")
                                .param("department", "Engineering")
                                .param("location", "Remote")
                                .param("employmentType", "FULL_TIME")
                                .param("page", "0")
                                .param("size", "9"))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.totalElements").value(0));

                verify(publicCareerService).findPublicOpenJobs(
                        eq(tenantId), eq("engineer"), eq("Engineering"), eq("Remote"), eq("FULL_TIME"),
                        eq(0), eq(9));
            }
        }
    }

    @Nested
    @DisplayName("Get Job Detail")
    class GetJobDetailTests {

        @Test
        @DisplayName("Should get job detail by ID without authentication")
        void shouldGetJobDetailWithoutAuth() throws Exception {
            Map<String, Object> jobDetail = Map.of(
                    "id", jobId.toString(),
                    "title", "Software Engineer",
                    "description", "We are looking for a talented engineer",
                    "department", "Engineering",
                    "location", "Remote",
                    "employmentType", "FULL_TIME"
            );

            try (MockedStatic<TenantContext> tenantContext = mockStatic(TenantContext.class)) {
                tenantContext.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);

                when(publicCareerService.findPublicJobById(jobId, tenantId))
                        .thenReturn(Optional.of(jobDetail));

                mockMvc.perform(get("/api/public/careers/jobs/{jobId}", jobId))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.title").value("Software Engineer"))
                        .andExpect(jsonPath("$.department").value("Engineering"));

                verify(publicCareerService).findPublicJobById(jobId, tenantId);
            }
        }

        @Test
        @DisplayName("Should return 404 when job not found or not OPEN")
        void shouldReturn404WhenJobNotFound() throws Exception {
            UUID nonExistentJobId = UUID.randomUUID();

            try (MockedStatic<TenantContext> tenantContext = mockStatic(TenantContext.class)) {
                tenantContext.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);

                when(publicCareerService.findPublicJobById(nonExistentJobId, tenantId))
                        .thenReturn(Optional.empty());

                mockMvc.perform(get("/api/public/careers/jobs/{jobId}", nonExistentJobId))
                        .andExpect(status().isNotFound());

                verify(publicCareerService).findPublicJobById(nonExistentJobId, tenantId);
            }
        }
    }

    @Nested
    @DisplayName("Apply For Job")
    class ApplyForJobTests {

        @Test
        @DisplayName("Should submit application without authentication")
        void shouldSubmitApplicationWithoutAuth() throws Exception {
            Map<String, Object> response = Map.of(
                    "success", true,
                    "message", "Application submitted successfully"
            );

            try (MockedStatic<TenantContext> tenantContext = mockStatic(TenantContext.class)) {
                tenantContext.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);

                when(publicCareerService.submitPublicApplication(
                        eq(tenantId), eq(jobId), eq("John"), eq("Doe"),
                        eq("john@example.com"), any(), any(), any(), any()))
                        .thenReturn(response);

                mockMvc.perform(multipart("/api/public/careers/apply")
                                .param("jobId", jobId.toString())
                                .param("firstName", "John")
                                .param("lastName", "Doe")
                                .param("email", "john@example.com")
                                .param("phone", "+1234567890")
                                .param("coverLetter", "I am excited to apply")
                                .contentType(MediaType.MULTIPART_FORM_DATA))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.success").value(true))
                        .andExpect(jsonPath("$.message").value("Application submitted successfully"));
            }
        }

        @Test
        @DisplayName("Should submit application with resume file")
        void shouldSubmitApplicationWithResume() throws Exception {
            MockMultipartFile resume = new MockMultipartFile(
                    "resume", "resume.pdf", "application/pdf",
                    "fake pdf content".getBytes());

            Map<String, Object> response = Map.of(
                    "success", true,
                    "message", "Application submitted successfully"
            );

            try (MockedStatic<TenantContext> tenantContext = mockStatic(TenantContext.class)) {
                tenantContext.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);

                when(publicCareerService.submitPublicApplication(
                        eq(tenantId), eq(jobId), eq("Jane"), eq("Smith"),
                        eq("jane@example.com"), any(), any(), any(), any()))
                        .thenReturn(response);

                mockMvc.perform(multipart("/api/public/careers/apply")
                                .file(resume)
                                .param("jobId", jobId.toString())
                                .param("firstName", "Jane")
                                .param("lastName", "Smith")
                                .param("email", "jane@example.com")
                                .contentType(MediaType.MULTIPART_FORM_DATA))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.success").value(true));
            }
        }

        @Test
        @DisplayName("Should return 422 when application is rejected")
        void shouldReturn422WhenApplicationRejected() throws Exception {
            try (MockedStatic<TenantContext> tenantContext = mockStatic(TenantContext.class)) {
                tenantContext.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);

                when(publicCareerService.submitPublicApplication(
                        eq(tenantId), eq(jobId), any(), any(), any(), any(), any(), any(), any()))
                        .thenThrow(new IllegalArgumentException("Job opening is no longer accepting applications"));

                mockMvc.perform(multipart("/api/public/careers/apply")
                                .param("jobId", jobId.toString())
                                .param("firstName", "John")
                                .param("lastName", "Doe")
                                .param("email", "john@example.com")
                                .contentType(MediaType.MULTIPART_FORM_DATA))
                        .andExpect(status().isUnprocessableEntity())
                        .andExpect(jsonPath("$.success").value(false))
                        .andExpect(jsonPath("$.message").value("Job opening is no longer accepting applications"));
            }
        }
    }

    @Nested
    @DisplayName("Filter Options")
    class FilterOptionsTests {

        @Test
        @DisplayName("Should get filter options without authentication")
        void shouldGetFilterOptionsWithoutAuth() throws Exception {
            Map<String, Object> filters = Map.of(
                    "locations", List.of("Remote", "New York", "London"),
                    "employmentTypes", List.of("FULL_TIME", "PART_TIME", "CONTRACT"),
                    "departments", List.of(Map.of("id", UUID.randomUUID().toString(), "name", "Engineering"))
            );

            try (MockedStatic<TenantContext> tenantContext = mockStatic(TenantContext.class)) {
                tenantContext.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);

                when(publicCareerService.getPublicJobFilters(tenantId)).thenReturn(filters);

                mockMvc.perform(get("/api/public/careers/filters"))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.locations").isArray())
                        .andExpect(jsonPath("$.employmentTypes").isArray())
                        .andExpect(jsonPath("$.departments").isArray());

                verify(publicCareerService).getPublicJobFilters(tenantId);
            }
        }

        @Test
        @DisplayName("Should return empty filters when no open jobs")
        void shouldReturnEmptyFiltersWhenNoOpenJobs() throws Exception {
            Map<String, Object> filters = Map.of(
                    "locations", List.of(),
                    "employmentTypes", List.of(),
                    "departments", List.of()
            );

            try (MockedStatic<TenantContext> tenantContext = mockStatic(TenantContext.class)) {
                tenantContext.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);

                when(publicCareerService.getPublicJobFilters(tenantId)).thenReturn(filters);

                mockMvc.perform(get("/api/public/careers/filters"))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.locations").isEmpty())
                        .andExpect(jsonPath("$.employmentTypes").isEmpty());

                verify(publicCareerService).getPublicJobFilters(tenantId);
            }
        }
    }
}
