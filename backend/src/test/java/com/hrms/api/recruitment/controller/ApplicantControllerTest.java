package com.hrms.api.recruitment.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.recruitment.dto.ApplicantPipelineResponse;
import com.hrms.api.recruitment.dto.ApplicantRequest;
import com.hrms.api.recruitment.dto.ApplicantResponse;
import com.hrms.api.recruitment.dto.ApplicantStatusUpdateRequest;
import com.hrms.application.recruitment.service.ApplicantService;
import com.hrms.common.security.JwtAuthenticationFilter;
import com.hrms.common.security.TenantFilter;
import com.hrms.domain.recruitment.ApplicationStatus;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.http.MediaType;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ApplicantController.class)
@ContextConfiguration(classes = {ApplicantController.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("ApplicantController Unit Tests")
class ApplicantControllerTest {

    @MockitoBean
    private JpaMetamodelMappingContext jpaMetamodelMappingContext;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private ApplicantService applicantService;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockitoBean
    private TenantFilter tenantFilter;

    private UUID applicantId;
    private UUID jobOpeningId;
    private ApplicantResponse applicantResponse;

    @BeforeEach
    void setUp() {
        applicantId = UUID.randomUUID();
        jobOpeningId = UUID.randomUUID();

        applicantResponse = ApplicantResponse.builder()
                .id(applicantId)
                .candidateName("Jane Smith")
                .status(ApplicationStatus.APPLIED)
                .jobOpeningId(jobOpeningId)
                .build();
    }

    @Nested
    @DisplayName("Create Applicant Tests")
    class CreateApplicantTests {

        @Test
        @DisplayName("Should create applicant successfully")
        void shouldCreateApplicantSuccessfully() throws Exception {
            ApplicantRequest request = new ApplicantRequest();
            request.setCandidateId(UUID.randomUUID());
            request.setJobOpeningId(jobOpeningId);

            when(applicantService.createApplicant(any(ApplicantRequest.class))).thenReturn(applicantResponse);

            mockMvc.perform(post("/api/v1/recruitment/applicants")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.id").value(applicantId.toString()))
                    .andExpect(jsonPath("$.status").value("APPLIED"));

            verify(applicantService).createApplicant(any(ApplicantRequest.class));
        }
    }

    @Nested
    @DisplayName("Get Applicant Tests")
    class GetApplicantTests {

        @Test
        @DisplayName("Should get applicant by ID")
        void shouldGetApplicantById() throws Exception {
            when(applicantService.getApplicant(applicantId)).thenReturn(applicantResponse);

            mockMvc.perform(get("/api/v1/recruitment/applicants/{id}", applicantId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(applicantId.toString()))
                    .andExpect(jsonPath("$.firstName").value("Jane"));

            verify(applicantService).getApplicant(applicantId);
        }

        @Test
        @DisplayName("Should list applicants paginated")
        void shouldListApplicantsPaginated() throws Exception {
            Page<ApplicantResponse> page = new PageImpl<>(List.of(applicantResponse),
                    PageRequest.of(0, 20), 1);

            when(applicantService.listApplicants(any(), any(), any(Pageable.class))).thenReturn(page);

            mockMvc.perform(get("/api/v1/recruitment/applicants")
                            .param("page", "0")
                            .param("size", "20"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content.length()").value(1))
                    .andExpect(jsonPath("$.content[0].firstName").value("Jane"));

            verify(applicantService).listApplicants(isNull(), isNull(), any(Pageable.class));
        }

        @Test
        @DisplayName("Should list applicants filtered by job opening")
        void shouldListApplicantsFilteredByJobOpening() throws Exception {
            Page<ApplicantResponse> page = new PageImpl<>(List.of(applicantResponse),
                    PageRequest.of(0, 20), 1);

            when(applicantService.listApplicants(eq(jobOpeningId), any(), any(Pageable.class)))
                    .thenReturn(page);

            mockMvc.perform(get("/api/v1/recruitment/applicants")
                            .param("jobOpeningId", jobOpeningId.toString()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content.length()").value(1));

            verify(applicantService).listApplicants(eq(jobOpeningId), isNull(), any(Pageable.class));
        }

        @Test
        @DisplayName("Should list applicants filtered by status")
        void shouldListApplicantsFilteredByStatus() throws Exception {
            Page<ApplicantResponse> page = new PageImpl<>(List.of(applicantResponse),
                    PageRequest.of(0, 20), 1);

            when(applicantService.listApplicants(any(), eq(ApplicationStatus.APPLIED), any(Pageable.class)))
                    .thenReturn(page);

            mockMvc.perform(get("/api/v1/recruitment/applicants")
                            .param("status", "APPLIED"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content.length()").value(1));
        }

        @Test
        @DisplayName("Should get pipeline for job opening")
        void shouldGetPipelineForJobOpening() throws Exception {
            ApplicantPipelineResponse pipelineResponse = ApplicantPipelineResponse.builder()
                    .pipeline(new java.util.HashMap<>())
                    .build();

            when(applicantService.getPipeline(jobOpeningId)).thenReturn(pipelineResponse);

            mockMvc.perform(get("/api/v1/recruitment/applicants/pipeline/{jobOpeningId}", jobOpeningId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.pipeline").exists());

            verify(applicantService).getPipeline(jobOpeningId);
        }
    }

    @Nested
    @DisplayName("Update Applicant Tests")
    class UpdateApplicantTests {

        @Test
        @DisplayName("Should update applicant status")
        void shouldUpdateApplicantStatus() throws Exception {
            ApplicantStatusUpdateRequest request = new ApplicantStatusUpdateRequest();
            request.setStatus(ApplicationStatus.SCREENING);

            ApplicantResponse updated = ApplicantResponse.builder()
                    .id(applicantId)
                    .status(ApplicationStatus.SCREENING)
                    .build();

            when(applicantService.updateStatus(eq(applicantId), any(ApplicantStatusUpdateRequest.class)))
                    .thenReturn(updated);

            mockMvc.perform(put("/api/v1/recruitment/applicants/{id}/status", applicantId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("SCREENING"));

            verify(applicantService).updateStatus(eq(applicantId), any(ApplicantStatusUpdateRequest.class));
        }

        @Test
        @DisplayName("Should rate applicant")
        void shouldRateApplicant() throws Exception {
            ApplicantResponse rated = ApplicantResponse.builder()
                    .id(applicantId)
                    .rating(4)
                    .build();

            when(applicantService.rateApplicant(applicantId, 4)).thenReturn(rated);

            mockMvc.perform(put("/api/v1/recruitment/applicants/{id}/rating", applicantId)
                            .param("rating", "4"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.rating").value(4));

            verify(applicantService).rateApplicant(applicantId, 4);
        }
    }

    @Nested
    @DisplayName("Delete Applicant Tests")
    class DeleteApplicantTests {

        @Test
        @DisplayName("Should delete applicant")
        void shouldDeleteApplicant() throws Exception {
            doNothing().when(applicantService).deleteApplicant(applicantId);

            mockMvc.perform(delete("/api/v1/recruitment/applicants/{id}", applicantId))
                    .andExpect(status().isNoContent());

            verify(applicantService).deleteApplicant(applicantId);
        }
    }
}
