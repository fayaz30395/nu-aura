package com.hrms.application.lms.service;

import com.hrms.api.lms.dto.CompletionStatsResponse;
import com.hrms.domain.lms.CourseEnrollment;
import com.hrms.domain.lms.CourseEnrollment.EnrollmentStatus;
import com.hrms.infrastructure.lms.repository.CourseEnrollmentRepository;
import com.hrms.infrastructure.lms.repository.CourseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class CourseEnrollmentService {

    private final CourseEnrollmentRepository enrollmentRepository;
    private final CourseRepository courseRepository;

    /**
     * Enroll an employee in a course. If an enrollment already exists, returns
     * the existing one rather than creating a duplicate (idempotent).
     */
    public CourseEnrollment enroll(UUID tenantId, UUID courseId, UUID employeeId, UUID enrolledBy) {
        Optional<CourseEnrollment> existing =
                enrollmentRepository.findByCourseIdAndEmployeeIdAndTenantId(courseId, employeeId, tenantId);
        if (existing.isPresent()) {
            return existing.get();
        }

        CourseEnrollment enrollment = CourseEnrollment.builder()
                .courseId(courseId)
                .employeeId(employeeId)
                .status(EnrollmentStatus.ENROLLED)
                .enrolledAt(LocalDateTime.now())
                .progressPercentage(BigDecimal.ZERO)
                .enrolledBy(enrolledBy)
                .build();
        enrollment.setTenantId(tenantId);

        CourseEnrollment saved = enrollmentRepository.save(enrollment);

        // Increment course enrollment counter
        courseRepository.findByIdAndTenantId(courseId, tenantId).ifPresent(course -> {
            course.setTotalEnrollments(course.getTotalEnrollments() + 1);
            courseRepository.save(course);
        });

        return saved;
    }

    /**
     * Update the progress percentage of an enrollment directly.
     * Transitions status to IN_PROGRESS when progress > 0, and to COMPLETED
     * when progressPercent reaches 100.
     */
    public CourseEnrollment updateProgress(UUID tenantId, UUID enrollmentId, int progressPercent) {
        if (progressPercent < 0 || progressPercent > 100) {
            throw new IllegalArgumentException("progressPercent must be between 0 and 100");
        }

        CourseEnrollment enrollment = enrollmentRepository.findByIdAndTenantId(enrollmentId, tenantId)
                .orElseThrow(() -> new RuntimeException("Enrollment not found: " + enrollmentId));

        enrollment.setProgressPercentage(BigDecimal.valueOf(progressPercent));
        enrollment.setLastAccessedAt(LocalDateTime.now());

        if (progressPercent >= 100) {
            enrollment.setStatus(EnrollmentStatus.COMPLETED);
            enrollment.setCompletedAt(LocalDateTime.now());
        } else if (progressPercent > 0 && enrollment.getStatus() == EnrollmentStatus.ENROLLED) {
            enrollment.setStatus(EnrollmentStatus.IN_PROGRESS);
        }

        return enrollmentRepository.save(enrollment);
    }

    /**
     * Retrieve all enrollments for a given employee within the current tenant.
     */
    @Transactional(readOnly = true)
    public List<CourseEnrollment> getMyEnrollments(UUID tenantId, UUID employeeId) {
        return enrollmentRepository.findByEmployee(tenantId, employeeId);
    }

    /**
     * Retrieve a paginated list of all enrollments for a specific course (admin view).
     */
    @Transactional(readOnly = true)
    public Page<CourseEnrollment> getCourseEnrollments(UUID tenantId, UUID courseId, Pageable pageable) {
        return enrollmentRepository.findAllByCourseIdAndTenantId(courseId, tenantId, pageable);
    }

    /**
     * Return completion statistics for a course: total enrolled, completed count,
     * and average progress percentage.
     */
    @Transactional(readOnly = true)
    public CompletionStatsResponse getCompletionStats(UUID tenantId, UUID courseId) {
        long totalEnrolled = enrollmentRepository.countByCourse(courseId, tenantId);
        long completedCount = enrollmentRepository.countCompletedByCourse(courseId, tenantId);

        // Compute average progress across all enrollments for this course
        Page<CourseEnrollment> enrollments =
                enrollmentRepository.findAllByCourseIdAndTenantId(courseId, tenantId, Pageable.unpaged());

        double avgProgress = enrollments.getContent().stream()
                .mapToDouble(e -> e.getProgressPercentage() != null
                        ? e.getProgressPercentage().doubleValue()
                        : 0.0)
                .average()
                .orElse(0.0);

        return CompletionStatsResponse.builder()
                .courseId(courseId)
                .totalEnrolled(totalEnrolled)
                .completedCount(completedCount)
                .avgProgress(avgProgress)
                .build();
    }
}
