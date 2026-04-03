package com.hrms.application.performance.service;

import com.hrms.application.performance.dto.CompetencyRequest;
import com.hrms.application.performance.dto.CompetencyResponse;
import com.hrms.application.performance.dto.ReviewRequest;
import com.hrms.application.performance.dto.ReviewResponse;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.performance.PerformanceReview;
import com.hrms.domain.performance.ReviewCompetency;
import com.hrms.domain.performance.ReviewCycle;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.performance.repository.PerformanceReviewRepository;
import com.hrms.infrastructure.performance.repository.ReviewCompetencyRepository;
import com.hrms.infrastructure.performance.repository.ReviewCycleRepository;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("PerformanceReviewService Tests")
class PerformanceReviewServiceTest {

    private static MockedStatic<TenantContext> tenantContextMock;
    @Mock
    private PerformanceReviewRepository reviewRepository;
    @Mock
    private ReviewCompetencyRepository competencyRepository;
    @Mock
    private EmployeeRepository employeeRepository;
    @Mock
    private ReviewCycleRepository reviewCycleRepository;
    @InjectMocks
    private PerformanceReviewService performanceReviewService;
    private UUID tenantId;
    private UUID employeeId;
    private UUID reviewerId;
    private UUID reviewId;
    private UUID reviewCycleId;
    private PerformanceReview review;
    private Employee employee;
    private Employee reviewer;
    private ReviewCycle reviewCycle;

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
        tenantId = UUID.randomUUID();
        employeeId = UUID.randomUUID();
        reviewerId = UUID.randomUUID();
        reviewId = UUID.randomUUID();
        reviewCycleId = UUID.randomUUID();

