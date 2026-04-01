package com.hrms.api.performance;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.application.performance.dto.*;
import com.hrms.application.performance.service.ReviewCycleService;
import com.hrms.common.exception.GlobalExceptionHandler;
import com.hrms.common.config.TestMeterRegistryConfig;
import org.springframework.context.annotation.Import;
import com.hrms.common.security.*;
import com.hrms.domain.performance.ReviewCycle;
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
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ReviewCycleController.class)
@ContextConfiguration(classes = {ReviewCycleController.class, GlobalExceptionHandler.class})
@Import(TestMeterRegistryConfig.class)
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("ReviewCycleController Unit Tests")
class ReviewCycleControllerTest {

    @MockitoBean
    private JpaMetamodelMappingContext jpaMetamodelMappingContext;


    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private ReviewCycleService reviewCycleService;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockitoBean
    private TenantFilter tenantFilter;

    private UUID cycleId;
    private UUID reviewId;
    private ReviewCycleResponse cycleResponse;
    private ReviewCycleRequest cycleRequest;

    @BeforeEach
    void setUp() {
        cycleId = UUID.randomUUID();
        reviewId = UUID.randomUUID();

        cycleRequest = ReviewCycleRequest.builder()
                .cycleName("Q4 2026 Annual Review")
                .cycleType(ReviewCycle.CycleType.ANNUAL)
                .startDate(LocalDate.of(2026, 10, 1))
                .endDate(LocalDate.of(2026, 12, 31))
                .selfReviewDeadline(LocalDate.of(2026, 11, 15))
                .managerReviewDeadline(LocalDate.of(2026, 12, 15))
                .status(ReviewCycle.CycleStatus.DRAFT)
                .description("Annual performance review for Q4 2026")
                .build();

        cycleResponse = ReviewCycleResponse.builder()
                .id(cycleId)
                .cycleName("Q4 2026 Annual Review")
                .cycleType(ReviewCycle.CycleType.ANNUAL)
                .startDate(LocalDate.of(2026, 10, 1))
                .endDate(LocalDate.of(2026, 12, 31))
                .selfReviewDeadline(LocalDate.of(2026, 11, 15))
                .managerReviewDeadline(LocalDate.of(2026, 12, 15))
                .status(ReviewCycle.CycleStatus.DRAFT)
                .description("Annual performance review for Q4 2026")
                .createdAt(LocalDateTime.now())
                .build();
    }

    @Nested
    @DisplayName("Create Cycle Tests")
    class CreateCycleTests {

