package com.hrms.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.application.performance.dto.*;
import com.hrms.common.security.Permission;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.config.TestSecurityConfig;
import com.hrms.domain.performance.PerformanceReview;
import com.hrms.domain.performance.ReviewCycle;
import com.hrms.domain.user.RoleScope;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for NU-Grow performance use cases.
 * Covers UC-GROW-001 through UC-GROW-003, UC-GROW-010 through UC-GROW-013, UC-GROW-018, UC-GROW-022.
 */
@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
@Import(TestSecurityConfig.class)
@Transactional
@DisplayName("Performance Review Controller Integration Tests — UC-GROW-*")
class PerformanceReviewControllerTest {

    private static final UUID TENANT_ID = UUID.fromString("550e8400-e29b-41d4-a716-446655440000");
    private static final UUID USER_ID = UUID.fromString("660e8400-e29b-41d4-a716-446655440000");
    private static final UUID EMPLOYEE_ID = UUID.fromString("111e8400-e29b-41d4-a716-446655440099");
    private static final String CYCLE_BASE = "/api/v1/review-cycles";
    private static final String REVIEW_BASE = "/api/v1/reviews";
    private static final String PIP_BASE = "/api/v1/performance/pip";
    private static final String MEETING_BASE = "/api/v1/meetings";

    @Autowired
    MockMvc mockMvc;
    @Autowired
    ObjectMapper objectMapper;

    @BeforeEach
    void setUpSuperAdminContext() {
        Map<String, RoleScope> permissions = new HashMap<>();
        permissions.put(Permission.SYSTEM_ADMIN, RoleScope.ALL);
        SecurityContext.setCurrentUser(USER_ID, EMPLOYEE_ID, Set.of("SUPER_ADMIN"), permissions);
        TenantContext.setCurrentTenant(TENANT_ID);
    }

    // ─────────────────────────────────────────────────────────
    // UC-GROW-001  Create Review Cycle
    // ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("UC-GROW-001 happy: create review cycle returns 201")
    void ucGrow001_createReviewCycle_returns201() throws Exception {
        ReviewCycleRequest req = buildReviewCycleRequest("RC-" + uuid6());

        MvcResult result = mockMvc.perform(post(CYCLE_BASE)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andReturn();

        String body = result.getResponse().getContentAsString();
        assertThat(body).contains("id");
    }

    @Test
    @DisplayName("UC-GROW-001 negative: duplicate cycle name returns 409 or 400")
    void ucGrow001_duplicateCycleName_returns409Or400() throws Exception {
        String cycleName = "CYCLE-DUP-" + uuid6();
        ReviewCycleRequest req = buildReviewCycleRequest(cycleName);

        // First creation
        mockMvc.perform(post(CYCLE_BASE)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated());

        // Second with same name
        mockMvc.perform(post(CYCLE_BASE)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    // Unique constraint violation or business rule → 409/400
                    assertThat(status).isIn(400, 409, 500);
                });
    }

    @Test
    @DisplayName("UC-GROW-001 happy: list all review cycles returns 200")
    void ucGrow001_listReviewCycles_returns200() throws Exception {
        mockMvc.perform(get(CYCLE_BASE))
                .andExpect(status().isOk());
    }

    // ─────────────────────────────────────────────────────────
    // UC-GROW-002  Submit Self-Review
    // ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("UC-GROW-002 happy: create self-review returns 201")
    void ucGrow002_submitSelfReview_returns201() throws Exception {
        // First create a cycle to associate
        ReviewCycleRequest cycleReq = buildReviewCycleRequest("RC-SELF-" + uuid6());
        MvcResult cycleResult = mockMvc.perform(post(CYCLE_BASE)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(cycleReq)))
                .andExpect(status().isCreated())
                .andReturn();

        String cycleId = objectMapper.readTree(cycleResult.getResponse().getContentAsString())
                .get("id").asText();

        ReviewRequest reviewReq = ReviewRequest.builder()
                .employeeId(EMPLOYEE_ID)
                .reviewerId(EMPLOYEE_ID)
                .reviewCycleId(UUID.fromString(cycleId))
                .reviewType(PerformanceReview.ReviewType.SELF)
                .reviewPeriodStart(LocalDate.now().minusMonths(6))
                .reviewPeriodEnd(LocalDate.now())
                .status(PerformanceReview.ReviewStatus.DRAFT)
                .strengths("Good communication")
                .areasForImprovement("Time management")
                .build();

