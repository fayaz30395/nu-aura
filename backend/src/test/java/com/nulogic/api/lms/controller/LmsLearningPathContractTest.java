package com.nulogic.api.lms.controller;

import com.nulogic.api.lms.dto.LearningPathSummaryResponse;
import com.nulogic.application.lms.service.LmsService;
import com.nulogic.application.lms.service.QuizManagementService;
import com.nulogic.application.lms.service.SkillGapAnalysisService;
import com.nulogic.common.security.JwtAuthenticationFilter;
import com.nulogic.common.security.TenantFilter;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * BUG-L1 regression: the wire contract of the learning-path endpoints.
 *
 * <p>{@code GET /api/v1/lms/learning-paths} and {@code POST /api/v1/lms/learning-paths/{id}/enroll}
 * did not exist; the Programs page called both and hung on its loading state forever. These tests
 * pin the endpoints AND the exact JSON field names the page renders — in particular
 * {@code isEnrolled}, which Lombok+Jackson would otherwise emit as {@code "enrolled"}, leaving the
 * page silently unable to show progress or the Continue button.</p>
 */
@WebMvcTest(LmsController.class)
@ContextConfiguration(classes = {LmsController.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@ActiveProfiles("test")
@DisplayName("LmsController learning-path contract (BUG-L1)")
class LmsLearningPathContractTest {

    @MockitoBean
    private JpaMetamodelMappingContext jpaMetamodelMappingContext;

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private LmsService lmsService;

    @MockitoBean
    private SkillGapAnalysisService skillGapAnalysisService;

    @MockitoBean
    private QuizManagementService quizManagementService;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockitoBean
    private TenantFilter tenantFilter;

    private static LearningPathSummaryResponse sample(UUID id) {
        return LearningPathSummaryResponse.builder()
                .id(id)
                .title("Security and Compliance Onboarding")
                .description("The training every new joiner completes.")
                .difficulty("BEGINNER")
                .durationHours(7)
                .courseCount(2)
                .totalEnrollments(12L)
                .thumbnailUrl(null)
                .isEnrolled(true)
                .progressPercentage(75)
                .status("IN_PROGRESS")
                .build();
    }

    @Test
    @DisplayName("GET /lms/learning-paths returns a page whose fields match what the UI renders")
    void listReturnsTheContractTheUiRenders() throws Exception {
        UUID pathId = UUID.randomUUID();
        when(lmsService.getLearningPaths(any(), any(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(sample(pathId)), PageRequest.of(0, 20), 1));

        mockMvc.perform(get("/api/v1/lms/learning-paths"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].id").value(pathId.toString()))
                .andExpect(jsonPath("$.content[0].title").value("Security and Compliance Onboarding"))
                .andExpect(jsonPath("$.content[0].difficulty").value("BEGINNER"))
                .andExpect(jsonPath("$.content[0].durationHours").value(7))
                .andExpect(jsonPath("$.content[0].courseCount").value(2))
                .andExpect(jsonPath("$.content[0].totalEnrollments").value(12))
                .andExpect(jsonPath("$.content[0].progressPercentage").value(75))
                .andExpect(jsonPath("$.content[0].status").value("IN_PROGRESS"))
                // The trap: must be "isEnrolled", not Jackson's default "enrolled".
                .andExpect(jsonPath("$.content[0].isEnrolled").value(true));
    }

    @Test
    @DisplayName("GET /lms/learning-paths honours page and size")
    void listPassesPaginationThrough() throws Exception {
        when(lmsService.getLearningPaths(any(), any(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(2, 5), 0));

        mockMvc.perform(get("/api/v1/lms/learning-paths").param("page", "2").param("size", "5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(0));

        verify(lmsService).getLearningPaths(any(), any(), eq(PageRequest.of(2, 5)));
    }

    @Test
    @DisplayName("POST /lms/learning-paths/{id}/enroll enrolls the caller in that path")
    void enrollDelegatesToTheService() throws Exception {
        UUID pathId = UUID.randomUUID();

        mockMvc.perform(post("/api/v1/lms/learning-paths/{id}/enroll", pathId))
                .andExpect(status().isOk());

        verify(lmsService).enrollInLearningPath(any(), eq(pathId), any(), any());
    }
}
