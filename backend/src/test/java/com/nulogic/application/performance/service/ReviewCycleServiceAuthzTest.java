package com.nulogic.application.performance.service;

import com.nulogic.application.notification.service.WebSocketNotificationService;
import com.nulogic.application.performance.dto.CalibrationResponse;
import com.nulogic.application.performance.dto.ManagerReviewRequest;
import com.nulogic.application.performance.dto.SelfAssessmentRequest;
import com.nulogic.common.security.Permission;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.security.TenantContext;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.performance.PerformanceReview;
import com.nulogic.domain.performance.PerformanceReview.ReviewStatus;
import com.nulogic.domain.performance.PerformanceReview.ReviewType;
import com.nulogic.domain.performance.ReviewCycle;
import com.nulogic.domain.performance.ReviewCycle.CycleStatus;
import com.nulogic.domain.user.RoleScope;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.performance.repository.PerformanceReviewRepository;
import com.nulogic.infrastructure.performance.repository.ReviewCycleRepository;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.access.AccessDeniedException;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.nullable;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("ReviewCycleService authorization and stage guards")
class ReviewCycleServiceAuthzTest {

    private static MockedStatic<TenantContext> tenantContextMock;

    @Mock
    private ReviewCycleRepository cycleRepository;
    @Mock
    private EmployeeRepository employeeRepository;
    @Mock
    private PerformanceReviewRepository reviewRepository;
    @Mock
    private TenantTimeService tenantTimeService;
    @Mock
    private WebSocketNotificationService notificationService;

    private ReviewCycleService service;
    private final UUID tenantId = UUID.randomUUID();
    private final UUID cycleId = UUID.randomUUID();
    private final UUID reviewId = UUID.randomUUID();
    private final UUID subjectId = UUID.randomUUID();
    private final UUID managerId = UUID.randomUUID();
    private ReviewCycle cycle;

    @BeforeAll
    static void setUpClass() {
        tenantContextMock = mockStatic(TenantContext.class);
    }

    @AfterAll
    static void tearDownClass() {
        tenantContextMock.close();
    }

    @BeforeEach
    void setUp() {
        service = new ReviewCycleService(cycleRepository, employeeRepository, reviewRepository, tenantTimeService, notificationService);
        tenantContextMock.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
        when(tenantTimeService.now(nullable(UUID.class))).thenReturn(LocalDateTime.now());
        cycle = new ReviewCycle();
        cycle.setId(cycleId);
        cycle.setCycleName("FY26");
        cycle.setStatus(CycleStatus.SELF_ASSESSMENT);
        when(cycleRepository.findByIdAndTenantId(cycleId, tenantId)).thenReturn(Optional.of(cycle));
    }

    @AfterEach
    void tearDown() {
        SecurityContext.clear();
    }

    private void actAs(UUID employeeId) {
        SecurityContext.setCurrentUser(UUID.randomUUID(), employeeId, Collections.emptySet(), Collections.emptyMap());
    }

    private void actWith(UUID employeeId, String permission) {
        SecurityContext.setCurrentUser(UUID.randomUUID(), employeeId, Collections.emptySet(), Map.of(permission, RoleScope.ALL));
    }

    private PerformanceReview review(ReviewType type, UUID reviewer, ReviewStatus status) {
        PerformanceReview r = PerformanceReview.builder()
                .employeeId(subjectId).reviewerId(reviewer).reviewCycleId(cycleId)
                .reviewType(type).status(status).build();
        r.setId(reviewId);
        r.setTenantId(tenantId);
        when(reviewRepository.findByIdAndTenantId(reviewId, tenantId)).thenReturn(Optional.of(r));
        return r;
    }

    private SelfAssessmentRequest selfRequest() {
        return SelfAssessmentRequest.builder()
                .competencyRatings(List.of(SelfAssessmentRequest.CompetencyRatingItem.builder().rating(4).build()))
                .overallComments("ok").goalAchievementPercent(80).build();
    }

    private ManagerReviewRequest managerRequest() {
        ManagerReviewRequest m = new ManagerReviewRequest();
        m.setOverallRating(4);
        m.setComments("good");
        return m;
    }

    // ---- self assessment ----

    @Test
    @DisplayName("self-assessment: the subject can submit during the self stage")
    void selfAssessmentValidPath() {
        PerformanceReview r = review(ReviewType.SELF, subjectId, ReviewStatus.DRAFT);
        actAs(subjectId);

        service.submitSelfAssessment(reviewId, selfRequest());

        assertThat(r.getStatus()).isEqualTo(ReviewStatus.SUBMITTED);
        assertThat(r.getSelfRating()).isEqualTo(4);
        verify(reviewRepository).save(r);
    }