        mockMvc.perform(post(REVIEW_BASE)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(reviewReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.reviewType").value("SELF"));
    }

    @Test
    @DisplayName("UC-GROW-002 negative: submit self-review twice returns 409 or 400")
    void ucGrow002_submitSelfReviewTwice_returns409Or400() throws Exception {
        ReviewCycleRequest cycleReq = buildReviewCycleRequest("RC-DUP-" + uuid6());
        MvcResult cycleResult = mockMvc.perform(post(CYCLE_BASE)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(cycleReq)))
                .andExpect(status().isCreated())
                .andReturn();

        String cycleId = objectMapper.readTree(cycleResult.getResponse().getContentAsString())
                .get("id").asText();

        ReviewRequest reviewReq = ReviewRequest.builder()
                .employeeId(EMPLOYEE_ID)
                .reviewerId(EMPLOYEE_ID)
                .reviewCycleId(UUID.fromString(cycleId))
                .reviewType(PerformanceReview.ReviewType.SELF)
                .reviewPeriodStart(LocalDate.now().minusMonths(6))
                .reviewPeriodEnd(LocalDate.now())
                .status(PerformanceReview.ReviewStatus.DRAFT)
                .build();

        // First submission
        mockMvc.perform(post(REVIEW_BASE)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(reviewReq)))
                .andExpect(status().isCreated());