        @Test
        @DisplayName("Should create a review cycle successfully")
        void shouldCreateReviewCycleSuccessfully() throws Exception {
            when(reviewCycleService.createCycle(any(ReviewCycleRequest.class)))
                    .thenReturn(cycleResponse);

            mockMvc.perform(post("/api/v1/review-cycles")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(cycleRequest)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.id").value(cycleId.toString()))
                    .andExpect(jsonPath("$.cycleName").value("Q4 2026 Annual Review"))
                    .andExpect(jsonPath("$.cycleType").value("ANNUAL"))
                    .andExpect(jsonPath("$.status").value("DRAFT"));

            verify(reviewCycleService).createCycle(any(ReviewCycleRequest.class));
        }

        @Test
        @DisplayName("Should create quarterly review cycle")
        void shouldCreateQuarterlyCycle() throws Exception {
            ReviewCycleRequest quarterlyRequest = ReviewCycleRequest.builder()
                    .cycleName("Q1 2027 Quarterly Review")
                    .cycleType(ReviewCycle.CycleType.QUARTERLY)
                    .startDate(LocalDate.of(2027, 1, 1))
                    .endDate(LocalDate.of(2027, 3, 31))
                    .build();

            ReviewCycleResponse quarterlyResponse = ReviewCycleResponse.builder()
                    .id(UUID.randomUUID())
                    .cycleName("Q1 2027 Quarterly Review")
                    .cycleType(ReviewCycle.CycleType.QUARTERLY)
                    .status(ReviewCycle.CycleStatus.DRAFT)
                    .build();

            when(reviewCycleService.createCycle(any(ReviewCycleRequest.class)))
                    .thenReturn(quarterlyResponse);

            mockMvc.perform(post("/api/v1/review-cycles")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(quarterlyRequest)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.cycleType").value("QUARTERLY"));
        }

        @Test
        @DisplayName("Should return 400 when content body is missing")
        void shouldReturn400WhenRequestBodyMissing() throws Exception {
            mockMvc.perform(post("/api/v1/review-cycles")
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isBadRequest());
        }
    }

    @Nested
    @DisplayName("Get Cycle Tests")
    class GetCycleTests {

        @Test
        @DisplayName("Should get all cycles with pagination")
        void shouldGetAllCyclesWithPagination() throws Exception {
            Page<ReviewCycleResponse> page = new PageImpl<>(
                    Collections.singletonList(cycleResponse),
                    PageRequest.of(0, 20),
                    1);

            when(reviewCycleService.getAllCycles(any(Pageable.class))).thenReturn(page);

            mockMvc.perform(get("/api/v1/review-cycles")
                            .param("page", "0")
                            .param("size", "20"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content.length()").value(1))
                    .andExpect(jsonPath("$.content[0].cycleName").value("Q4 2026 Annual Review"));

            verify(reviewCycleService).getAllCycles(any(Pageable.class));
        }

        @Test
        @DisplayName("Should get cycle by ID")
        void shouldGetCycleById() throws Exception {
            when(reviewCycleService.getCycleById(cycleId)).thenReturn(cycleResponse);

            mockMvc.perform(get("/api/v1/review-cycles/{id}", cycleId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(cycleId.toString()))
                    .andExpect(jsonPath("$.cycleName").value("Q4 2026 Annual Review"));

            verify(reviewCycleService).getCycleById(cycleId);
        }

        @Test
        @DisplayName("Should get active cycles")
        void shouldGetActiveCycles() throws Exception {
            ReviewCycleResponse activeResponse = ReviewCycleResponse.builder()
                    .id(cycleId)
                    .cycleName("Active Cycle")
                    .status(ReviewCycle.CycleStatus.ACTIVE)
                    .build();

            when(reviewCycleService.getActiveCycles())
                    .thenReturn(Collections.singletonList(activeResponse));

            mockMvc.perform(get("/api/v1/review-cycles/active"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(1))
                    .andExpect(jsonPath("$[0].status").value("ACTIVE"));

            verify(reviewCycleService).getActiveCycles();
        }
    }

    @Nested
    @DisplayName("Update Cycle Tests")
    class UpdateCycleTests {

        @Test
        @DisplayName("Should update a review cycle")
        void shouldUpdateCycle() throws Exception {
            ReviewCycleResponse updatedResponse = ReviewCycleResponse.builder()
                    .id(cycleId)
                    .cycleName("Updated Q4 Review")
                    .cycleType(ReviewCycle.CycleType.ANNUAL)
                    .status(ReviewCycle.CycleStatus.DRAFT)
                    .build();

            when(reviewCycleService.updateCycle(eq(cycleId), any(ReviewCycleRequest.class)))
                    .thenReturn(updatedResponse);

            mockMvc.perform(put("/api/v1/review-cycles/{id}", cycleId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(cycleRequest)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.cycleName").value("Updated Q4 Review"));

            verify(reviewCycleService).updateCycle(eq(cycleId), any(ReviewCycleRequest.class));
        }

        @Test
        @DisplayName("Should delete a review cycle")
        void shouldDeleteCycle() throws Exception {
            doNothing().when(reviewCycleService).deleteCycle(cycleId);

            mockMvc.perform(delete("/api/v1/review-cycles/{id}", cycleId))
                    .andExpect(status().isNoContent());

            verify(reviewCycleService).deleteCycle(cycleId);
        }

        @Test
        @DisplayName("Should complete a review cycle")
        void shouldCompleteCycle() throws Exception {
            ReviewCycleResponse completedResponse = ReviewCycleResponse.builder()
                    .id(cycleId)
                    .cycleName("Q4 2026 Annual Review")
                    .status(ReviewCycle.CycleStatus.COMPLETED)
                    .build();

            when(reviewCycleService.completeCycle(cycleId)).thenReturn(completedResponse);

            mockMvc.perform(put("/api/v1/review-cycles/{id}/complete", cycleId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("COMPLETED"));

            verify(reviewCycleService).completeCycle(cycleId);
        }
    }

    @Nested
    @DisplayName("Activate and Advance Cycle Tests")
    class ActivateAndAdvanceTests {

        @Test
        @DisplayName("Should activate a review cycle for all employees")
        void shouldActivateCycleForAll() throws Exception {
            ActivateCycleRequest activateRequest = ActivateCycleRequest.builder()
                    .scopeType(ActivateCycleRequest.ScopeType.ALL)
                    .createSelfReviews(true)
                    .createManagerReviews(true)
                    .build();

            ReviewCycleResponse activeResponse = ReviewCycleResponse.builder()
                    .id(cycleId)
                    .cycleName("Q4 2026 Annual Review")
                    .status(ReviewCycle.CycleStatus.ACTIVE)
                    .employeesInScope(150)
                    .reviewsCreated(150)
                    .build();

            when(reviewCycleService.activateCycle(eq(cycleId), any(ActivateCycleRequest.class)))
                    .thenReturn(activeResponse);

            mockMvc.perform(post("/api/v1/review-cycles/{id}/activate", cycleId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(activateRequest)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("ACTIVE"))
                    .andExpect(jsonPath("$.employeesInScope").value(150))
                    .andExpect(jsonPath("$.reviewsCreated").value(150));

            verify(reviewCycleService).activateCycle(eq(cycleId), any(ActivateCycleRequest.class));
        }

        @Test
        @DisplayName("Should activate a cycle for specific departments")
        void shouldActivateCycleForDepartments() throws Exception {
            UUID deptId = UUID.randomUUID();
            ActivateCycleRequest activateRequest = ActivateCycleRequest.builder()
                    .scopeType(ActivateCycleRequest.ScopeType.DEPARTMENT)
                    .departmentIds(Set.of(deptId))
                    .createSelfReviews(true)
                    .createManagerReviews(false)
                    .build();

            ReviewCycleResponse activeResponse = ReviewCycleResponse.builder()
                    .id(cycleId)
                    .status(ReviewCycle.CycleStatus.ACTIVE)
                    .employeesInScope(30)
                    .reviewsCreated(30)
                    .build();

            when(reviewCycleService.activateCycle(eq(cycleId), any(ActivateCycleRequest.class)))
                    .thenReturn(activeResponse);

            mockMvc.perform(post("/api/v1/review-cycles/{id}/activate", cycleId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(activateRequest)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.employeesInScope").value(30));
        }

        @Test
        @DisplayName("Should advance cycle stage")
        void shouldAdvanceCycleStage() throws Exception {
            ReviewCycleResponse advancedResponse = ReviewCycleResponse.builder()
                    .id(cycleId)
                    .cycleName("Q4 2026 Annual Review")
                    .status(ReviewCycle.CycleStatus.SELF_ASSESSMENT)
                    .build();

            when(reviewCycleService.advanceStage(cycleId)).thenReturn(advancedResponse);

            mockMvc.perform(post("/api/v1/review-cycles/{id}/advance", cycleId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("SELF_ASSESSMENT"));

            verify(reviewCycleService).advanceStage(cycleId);
        }
    }

    @Nested
    @DisplayName("Calibration Tests")
    class CalibrationTests {

        @Test
        @DisplayName("Should get calibration data for a cycle")
        void shouldGetCalibration() throws Exception {
            CalibrationResponse calibration = CalibrationResponse.builder()
                    .cycleId(cycleId)
                    .cycleName("Q4 2026 Annual Review")
                    .totalEmployees(100)
                    .build();

            when(reviewCycleService.getCalibration(cycleId)).thenReturn(calibration);

            mockMvc.perform(get("/api/v1/review-cycles/{id}/calibration", cycleId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.cycleId").value(cycleId.toString()))
                    .andExpect(jsonPath("$.totalEmployees").value(100));

            verify(reviewCycleService).getCalibration(cycleId);
        }

        @Test
        @DisplayName("Should update calibration rating for a review")
        void shouldUpdateCalibrationRating() throws Exception {
            doNothing().when(reviewCycleService).updateCalibrationRating(reviewId, 4);

            mockMvc.perform(put("/api/v1/review-cycles/reviews/{reviewId}/calibration-rating", reviewId)
                            .param("finalRating", "4"))
                    .andExpect(status().isOk());

            verify(reviewCycleService).updateCalibrationRating(reviewId, 4);
        }

        @Test
        @DisplayName("Should submit self assessment")
        void shouldSubmitSelfAssessment() throws Exception {
            SelfAssessmentRequest request = new SelfAssessmentRequest();
            doNothing().when(reviewCycleService).submitSelfAssessment(eq(reviewId), any(SelfAssessmentRequest.class));

            mockMvc.perform(put("/api/v1/review-cycles/reviews/{reviewId}/self-assessment", reviewId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk());

            verify(reviewCycleService).submitSelfAssessment(eq(reviewId), any(SelfAssessmentRequest.class));
        }

        @Test
        @DisplayName("Should submit manager review")
        void shouldSubmitManagerReview() throws Exception {
            ManagerReviewRequest request = new ManagerReviewRequest();
            doNothing().when(reviewCycleService).submitManagerReview(eq(reviewId), any(ManagerReviewRequest.class));

            mockMvc.perform(put("/api/v1/review-cycles/reviews/{reviewId}/manager-review", reviewId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk());

            verify(reviewCycleService).submitManagerReview(eq(reviewId), any(ManagerReviewRequest.class));
        }
    }

    @Nested
    @DisplayName("Permission Annotation Tests")
    class PermissionAnnotationTests {

        @Test
        @DisplayName("createCycle should have REVIEW_CREATE permission")
        void createCycleShouldRequireReviewCreate() throws Exception {
            var method = ReviewCycleController.class.getMethod("createCycle", ReviewCycleRequest.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);
            Assertions.assertNotNull(annotation, "createCycle must have @RequiresPermission");
            Assertions.assertEquals(Permission.REVIEW_CREATE, annotation.value()[0]);
        }

        @Test
        @DisplayName("activateCycle should have REVIEW_APPROVE permission")
        void activateCycleShouldRequireReviewApprove() throws Exception {
            var method = ReviewCycleController.class.getMethod("activateCycle",
                    UUID.class, ActivateCycleRequest.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);
            Assertions.assertNotNull(annotation, "activateCycle must have @RequiresPermission");
            Assertions.assertEquals(Permission.REVIEW_APPROVE, annotation.value()[0]);
        }

        @Test
        @DisplayName("getAllCycles should have REVIEW_VIEW permission")
        void getAllCyclesShouldRequireReviewView() throws Exception {
            var method = ReviewCycleController.class.getMethod("getAllCycles",
                    int.class, int.class, String.class, String.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);
            Assertions.assertNotNull(annotation, "getAllCycles must have @RequiresPermission");
            Assertions.assertEquals(Permission.REVIEW_VIEW, annotation.value()[0]);
        }
    }
}
