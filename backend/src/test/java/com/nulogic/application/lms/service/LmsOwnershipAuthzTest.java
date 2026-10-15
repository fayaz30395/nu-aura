package com.nulogic.application.lms.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nulogic.api.lms.dto.QuizAttemptRequest;
import com.nulogic.common.exception.ResourceNotFoundException;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.employee.Employee;
import com.nulogic.domain.lms.Course;
import com.nulogic.domain.lms.CourseEnrollment;
import com.nulogic.domain.lms.Quiz;
import com.nulogic.domain.lms.QuizAttempt;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.employee.repository.EmployeeSkillRepository;
import com.nulogic.infrastructure.lms.repository.*;
import com.nulogic.infrastructure.performance.repository.CompetencyFrameworkRepository;
import com.nulogic.infrastructure.performance.repository.CompetencyRequirementRepository;
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
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@MockitoSettings(strictness = Strictness.LENIENT)
@ExtendWith(MockitoExtension.class)
@DisplayName("LMS ownership / scope authorization")
class LmsOwnershipAuthzTest {

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
    @Mock
    private EmployeeSkillRepository employeeSkillRepository;
    @Mock
    private CompetencyFrameworkRepository competencyFrameworkRepository;
    @Mock
    private CompetencyRequirementRepository competencyRequirementRepository;

    private final UUID tenantId = UUID.randomUUID();
    private final UUID me = UUID.randomUUID();
    private final UUID other = UUID.randomUUID();

    private CourseEnrollmentService enrollmentService;
    private QuizAssessmentService quizService;
    private SkillGapAnalysisService skillGapService;

    @BeforeEach
    void setUp() {
        when(tenantTimeService.now(any(UUID.class))).thenReturn(LocalDateTime.of(2025, 6, 1, 9, 0));
        enrollmentService = new CourseEnrollmentService(enrollmentRepository, courseRepository, tenantTimeService,
                employeeRepository);
        quizService = new QuizAssessmentService(quizRepository, questionRepository, attemptRepository,
                enrollmentRepository, certificateRepository, new ObjectMapper(), tenantTimeService);
        skillGapService = new SkillGapAnalysisService(employeeRepository, employeeSkillRepository, courseRepository,
                competencyFrameworkRepository, competencyRequirementRepository);
        when(courseRepository.findByIdAndTenantId(any(), any())).thenReturn(Optional.of(new Course()));
        when(employeeRepository.findByIdAndTenantId(any(), any())).thenReturn(Optional.of(new Employee()));
        when(enrollmentRepository.save(any(CourseEnrollment.class))).thenAnswer(i -> i.getArgument(0));
    }

    private MockedStatic<SecurityContext> caller(UUID employeeId) {
        MockedStatic<SecurityContext> sc = mockStatic(SecurityContext.class);
        sc.when(SecurityContext::getCurrentEmployeeId).thenReturn(employeeId);
        sc.when(SecurityContext::getAllReporteeIds).thenReturn(Set.of());
        return sc;
    }

    private CourseEnrollment enrollmentOf(UUID employeeId) {
        CourseEnrollment e = CourseEnrollment.builder().courseId(UUID.randomUUID()).employeeId(employeeId).build();
        e.setTenantId(tenantId);
        return e;
    }

    @Test
    @DisplayName("enroll: self-enrolment works")
    void enrollSelf() {
        try (MockedStatic<SecurityContext> sc = caller(me)) {
            CourseEnrollment result = enrollmentService.enroll(tenantId, UUID.randomUUID(), me, me);
            assertThat(result.getEmployeeId()).isEqualTo(me);
        }
    }

    @Test
    @DisplayName("enroll: enrolling someone else without manager/HR scope is denied and persists nothing")
    void enrollOtherDenied() {
        try (MockedStatic<SecurityContext> sc = caller(me)) {
            assertThatThrownBy(() -> enrollmentService.enroll(tenantId, UUID.randomUUID(), other, me))
                    .isInstanceOf(AccessDeniedException.class);
            verify(enrollmentRepository, never()).save(any());
        }
    }

    @Test
    @DisplayName("enroll: a manager may enrol a reportee")
    void enrollReporteeAllowed() {
        try (MockedStatic<SecurityContext> sc = caller(me)) {
            sc.when(SecurityContext::getAllReporteeIds).thenReturn(Set.of(other));
            assertThat(enrollmentService.enroll(tenantId, UUID.randomUUID(), other, me).getEmployeeId())
                    .isEqualTo(other);
        }
    }

    @Test
    @DisplayName("enroll: unknown course in tenant is rejected")
    void enrollUnknownCourse() {
        when(courseRepository.findByIdAndTenantId(any(), any())).thenReturn(Optional.empty());
        try (MockedStatic<SecurityContext> sc = caller(me)) {
            assertThatThrownBy(() -> enrollmentService.enroll(tenantId, UUID.randomUUID(), me, me))
                    .isInstanceOf(ResourceNotFoundException.class);
            verify(enrollmentRepository, never()).save(any());
        }
    }

    @Test
    @DisplayName("progress: owner can update, other employee cannot (nothing saved)")
    void progressOwnership() {
        CourseEnrollment mine = enrollmentOf(me);
        UUID id = UUID.randomUUID();
        when(enrollmentRepository.findByIdAndTenantId(id, tenantId)).thenReturn(Optional.of(mine));

        try (MockedStatic<SecurityContext> sc = caller(other)) {
            assertThatThrownBy(() -> enrollmentService.updateProgress(tenantId, id, 100))
                    .isInstanceOf(ResourceNotFoundException.class);
            verify(enrollmentRepository, never()).save(any());
        }
        try (MockedStatic<SecurityContext> sc = caller(me)) {
            CourseEnrollment updated = enrollmentService.updateProgress(tenantId, id, 100);
            assertThat(updated.getStatus()).isEqualTo(CourseEnrollment.EnrollmentStatus.COMPLETED);
        }
    }

    @Test
    @DisplayName("quiz submit: another employee's attempt is not found and is not graded or saved")
    void quizAttemptOwnership() {
        UUID attemptId = UUID.randomUUID();
        QuizAttempt attempt = QuizAttempt.builder().quizId(UUID.randomUUID()).enrollmentId(UUID.randomUUID())
                .employeeId(me).status(QuizAttempt.AttemptStatus.IN_PROGRESS).build();
        when(attemptRepository.findByIdAndTenantId(attemptId, tenantId)).thenReturn(Optional.of(attempt));
        when(quizRepository.findByIdAndTenantId(any(), any())).thenReturn(Optional.of(new Quiz()));

        try (MockedStatic<SecurityContext> sc = caller(other)) {
            assertThatThrownBy(() -> quizService.submitQuizAttempt(attemptId, new QuizAttemptRequest(), tenantId))
                    .isInstanceOf(ResponseStatusException.class)
                    .hasMessageContaining("Attempt not found");
            verify(attemptRepository, never()).save(any());
        }
    }

    @Test
    @DisplayName("skill gaps: another employee's gaps are denied without manager/HR scope")
    void skillGapScope() {
        try (MockedStatic<SecurityContext> sc = caller(me)) {
            assertThatThrownBy(() -> skillGapService.analyzeGaps(tenantId, other))
                    .isInstanceOf(AccessDeniedException.class);
            verify(employeeRepository, never()).findByIdAndTenantId(any(), any());
        }
    }
}