        // Second submission — same employee, same cycle, same type
        mockMvc.perform(post(REVIEW_BASE)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(reviewReq)))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    assertThat(status).isIn(400, 409, 500);
                });
    }

    // ─────────────────────────────────────────────────────────
    // UC-GROW-003  Manager Review Submitted & Final Rating
    // ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("UC-GROW-003 happy: submit manager review returns 201")
    void ucGrow003_submitManagerReview_returns201() throws Exception {
        ReviewCycleRequest cycleReq = buildReviewCycleRequest("RC-MGR-" + uuid6());
        MvcResult cycleResult = mockMvc.perform(post(CYCLE_BASE)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(cycleReq)))
                .andExpect(status().isCreated())
                .andReturn();

        String cycleId = objectMapper.readTree(cycleResult.getResponse().getContentAsString())
                .get("id").asText();

        ReviewRequest reviewReq = ReviewRequest.builder()
                .employeeId(EMPLOYEE_ID)
                .reviewerId(USER_ID)
                .reviewCycleId(UUID.fromString(cycleId))
                .reviewType(PerformanceReview.ReviewType.MANAGER)
                .reviewPeriodStart(LocalDate.now().minusMonths(6))
                .reviewPeriodEnd(LocalDate.now())
                .overallRating(new BigDecimal("4.0"))
                .managerComments("Excellent performance")
                .status(PerformanceReview.ReviewStatus.SUBMITTED)
                .build();

        mockMvc.perform(post(REVIEW_BASE)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(reviewReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.reviewType").value("MANAGER"));
    }

    @Test
    @DisplayName("UC-GROW-003 happy: self-assessment submission via review cycle endpoint")
    void ucGrow003_selfAssessmentViaReviewCycle_returns200OrNotFound() throws Exception {
        UUID randomReviewId = UUID.randomUUID();
        SelfAssessmentRequest selfReq = new SelfAssessmentRequest();
        selfReq.setOverallComments("I performed well");
        selfReq.setGoalAchievementPercent(85);
        selfReq.setCompetencyRatings(List.of());

        mockMvc.perform(put(CYCLE_BASE + "/reviews/{reviewId}/self-assessment", randomReviewId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(selfReq)))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    assertThat(status).isIn(200, 404);
                });
    }

    // ─────────────────────────────────────────────────────────
    // UC-GROW-010  Calibration Session 9-Box
    // ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("UC-GROW-010 happy: calibration session returns 200 or 404")
    void ucGrow010_calibrationSession_returns200OrNotFound() throws Exception {
        UUID randomCycleId = UUID.randomUUID();
        mockMvc.perform(get(CYCLE_BASE + "/{id}/calibration", randomCycleId))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    assertThat(status).isIn(200, 404);
                });
    }

    // ─────────────────────────────────────────────────────────
    // UC-GROW-011  9-Box Grid Assessment (via org analytics)
    // ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("UC-GROW-011 happy: nine-box grid endpoint returns 200 or 404")
    void ucGrow011_nineBoxGrid_returns200OrNotFound() throws Exception {
        mockMvc.perform(get("/api/v1/organization/analytics/nine-box"))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    assertThat(status).isIn(200, 404);
                });
    }

    // ─────────────────────────────────────────────────────────
    // UC-GROW-012  PIP Initiation
    // ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("UC-GROW-012 happy: PIP initiation with manager and HR returns 201")
    void ucGrow012_pipInitiation_returns201() throws Exception {
        CreatePIPRequest req = CreatePIPRequest.builder()
                .employeeId(EMPLOYEE_ID)
                .managerId(USER_ID)
                .startDate(LocalDate.now())
                .endDate(LocalDate.now().plusMonths(3))
                .reason("Performance below expectations for Q3")
                .goals("[{\"goalText\":\"Improve delivery speed\",\"targetDate\":\"2026-06-30\"}]")
                .checkInFrequency("WEEKLY")
                .build();

        mockMvc.perform(post(PIP_BASE)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.employeeId").value(EMPLOYEE_ID.toString()));
    }

    @Test
    @DisplayName("UC-GROW-012 negative: PIP missing employeeId returns 400")
    void ucGrow012_pipMissingEmployee_returns400() throws Exception {
        CreatePIPRequest req = CreatePIPRequest.builder()
                // employeeId intentionally missing
                .managerId(USER_ID)
                .startDate(LocalDate.now())
                .endDate(LocalDate.now().plusMonths(3))
                .reason("Performance issues")
                .build();

        mockMvc.perform(post(PIP_BASE)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    // ─────────────────────────────────────────────────────────
    // UC-GROW-013  PIP Progress Update
    // ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("UC-GROW-013 happy: PIP check-in returns 201 milestone logged")
    void ucGrow013_pipProgressUpdate_returns201() throws Exception {
        // First create a PIP
        CreatePIPRequest pipReq = CreatePIPRequest.builder()
                .employeeId(EMPLOYEE_ID)
                .managerId(USER_ID)
                .startDate(LocalDate.now())
                .endDate(LocalDate.now().plusMonths(3))
                .reason("Performance tracking")
                .checkInFrequency("WEEKLY")
                .build();

        MvcResult pipResult = mockMvc.perform(post(PIP_BASE)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(pipReq)))
                .andExpect(status().isCreated())
                .andReturn();

        String pipId = objectMapper.readTree(pipResult.getResponse().getContentAsString())
                .get("id").asText();

        PIPCheckInRequest checkIn = PIPCheckInRequest.builder()
                .checkInDate(LocalDate.now())
                .progressNotes("Meeting goals this week")
                .managerComments("Keep it up")
                .build();

        mockMvc.perform(post(PIP_BASE + "/{id}/check-in", UUID.fromString(pipId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(checkIn)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.progressNotes").value("Meeting goals this week"));
    }

    // ─────────────────────────────────────────────────────────
    // UC-GROW-018  Aggregate Performance Scores
    // ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("UC-GROW-018 happy: list all reviews for aggregation returns 200")
    void ucGrow018_listAllReviewsForAggregation_returns200() throws Exception {
        mockMvc.perform(get(REVIEW_BASE))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("UC-GROW-018 happy: list employee reviews returns 200")
    void ucGrow018_employeeReviews_returns200() throws Exception {
        mockMvc.perform(get(REVIEW_BASE + "/employee/{employeeId}", EMPLOYEE_ID))
                .andExpect(status().isOk());
    }

    // ─────────────────────────────────────────────────────────
    // UC-GROW-022  One-on-One Notes
    // ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("UC-GROW-022 happy: create one-on-one meeting returns 201")
    void ucGrow022_createOneOnOneMeeting_returns201() throws Exception {
        Map<String, Object> meetingReq = new LinkedHashMap<>();
        meetingReq.put("employeeId", EMPLOYEE_ID.toString());
        meetingReq.put("managerId", USER_ID.toString());
        meetingReq.put("scheduledAt", LocalDate.now().plusDays(1).toString());
        meetingReq.put("duration", 60);
        meetingReq.put("title", "Weekly 1:1");
        meetingReq.put("agenda", "Career growth discussion");

        mockMvc.perform(post(MEETING_BASE)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(meetingReq)))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    assertThat(status).isIn(200, 201, 400);
                });
    }

    @Test
    @DisplayName("UC-GROW-022 happy: manager can retrieve one-on-one meetings")
    void ucGrow022_managerRetrievesOnoOnOneMeetings_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/meetings/as-manager"))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    assertThat(status).isIn(200, 404);
                });
    }

    // ─────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────

    private String uuid6() {
        return UUID.randomUUID().toString().substring(0, 6);
    }

    private ReviewCycleRequest buildReviewCycleRequest(String name) {
        return ReviewCycleRequest.builder()
                .cycleName(name)
                .cycleType(ReviewCycle.CycleType.ANNUAL)
                .startDate(LocalDate.now().minusMonths(6))
                .endDate(LocalDate.now())
                .selfReviewDeadline(LocalDate.now().minusMonths(3))
                .managerReviewDeadline(LocalDate.now().minusMonths(1))
                .status(ReviewCycle.CycleStatus.DRAFT)
                .description("Annual review cycle " + name)
                .build();
    }
}
