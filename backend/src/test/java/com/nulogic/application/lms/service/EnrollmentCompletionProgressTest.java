package com.nulogic.application.lms.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.lms.CourseEnrollment;
import com.nulogic.domain.lms.CourseEnrollment.EnrollmentStatus;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.lms.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.lang.reflect.Method;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.when;

@MockitoSettings(strictness = Strictness.LENIENT)
@ExtendWith(MockitoExtension.class)
@DisplayName("Enrollment completion keeps progress at 100 (G-010/G-011)")
class EnrollmentCompletionProgressTest {

    @Mock
    private CourseEnrollmentRepository enrollmentRepository;
    @Mock
    private CourseRepository courseRepository;
    @Mock
    private TenantTimeService tenantTimeService;
    @Mock
    private EmployeeRepository employeeRepository;
    @Mock
    private QuizRepository quizRepository;
    @Mock
    private QuizQuestionRepository questionRepository;
    @Mock
    private QuizAttemptRepository attemptRepository;
    @Mock
    private CertificateRepository certificateRepository;

    private final UUID tenantId = UUID.randomUUID();
    private final UUID me = UUID.randomUUID();
    private final UUID id = UUID.randomUUID();

    private CourseEnrollmentService enrollmentService;
    private QuizAssessmentService quizService;

    @BeforeEach
    void setUp() {
        when(tenantTimeService.now(any(UUID.class))).thenReturn(LocalDateTime.of(2025, 6, 1, 9, 0));
        enrollmentService = new CourseEnrollmentService(enrollmentRepository, courseRepository, tenantTimeService,
                employeeRepository);
        quizService = new QuizAssessmentService(quizRepository, questionRepository, attemptRepository,
                enrollmentRepository, certificateRepository, new ObjectMapper(), tenantTimeService);
        when(enrollmentRepository.save(any(CourseEnrollment.class))).thenAnswer(i -> i.getArgument(0));
    }

    private CourseEnrollment enrollment(EnrollmentStatus status, int progress) {
        CourseEnrollment e = CourseEnrollment.builder().courseId(UUID.randomUUID()).employeeId(me)
                .status(status).progressPercentage(BigDecimal.valueOf(progress)).build();
        e.setTenantId(tenantId);
        when(enrollmentRepository.findByIdAndTenantId(id, tenantId)).thenReturn(Optional.of(e));
        return e;
    }

    private CourseEnrollment update(int progress) {
        try (MockedStatic<SecurityContext> sc = mockStatic(SecurityContext.class)) {
            sc.when(SecurityContext::getCurrentEmployeeId).thenReturn(me);
            return enrollmentService.updateProgress(tenantId, id, progress);
        }
    }

    @Test
    @DisplayName("completed enrollment ignores a lower progress value")
    void completedIgnoresLower() {
        enrollment(EnrollmentStatus.COMPLETED, 100);
        CourseEnrollment out = update(30);
        assertThat(out.getStatus()).isEqualTo(EnrollmentStatus.COMPLETED);
        assertThat(out.getProgressPercentage()).isEqualByComparingTo("100");
    }

    @Test
    @DisplayName("in-progress enrollment reaching 100 becomes COMPLETED")
    void reachingHundredCompletes() {
        enrollment(EnrollmentStatus.IN_PROGRESS, 50);
        CourseEnrollment out = update(100);
        assertThat(out.getStatus()).isEqualTo(EnrollmentStatus.COMPLETED);
        assertThat(out.getProgressPercentage()).isEqualByComparingTo("100");
    }

    @Test
    @DisplayName("in-progress enrollment at 40 keeps status")
    void partialKeepsStatus() {
        enrollment(EnrollmentStatus.IN_PROGRESS, 10);
        CourseEnrollment out = update(40);
        assertThat(out.getStatus()).isEqualTo(EnrollmentStatus.IN_PROGRESS);
        assertThat(out.getProgressPercentage()).isEqualByComparingTo("40");
    }

    @Test
    @DisplayName("passed quiz completes the enrollment at 100 percent")
    void passedQuizSetsHundred() throws Exception {
        CourseEnrollment e = enrollment(EnrollmentStatus.IN_PROGRESS, 30);
        Method m = QuizAssessmentService.class.getDeclaredMethod("updateEnrollmentQuizTracking",
                UUID.class, boolean.class, int.class, int.class, UUID.class);
        m.setAccessible(true);
        m.invoke(quizService, id, true, 90, 100, tenantId);
        assertThat(e.getStatus()).isEqualTo(EnrollmentStatus.COMPLETED);
        assertThat(e.getProgressPercentage()).isEqualByComparingTo("100");
    }
}