    @Test
    @DisplayName("self-assessment: another employee is denied and nothing is written")
    void selfAssessmentDeniedForOtherEmployee() {
        PerformanceReview r = review(ReviewType.SELF, subjectId, ReviewStatus.DRAFT);
        actAs(UUID.randomUUID());

        assertThatThrownBy(() -> service.submitSelfAssessment(reviewId, selfRequest()))
                .isInstanceOf(AccessDeniedException.class);

        assertThat(r.getStatus()).isEqualTo(ReviewStatus.DRAFT);
        verify(reviewRepository, never()).save(any());
    }

    @Test
    @DisplayName("self-assessment: the subject cannot self-assess on their MANAGER review row")
    void selfAssessmentDeniedOnManagerRow() {
        review(ReviewType.MANAGER, managerId, ReviewStatus.DRAFT);
        actAs(subjectId);

        assertThatThrownBy(() -> service.submitSelfAssessment(reviewId, selfRequest()))
                .isInstanceOf(AccessDeniedException.class);
        verify(reviewRepository, never()).save(any());
    }

    @Test
    @DisplayName("self-assessment: rejected once the cycle has moved past the self stage")
    void selfAssessmentWrongStage() {
        review(ReviewType.SELF, subjectId, ReviewStatus.DRAFT);
        cycle.setStatus(CycleStatus.MANAGER_REVIEW);
        actAs(subjectId);

        assertThatThrownBy(() -> service.submitSelfAssessment(reviewId, selfRequest()))
                .isInstanceOf(IllegalStateException.class);
        verify(reviewRepository, never()).save(any());
    }

    @Test
    @DisplayName("self-assessment: cannot be re-submitted after submission")
    void selfAssessmentNoResubmit() {
        PerformanceReview r = review(ReviewType.SELF, subjectId, ReviewStatus.SUBMITTED);
        r.setSelfRating(3);
        actAs(subjectId);

        assertThatThrownBy(() -> service.submitSelfAssessment(reviewId, selfRequest()))
                .isInstanceOf(IllegalStateException.class);
        assertThat(r.getSelfRating()).isEqualTo(3);
        verify(reviewRepository, never()).save(any());
    }

    // ---- manager review ----

    @Test
    @DisplayName("manager review: the assigned reviewer can submit during the manager stage")
    void managerReviewValidPath() {
        PerformanceReview r = review(ReviewType.MANAGER, managerId, ReviewStatus.DRAFT);
        cycle.setStatus(CycleStatus.MANAGER_REVIEW);
        actAs(managerId);

        service.submitManagerReview(reviewId, managerRequest());

        assertThat(r.getStatus()).isEqualTo(ReviewStatus.IN_REVIEW);
        assertThat(r.getManagerRating()).isEqualTo(4);
        verify(reviewRepository).save(r);
    }

    @Test
    @DisplayName("manager review: the subject cannot rate themselves as the manager")
    void managerReviewDeniedForSubject() {
        PerformanceReview r = review(ReviewType.MANAGER, managerId, ReviewStatus.DRAFT);
        cycle.setStatus(CycleStatus.MANAGER_REVIEW);
        actAs(subjectId);

        assertThatThrownBy(() -> service.submitManagerReview(reviewId, managerRequest()))
                .isInstanceOf(AccessDeniedException.class);
        assertThat(r.getManagerRating()).isNull();
        verify(reviewRepository, never()).save(any());
    }

    @Test
    @DisplayName("manager review: a manager who is not the assigned reviewer is denied")
    void managerReviewDeniedForOtherManager() {
        review(ReviewType.MANAGER, managerId, ReviewStatus.DRAFT);
        cycle.setStatus(CycleStatus.MANAGER_REVIEW);
        actAs(UUID.randomUUID());

        assertThatThrownBy(() -> service.submitManagerReview(reviewId, managerRequest()))
                .isInstanceOf(AccessDeniedException.class);
        verify(reviewRepository, never()).save(any());
    }

    @Test
    @DisplayName("manager review: rejected while the cycle is still in the self stage")
    void managerReviewWrongStage() {
        PerformanceReview r = review(ReviewType.MANAGER, managerId, ReviewStatus.DRAFT);
        actAs(managerId);

        assertThatThrownBy(() -> service.submitManagerReview(reviewId, managerRequest()))
                .isInstanceOf(IllegalStateException.class);
        assertThat(r.getManagerRating()).isNull();
        verify(reviewRepository, never()).save(any());
    }