        tenantContextMock.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
        tenantContextMock.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);

        // Setup employee
        employee = new Employee();
        employee.setId(employeeId);
        employee.setFirstName("John");
        employee.setLastName("Doe");

        // Setup reviewer
        reviewer = new Employee();
        reviewer.setId(reviewerId);
        reviewer.setFirstName("Jane");
        reviewer.setLastName("Manager");

        // Setup review cycle
        reviewCycle = new ReviewCycle();
        reviewCycle.setId(reviewCycleId);
        reviewCycle.setCycleName("2025 Annual Review");

        // Setup review
        review = PerformanceReview.builder()
                .employeeId(employeeId)
                .reviewerId(reviewerId)
                .reviewCycleId(reviewCycleId)
                .reviewType(PerformanceReview.ReviewType.MANAGER)
                .reviewPeriodStart(LocalDate.of(2025, 1, 1))
                .reviewPeriodEnd(LocalDate.of(2025, 12, 31))
                .status(PerformanceReview.ReviewStatus.DRAFT)
                .overallRating(new BigDecimal("4.5"))
                .strengths("Strong technical skills, great team player")
                .areasForImprovement("Communication with stakeholders")
                .achievements("Delivered 3 major projects")
                .goalsForNextPeriod("Lead a team of 5")
                .managerComments("Excellent performance overall")
                .build();
        review.setId(reviewId);
        review.setTenantId(tenantId);
        review.setCreatedAt(LocalDateTime.now());
        review.setUpdatedAt(LocalDateTime.now());
    }

    @Nested
    @DisplayName("Create Review Tests")
    class CreateReviewTests {

        @Test
        @DisplayName("Should create review successfully")
        void shouldCreateReviewSuccessfully() {
            ReviewRequest request = new ReviewRequest();
            request.setEmployeeId(employeeId);
            request.setReviewerId(reviewerId);
            request.setReviewCycleId(reviewCycleId);
            request.setReviewType(PerformanceReview.ReviewType.MANAGER);
            request.setReviewPeriodStart(LocalDate.of(2025, 1, 1));
            request.setReviewPeriodEnd(LocalDate.of(2025, 6, 30));

            when(reviewRepository.save(any(PerformanceReview.class))).thenAnswer(invocation -> {
                PerformanceReview saved = invocation.getArgument(0);
                saved.setId(UUID.randomUUID());
                saved.setCreatedAt(LocalDateTime.now());
                return saved;
            });
            when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(employee));
            when(employeeRepository.findById(reviewerId)).thenReturn(Optional.of(reviewer));
            when(reviewCycleRepository.findById(reviewCycleId)).thenReturn(Optional.of(reviewCycle));

            ReviewResponse result = performanceReviewService.createReview(request);

            assertThat(result).isNotNull();
            assertThat(result.getReviewType()).isEqualTo(PerformanceReview.ReviewType.MANAGER);
            assertThat(result.getStatus()).isEqualTo(PerformanceReview.ReviewStatus.DRAFT);
            verify(reviewRepository).save(any(PerformanceReview.class));
        }

        @Test
        @DisplayName("Should create review with provided status")
        void shouldCreateReviewWithProvidedStatus() {
            ReviewRequest request = new ReviewRequest();
            request.setEmployeeId(employeeId);
            request.setReviewerId(reviewerId);
            request.setReviewPeriodStart(LocalDate.now());
            request.setReviewPeriodEnd(LocalDate.now().plusMonths(6));
            request.setStatus(PerformanceReview.ReviewStatus.IN_REVIEW);

            when(reviewRepository.save(any(PerformanceReview.class))).thenAnswer(invocation -> {
                PerformanceReview saved = invocation.getArgument(0);
                saved.setId(UUID.randomUUID());
                return saved;
            });
            when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(employee));
            when(employeeRepository.findById(reviewerId)).thenReturn(Optional.of(reviewer));

            ReviewResponse result = performanceReviewService.createReview(request);

            assertThat(result.getStatus()).isEqualTo(PerformanceReview.ReviewStatus.IN_REVIEW);
        }
    }

    @Nested
    @DisplayName("Update Review Tests")
    class UpdateReviewTests {

        @Test
        @DisplayName("Should update review successfully")
        void shouldUpdateReviewSuccessfully() {
            ReviewRequest request = new ReviewRequest();
            request.setOverallRating(new BigDecimal("4.8"));
            request.setManagerComments("Updated comments");

            when(reviewRepository.findByIdAndTenantId(reviewId, tenantId)).thenReturn(Optional.of(review));
            when(reviewRepository.save(any(PerformanceReview.class))).thenAnswer(invocation -> invocation.getArgument(0));
            when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(employee));
            when(employeeRepository.findById(reviewerId)).thenReturn(Optional.of(reviewer));
            when(reviewCycleRepository.findById(reviewCycleId)).thenReturn(Optional.of(reviewCycle));

            ReviewResponse result = performanceReviewService.updateReview(reviewId, request);

            assertThat(result).isNotNull();
            assertThat(result.getOverallRating()).isEqualTo(new BigDecimal("4.8"));
            assertThat(result.getManagerComments()).isEqualTo("Updated comments");
        }

        @Test
        @DisplayName("Should throw exception when review not found")
        void shouldThrowExceptionWhenReviewNotFound() {
            UUID invalidId = UUID.randomUUID();
            ReviewRequest request = new ReviewRequest();

            when(reviewRepository.findByIdAndTenantId(invalidId, tenantId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> performanceReviewService.updateReview(invalidId, request))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("Review not found");
        }
    }

    @Nested
    @DisplayName("Get Review Tests")
    class GetReviewTests {

        @Test
        @DisplayName("Should get review by ID")
        void shouldGetReviewById() {
            when(reviewRepository.findByIdAndTenantId(reviewId, tenantId)).thenReturn(Optional.of(review));
            when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(employee));
            when(employeeRepository.findById(reviewerId)).thenReturn(Optional.of(reviewer));
            when(reviewCycleRepository.findById(reviewCycleId)).thenReturn(Optional.of(reviewCycle));

            ReviewResponse result = performanceReviewService.getReviewById(reviewId);

            assertThat(result).isNotNull();
            assertThat(result.getId()).isEqualTo(reviewId);
            assertThat(result.getEmployeeName()).isEqualTo("John Doe");
            assertThat(result.getReviewerName()).isEqualTo("Jane Manager");
            assertThat(result.getReviewCycleName()).isEqualTo("2025 Annual Review");
        }

        @Test
        @DisplayName("Should throw exception when review not found by ID")
        void shouldThrowExceptionWhenReviewNotFoundById() {
            UUID invalidId = UUID.randomUUID();

            when(reviewRepository.findByIdAndTenantId(invalidId, tenantId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> performanceReviewService.getReviewById(invalidId))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("Review not found");
        }

        @Test
        @DisplayName("Should get all reviews with pagination")
        void shouldGetAllReviewsWithPagination() {
            Pageable pageable = PageRequest.of(0, 10);
            Page<PerformanceReview> page = new PageImpl<>(List.of(review));

            when(reviewRepository.findAllByTenantId(tenantId, pageable)).thenReturn(page);
            when(employeeRepository.findById(any())).thenReturn(Optional.of(employee));

            Page<ReviewResponse> result = performanceReviewService.getAllReviews(pageable);

            assertThat(result).isNotNull();
            assertThat(result.getContent()).hasSize(1);
        }

        @Test
        @DisplayName("Should get employee reviews")
        void shouldGetEmployeeReviews() {
            when(reviewRepository.findAllByTenantIdAndEmployeeId(tenantId, employeeId))
                    .thenReturn(List.of(review));
            when(employeeRepository.findById(any())).thenReturn(Optional.of(employee));

            List<ReviewResponse> result = performanceReviewService.getEmployeeReviews(employeeId);

            assertThat(result).hasSize(1);
            assertThat(result.get(0).getEmployeeId()).isEqualTo(employeeId);
        }

        @Test
        @DisplayName("Should get pending reviews for reviewer")
        void shouldGetPendingReviewsForReviewer() {
            when(reviewRepository.findPendingReviews(tenantId, reviewerId))
                    .thenReturn(List.of(review));
            when(employeeRepository.findById(any())).thenReturn(Optional.of(employee));

            List<ReviewResponse> result = performanceReviewService.getPendingReviews(reviewerId);

            assertThat(result).hasSize(1);
        }
    }

    @Nested
    @DisplayName("Submit Review Tests")
    class SubmitReviewTests {

        @Test
        @DisplayName("Should submit review successfully")
        void shouldSubmitReviewSuccessfully() {
            when(reviewRepository.findByIdAndTenantId(reviewId, tenantId)).thenReturn(Optional.of(review));
            when(reviewRepository.save(any(PerformanceReview.class))).thenAnswer(invocation -> invocation.getArgument(0));
            when(employeeRepository.findById(any())).thenReturn(Optional.of(employee));

            ReviewResponse result = performanceReviewService.submitReview(reviewId);

            assertThat(result).isNotNull();
            assertThat(result.getStatus()).isEqualTo(PerformanceReview.ReviewStatus.SUBMITTED);
            assertThat(result.getSubmittedAt()).isNotNull();
        }

        @Test
        @DisplayName("Should throw exception when submitting non-existent review")
        void shouldThrowExceptionWhenSubmittingNonExistentReview() {
            UUID invalidId = UUID.randomUUID();

            when(reviewRepository.findByIdAndTenantId(invalidId, tenantId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> performanceReviewService.submitReview(invalidId))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("Review not found");
        }
    }

    @Nested
    @DisplayName("Complete Review Tests")
    class CompleteReviewTests {

        @Test
        @DisplayName("Should complete review successfully")
        void shouldCompleteReviewSuccessfully() {
            review.setStatus(PerformanceReview.ReviewStatus.SUBMITTED);

            when(reviewRepository.findByIdAndTenantId(reviewId, tenantId)).thenReturn(Optional.of(review));
            when(reviewRepository.save(any(PerformanceReview.class))).thenAnswer(invocation -> invocation.getArgument(0));
            when(employeeRepository.findById(any())).thenReturn(Optional.of(employee));

            ReviewResponse result = performanceReviewService.completeReview(reviewId);

            assertThat(result).isNotNull();
            assertThat(result.getStatus()).isEqualTo(PerformanceReview.ReviewStatus.COMPLETED);
            assertThat(result.getCompletedAt()).isNotNull();
        }

        @Test
        @DisplayName("Should throw exception when completing non-existent review")
        void shouldThrowExceptionWhenCompletingNonExistentReview() {
            UUID invalidId = UUID.randomUUID();

            when(reviewRepository.findByIdAndTenantId(invalidId, tenantId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> performanceReviewService.completeReview(invalidId))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("Review not found");
        }
    }

    @Nested
    @DisplayName("Competency Tests")
    class CompetencyTests {

        @Test
        @DisplayName("Should add competency successfully")
        void shouldAddCompetencySuccessfully() {
            CompetencyRequest request = new CompetencyRequest();
            request.setReviewId(reviewId);
            request.setCompetencyName("Communication");
            request.setCategory(ReviewCompetency.CompetencyCategory.BEHAVIORAL);
            request.setRating(new BigDecimal("4.0"));
            request.setComments("Excellent communication skills");

            when(reviewRepository.findByIdAndTenantId(reviewId, tenantId)).thenReturn(Optional.of(review));
            when(competencyRepository.save(any(ReviewCompetency.class))).thenAnswer(invocation -> {
                ReviewCompetency saved = invocation.getArgument(0);
                saved.setId(UUID.randomUUID());
                saved.setCreatedAt(LocalDateTime.now());
                return saved;
            });

            CompetencyResponse result = performanceReviewService.addCompetency(request);

            assertThat(result).isNotNull();
            assertThat(result.getCompetencyName()).isEqualTo("Communication");
            assertThat(result.getCategory()).isEqualTo(ReviewCompetency.CompetencyCategory.BEHAVIORAL);
            assertThat(result.getRating()).isEqualTo(new BigDecimal("4.0"));
            verify(competencyRepository).save(any(ReviewCompetency.class));
        }

        @Test
        @DisplayName("Should throw exception when adding competency to non-existent review")
        void shouldThrowExceptionWhenAddingCompetencyToNonExistentReview() {
            UUID invalidReviewId = UUID.randomUUID();
            CompetencyRequest request = new CompetencyRequest();
            request.setReviewId(invalidReviewId);

            when(reviewRepository.findByIdAndTenantId(invalidReviewId, tenantId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> performanceReviewService.addCompetency(request))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("Review not found");
        }

        @Test
        @DisplayName("Should get competencies for review")
        void shouldGetCompetenciesForReview() {
            ReviewCompetency competency = ReviewCompetency.builder()
                    .reviewId(reviewId)
                    .competencyName("Leadership")
                    .category(ReviewCompetency.CompetencyCategory.LEADERSHIP)
                    .rating(new BigDecimal("4.5"))
                    .build();
            competency.setId(UUID.randomUUID());
            competency.setCreatedAt(LocalDateTime.now());

            when(competencyRepository.findAllByTenantIdAndReviewId(tenantId, reviewId))
                    .thenReturn(List.of(competency));

            List<CompetencyResponse> result = performanceReviewService.getCompetencies(reviewId);

            assertThat(result).hasSize(1);
            assertThat(result.get(0).getCompetencyName()).isEqualTo("Leadership");
        }
    }
}
