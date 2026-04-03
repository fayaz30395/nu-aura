package com.hrms.api.lms;

import com.hrms.api.lms.dto.CompletionStatsResponse;
import com.hrms.api.lms.dto.EnrollmentResponse;
import com.hrms.api.lms.dto.UpdateProgressRequest;
import com.hrms.application.lms.service.CourseEnrollmentService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.common.security.RequiresFeature;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.featureflag.FeatureFlag;
import com.hrms.domain.lms.CourseEnrollment;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * REST controller for course enrollment operations.
 * <p>
 * Endpoints:
 * POST   /api/v1/lms/courses/{courseId}/enroll                  — Enroll current user (or specified employee) in a course
 * PUT    /api/v1/lms/enrollments/{enrollmentId}/progress         — Update progress percentage directly
 * GET    /api/v1/lms/my-courses                                   — Current employee's enrollments
 * GET    /api/v1/lms/courses/{courseId}/enrollments               — Admin: all enrollments for a course
 * GET    /api/v1/lms/courses/{courseId}/enrollments/stats         — Admin: completion statistics
 */
@RestController
@RequestMapping("/api/v1/lms")
@RequiredArgsConstructor
@RequiresFeature(FeatureFlag.ENABLE_LMS)
public class CourseEnrollmentController {

    private final CourseEnrollmentService enrollmentService;

    /**
     * Enroll the current employee in a course.
     * Optionally, an admin may supply ?employeeId=... to enroll another employee.
     */
    @PostMapping("/courses/{courseId}/enroll")
    @ResponseStatus(HttpStatus.CREATED)
    @RequiresPermission(Permission.LMS_ENROLL)
    public EnrollmentResponse enroll(
            @PathVariable UUID courseId,
            @RequestParam(required = false) UUID employeeId) {

        UUID tenantId = TenantContext.getCurrentTenant();
        UUID currentUserId = SecurityContext.getCurrentUserId();

        // Default to the current employee if no explicit target is given
        UUID targetEmployeeId = (employeeId != null) ? employeeId : SecurityContext.getCurrentEmployeeId();

        CourseEnrollment enrollment = enrollmentService.enroll(tenantId, courseId, targetEmployeeId, currentUserId);
        return EnrollmentResponse.fromEntity(enrollment);
    }

    /**
     * Update the progress percentage of an enrollment.
     * The employee who owns the enrollment or an admin can call this.
     * Body: { "progressPercent": 75 }
     */
    @PutMapping("/enrollments/{enrollmentId}/progress")
    @RequiresPermission(Permission.LMS_ENROLL)
    public EnrollmentResponse updateProgress(
            @PathVariable UUID enrollmentId,
            @Valid @RequestBody UpdateProgressRequest request) {

        UUID tenantId = TenantContext.getCurrentTenant();
        CourseEnrollment updated = enrollmentService.updateProgress(tenantId, enrollmentId, request.getProgressPercent());
        return EnrollmentResponse.fromEntity(updated);
    }

    /**
     * Get all enrollments for the currently authenticated employee.
     */
    @GetMapping("/my-courses")
    @RequiresPermission(Permission.LMS_COURSE_VIEW)
    public List<EnrollmentResponse> getMyEnrollments() {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID employeeId = SecurityContext.getCurrentEmployeeId();
        return enrollmentService.getMyEnrollments(tenantId, employeeId)
                .stream()
                .map(EnrollmentResponse::fromEntity)
                .collect(Collectors.toList());
    }

    /**
     * Admin view: paginated list of all enrollments for a specific course.
     */
    @GetMapping("/courses/{courseId}/enrollments")
    @RequiresPermission(Permission.LMS_COURSE_MANAGE)
    public Page<EnrollmentResponse> getCourseEnrollments(
            @PathVariable UUID courseId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        UUID tenantId = TenantContext.getCurrentTenant();
        return enrollmentService.getCourseEnrollments(tenantId, courseId, PageRequest.of(page, size))
                .map(EnrollmentResponse::fromEntity);
    }

    /**
     * Admin view: completion statistics for a course.
     */
    @GetMapping("/courses/{courseId}/enrollments/stats")
    @RequiresPermission(Permission.LMS_COURSE_MANAGE)
    public CompletionStatsResponse getCompletionStats(@PathVariable UUID courseId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return enrollmentService.getCompletionStats(tenantId, courseId);
    }
}