    @Test
    @DisplayName("manager review: cannot be re-submitted once IN_REVIEW")
    void managerReviewNoResubmit() {
        PerformanceReview r = review(ReviewType.MANAGER, managerId, ReviewStatus.IN_REVIEW);
        r.setManagerRating(2);
        cycle.setStatus(CycleStatus.MANAGER_REVIEW);
        actAs(managerId);

        assertThatThrownBy(() -> service.submitManagerReview(reviewId, managerRequest()))
                .isInstanceOf(IllegalStateException.class);
        assertThat(r.getManagerRating()).isEqualTo(2);
    }

    // ---- calibration ----

    @Test
    @DisplayName("calibration rating: HR with CALIBRATION:MANAGE can set it during CALIBRATION")
    void calibrationRatingValidPath() {
        PerformanceReview r = review(ReviewType.MANAGER, managerId, ReviewStatus.IN_REVIEW);
        cycle.setStatus(CycleStatus.CALIBRATION);
        actWith(UUID.randomUUID(), Permission.CALIBRATION_MANAGE);

        service.updateCalibrationRating(reviewId, 4);

        assertThat(r.getFinalRating()).isEqualTo(4);
        verify(reviewRepository).save(r);
    }

    @Test
    @DisplayName("calibration rating: a manager with only REVIEW:APPROVE is denied")
    void calibrationRatingDeniedForReviewApproveHolder() {
        PerformanceReview r = review(ReviewType.MANAGER, managerId, ReviewStatus.IN_REVIEW);
        cycle.setStatus(CycleStatus.CALIBRATION);
        actWith(managerId, Permission.REVIEW_APPROVE);

        assertThatThrownBy(() -> service.updateCalibrationRating(reviewId, 5))
                .isInstanceOf(AccessDeniedException.class);
        assertThat(r.getFinalRating()).isNull();
        verify(reviewRepository, never()).save(any());
    }

    @Test
    @DisplayName("calibration rating: rejected outside the CALIBRATION stage")
    void calibrationRatingWrongStage() {
        PerformanceReview r = review(ReviewType.MANAGER, managerId, ReviewStatus.IN_REVIEW);
        cycle.setStatus(CycleStatus.MANAGER_REVIEW);
        actWith(UUID.randomUUID(), Permission.CALIBRATION_MANAGE);

        assertThatThrownBy(() -> service.updateCalibrationRating(reviewId, 3))
                .isInstanceOf(IllegalStateException.class);
        assertThat(r.getFinalRating()).isNull();
        verify(reviewRepository, never()).save(any());
    }

    @Test
    @DisplayName("calibration read: a plain employee (REVIEW:VIEW only) is denied")
    void calibrationReadDeniedForEmployee() {
        actWith(subjectId, Permission.REVIEW_VIEW);

        assertThatThrownBy(() -> service.getCalibration(cycleId)).isInstanceOf(AccessDeniedException.class);
        verify(reviewRepository, never()).findByTenantIdAndReviewCycleId(any(), any());
    }

    @Test
    @DisplayName("calibration read: CALIBRATION:VIEW holder gets the data")
    void calibrationReadAllowedForCalibrationViewer() {
        actWith(UUID.randomUUID(), Permission.CALIBRATION_VIEW);
        when(reviewRepository.findByTenantIdAndReviewCycleId(tenantId, cycleId)).thenReturn(List.of());

        CalibrationResponse response = service.getCalibration(cycleId);

        assertThat(response.getCycleId()).isEqualTo(cycleId);
    }

    // ---- completeCycle ----

    @Test
    @DisplayName("completeCycle: allowed for a launched cycle")
    void completeCycleValidPath() {
        cycle.setStatus(CycleStatus.RATINGS_PUBLISHED);
        when(cycleRepository.save(cycle)).thenReturn(cycle);

        assertThat(service.completeCycle(cycleId).getStatus()).isEqualTo(CycleStatus.COMPLETED);
    }

    @Test
    @DisplayName("completeCycle: rejected for PLANNING, COMPLETED and CANCELLED cycles")
    void completeCycleStateGuard() {
        for (CycleStatus bad : Set.of(CycleStatus.PLANNING, CycleStatus.DRAFT, CycleStatus.COMPLETED, CycleStatus.CANCELLED)) {
            cycle.setStatus(bad);
            assertThatThrownBy(() -> service.completeCycle(cycleId)).isInstanceOf(IllegalStateException.class);
            assertThat(cycle.getStatus()).isEqualTo(bad);
        }
        verify(cycleRepository, never()).save(any());
    }
}
