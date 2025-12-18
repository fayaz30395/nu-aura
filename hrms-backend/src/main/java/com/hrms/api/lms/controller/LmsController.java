package com.hrms.api.lms.controller;

import com.hrms.api.lms.dto.*;
import com.hrms.application.lms.service.LmsService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.lms.*;
import com.hrms.domain.lms.ContentProgress.ProgressStatus;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/lms")
@RequiredArgsConstructor
@Slf4j
public class LmsController {

    private final LmsService lmsService;

    // ========== Courses ==========

    @PostMapping("/courses")
    @RequiresPermission(Permission.LMS_COURSE_CREATE)
    public ResponseEntity<CourseResponse> createCourse(@Valid @RequestBody CourseRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();

        Course course = Course.builder()
                .title(request.getTitle())
                .code(request.getCode())
                .description(request.getDescription())
                .shortDescription(request.getShortDescription())
                .categoryId(request.getCategoryId())
                .thumbnailUrl(request.getThumbnailUrl())
                .previewVideoUrl(request.getPreviewVideoUrl())
                .difficultyLevel(request.getDifficultyLevel() != null ? request.getDifficultyLevel() : Course.DifficultyLevel.BEGINNER)
                .durationHours(request.getDurationHours())
                .passingScore(request.getPassingScore() != null ? request.getPassingScore() : 70)
                .maxAttempts(request.getMaxAttempts() != null ? request.getMaxAttempts() : 3)
                .isMandatory(request.getIsMandatory() != null ? request.getIsMandatory() : false)
                .isSelfPaced(request.getIsSelfPaced() != null ? request.getIsSelfPaced() : true)
                .enrollmentDeadline(request.getEnrollmentDeadline())
                .completionDeadline(request.getCompletionDeadline())
                .instructorId(request.getInstructorId())
                .instructorName(request.getInstructorName())
                .prerequisites(request.getPrerequisites())
                .skillsCovered(request.getSkillsCovered())
                .tags(request.getTags())
                .certificateTemplateId(request.getCertificateTemplateId())
                .isCertificateEnabled(request.getIsCertificateEnabled() != null ? request.getIsCertificateEnabled() : true)
                .totalEnrollments(0)
                .totalRatings(0)
                .build();
        course.setTenantId(tenantId);

        Course saved = lmsService.createCourse(course);
        return ResponseEntity.ok(CourseResponse.fromEntity(saved));
    }

    @GetMapping("/courses")
    @RequiresPermission(Permission.LMS_COURSE_VIEW)
    public ResponseEntity<Page<CourseResponse>> getCourses(
            @RequestParam(required = false) String search,
            Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();

        Page<Course> courses;
        if (search != null && !search.isEmpty()) {
            courses = lmsService.searchCourses(tenantId, search, pageable);
        } else {
            courses = lmsService.getAllCourses(tenantId, pageable);
        }

        return ResponseEntity.ok(courses.map(CourseResponse::fromEntity));
    }

    @GetMapping("/courses/published")
    @RequiresPermission(Permission.LMS_COURSE_VIEW)
    public ResponseEntity<Page<CourseResponse>> getPublishedCourses(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        Page<Course> courses = lmsService.getPublishedCourses(tenantId, pageable);
        return ResponseEntity.ok(courses.map(CourseResponse::fromEntity));
    }

    @GetMapping("/courses/{id}")
    @RequiresPermission(Permission.LMS_COURSE_VIEW)
    public ResponseEntity<CourseResponse> getCourse(@PathVariable UUID id) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return lmsService.getCourseById(tenantId, id)
                .map(course -> {
                    CourseResponse response = CourseResponse.fromEntity(course);
                    // Load modules
                    List<CourseModule> modules = lmsService.getModulesByCourse(tenantId, id);
                    response.setModules(modules.stream()
                            .map(m -> {
                                CourseModuleResponse moduleResponse = CourseModuleResponse.fromEntity(m);
                                // Load content for each module
                                List<ModuleContent> contents = lmsService.getContentByModule(tenantId, m.getId());
                                moduleResponse.setContents(contents.stream()
                                        .map(ModuleContentResponse::fromEntity)
                                        .collect(Collectors.toList()));
                                return moduleResponse;
                            })
                            .collect(Collectors.toList()));
                    return ResponseEntity.ok(response);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/courses/{id}")
    @RequiresPermission(Permission.LMS_COURSE_MANAGE)
    public ResponseEntity<CourseResponse> updateCourse(
            @PathVariable UUID id,
            @Valid @RequestBody CourseRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();

        return lmsService.getCourseById(tenantId, id)
                .map(existing -> {
                    existing.setTitle(request.getTitle());
                    existing.setCode(request.getCode());
                    existing.setDescription(request.getDescription());
                    existing.setShortDescription(request.getShortDescription());
                    existing.setCategoryId(request.getCategoryId());
                    existing.setThumbnailUrl(request.getThumbnailUrl());
                    existing.setPreviewVideoUrl(request.getPreviewVideoUrl());
                    if (request.getDifficultyLevel() != null) {
                        existing.setDifficultyLevel(request.getDifficultyLevel());
                    }
                    existing.setDurationHours(request.getDurationHours());
                    if (request.getPassingScore() != null) {
                        existing.setPassingScore(request.getPassingScore());
                    }
                    existing.setInstructorId(request.getInstructorId());
                    existing.setInstructorName(request.getInstructorName());
                    existing.setPrerequisites(request.getPrerequisites());
                    existing.setSkillsCovered(request.getSkillsCovered());
                    existing.setTags(request.getTags());
                    existing.setUpdatedAt(LocalDateTime.now());

                    Course updated = lmsService.updateCourse(existing);
                    return ResponseEntity.ok(CourseResponse.fromEntity(updated));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/courses/{id}/publish")
    @RequiresPermission(Permission.LMS_COURSE_MANAGE)
    public ResponseEntity<Void> publishCourse(@PathVariable UUID id) {
        UUID tenantId = TenantContext.getCurrentTenant();
        lmsService.publishCourse(tenantId, id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/courses/{id}/archive")
    @RequiresPermission(Permission.LMS_COURSE_MANAGE)
    public ResponseEntity<Void> archiveCourse(@PathVariable UUID id) {
        UUID tenantId = TenantContext.getCurrentTenant();
        lmsService.archiveCourse(tenantId, id);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/courses/{id}")
    @RequiresPermission(Permission.LMS_COURSE_MANAGE)
    public ResponseEntity<Void> deleteCourse(@PathVariable UUID id) {
        UUID tenantId = TenantContext.getCurrentTenant();
        lmsService.deleteCourse(tenantId, id);
        return ResponseEntity.noContent().build();
    }

    // ========== Modules ==========

    @PostMapping("/courses/{courseId}/modules")
    @RequiresPermission(Permission.LMS_MODULE_CREATE)
    public ResponseEntity<CourseModuleResponse> createModule(
            @PathVariable UUID courseId,
            @RequestBody CourseModule request) {
        UUID tenantId = TenantContext.getCurrentTenant();

        CourseModule module = CourseModule.builder()
                .courseId(courseId)
                .title(request.getTitle())
                .description(request.getDescription())
                .orderIndex(request.getOrderIndex() != null ? request.getOrderIndex() : 0)
                .durationMinutes(request.getDurationMinutes())
                .isMandatory(request.getIsMandatory() != null ? request.getIsMandatory() : true)
                .unlockAfterDays(request.getUnlockAfterDays())
                .build();
        module.setTenantId(tenantId);

        CourseModule saved = lmsService.createModule(module);
        return ResponseEntity.ok(CourseModuleResponse.fromEntity(saved));
    }

    @GetMapping("/courses/{courseId}/modules")
    @RequiresPermission(Permission.LMS_COURSE_VIEW)
    public ResponseEntity<List<CourseModuleResponse>> getModules(@PathVariable UUID courseId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        List<CourseModule> modules = lmsService.getModulesByCourse(tenantId, courseId);
        return ResponseEntity.ok(modules.stream()
                .map(CourseModuleResponse::fromEntity)
                .collect(Collectors.toList()));
    }

    @DeleteMapping("/modules/{id}")
    @RequiresPermission(Permission.LMS_MODULE_CREATE)
    public ResponseEntity<Void> deleteModule(@PathVariable UUID id) {
        UUID tenantId = TenantContext.getCurrentTenant();
        lmsService.deleteModule(tenantId, id);
        return ResponseEntity.noContent().build();
    }

    // ========== Content ==========

    @PostMapping("/modules/{moduleId}/content")
    @RequiresPermission(Permission.LMS_MODULE_CREATE)
    public ResponseEntity<ModuleContentResponse> createContent(
            @PathVariable UUID moduleId,
            @RequestBody ModuleContent request) {
        UUID tenantId = TenantContext.getCurrentTenant();

        ModuleContent content = ModuleContent.builder()
                .moduleId(moduleId)
                .title(request.getTitle())
                .contentType(request.getContentType())
                .orderIndex(request.getOrderIndex() != null ? request.getOrderIndex() : 0)
                .durationMinutes(request.getDurationMinutes())
                .videoUrl(request.getVideoUrl())
                .videoProvider(request.getVideoProvider())
                .documentUrl(request.getDocumentUrl())
                .documentType(request.getDocumentType())
                .textContent(request.getTextContent())
                .externalUrl(request.getExternalUrl())
                .quizId(request.getQuizId())
                .assignmentInstructions(request.getAssignmentInstructions())
                .isMandatory(request.getIsMandatory() != null ? request.getIsMandatory() : true)
                .completionRequired(request.getCompletionRequired() != null ? request.getCompletionRequired() : true)
                .build();
        content.setTenantId(tenantId);

        ModuleContent saved = lmsService.createContent(content);
        return ResponseEntity.ok(ModuleContentResponse.fromEntity(saved));
    }

    @GetMapping("/modules/{moduleId}/content")
    @RequiresPermission(Permission.LMS_COURSE_VIEW)
    public ResponseEntity<List<ModuleContentResponse>> getContent(@PathVariable UUID moduleId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        List<ModuleContent> contents = lmsService.getContentByModule(tenantId, moduleId);
        return ResponseEntity.ok(contents.stream()
                .map(ModuleContentResponse::fromEntity)
                .collect(Collectors.toList()));
    }

    @DeleteMapping("/content/{id}")
    @RequiresPermission(Permission.LMS_MODULE_CREATE)
    public ResponseEntity<Void> deleteContent(@PathVariable UUID id) {
        UUID tenantId = TenantContext.getCurrentTenant();
        lmsService.deleteContent(tenantId, id);
        return ResponseEntity.noContent().build();
    }

    // ========== Enrollments ==========

    @PostMapping("/courses/{courseId}/enroll")
    @RequiresPermission(Permission.LMS_ENROLL)
    public ResponseEntity<CourseEnrollment> enrollSelf(@PathVariable UUID courseId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID employeeId = SecurityContext.getCurrentEmployeeId();

        CourseEnrollment enrollment = lmsService.enrollEmployee(tenantId, courseId, employeeId, employeeId);
        return ResponseEntity.ok(enrollment);
    }

    @PostMapping("/courses/{courseId}/enroll/{employeeId}")
    @RequiresPermission(Permission.LMS_COURSE_MANAGE)
    public ResponseEntity<CourseEnrollment> enrollEmployee(
            @PathVariable UUID courseId,
            @PathVariable UUID employeeId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID enrolledBy = SecurityContext.getCurrentEmployeeId();

        CourseEnrollment enrollment = lmsService.enrollEmployee(tenantId, courseId, employeeId, enrolledBy);
        return ResponseEntity.ok(enrollment);
    }

    @GetMapping("/my-enrollments")
    @RequiresPermission(Permission.LMS_COURSE_VIEW)
    public ResponseEntity<List<CourseEnrollment>> getMyEnrollments() {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID employeeId = SecurityContext.getCurrentEmployeeId();
        List<CourseEnrollment> enrollments = lmsService.getEmployeeEnrollments(tenantId, employeeId);
        return ResponseEntity.ok(enrollments);
    }

    @GetMapping("/enrollments/{courseId}")
    @RequiresPermission(Permission.LMS_COURSE_VIEW)
    public ResponseEntity<CourseEnrollment> getEnrollment(@PathVariable UUID courseId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID employeeId = SecurityContext.getCurrentEmployeeId();
        return lmsService.getEnrollment(tenantId, courseId, employeeId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // ========== Progress ==========

    @PostMapping("/progress/{enrollmentId}/content/{contentId}")
    @RequiresPermission(Permission.LMS_COURSE_VIEW)
    public ResponseEntity<ContentProgress> updateProgress(
            @PathVariable UUID enrollmentId,
            @PathVariable UUID contentId,
            @RequestParam ProgressStatus status,
            @RequestParam(required = false) Integer timeSpentSeconds) {
        UUID tenantId = TenantContext.getCurrentTenant();

        ContentProgress progress = lmsService.updateContentProgress(
                tenantId, enrollmentId, contentId, status, timeSpentSeconds);
        return ResponseEntity.ok(progress);
    }

    @GetMapping("/progress/{enrollmentId}")
    @RequiresPermission(Permission.LMS_COURSE_VIEW)
    public ResponseEntity<List<ContentProgress>> getProgress(@PathVariable UUID enrollmentId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        List<ContentProgress> progress = lmsService.getProgressByEnrollment(tenantId, enrollmentId);
        return ResponseEntity.ok(progress);
    }

    // ========== Certificates ==========

    @PostMapping("/certificates/issue/{enrollmentId}")
    @RequiresPermission(Permission.LMS_COURSE_MANAGE)
    public ResponseEntity<Certificate> issueCertificate(@PathVariable UUID enrollmentId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID issuerId = SecurityContext.getCurrentEmployeeId();

        Certificate certificate = lmsService.issueCertificate(tenantId, enrollmentId, issuerId);
        return ResponseEntity.ok(certificate);
    }

    @GetMapping("/my-certificates")
    @RequiresPermission(Permission.LMS_CERTIFICATE_VIEW)
    public ResponseEntity<List<Certificate>> getMyCertificates() {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID employeeId = SecurityContext.getCurrentEmployeeId();
        List<Certificate> certificates = lmsService.getEmployeeCertificates(tenantId, employeeId);
        return ResponseEntity.ok(certificates);
    }

    @GetMapping("/certificates/verify/{certificateNumber}")
    @RequiresPermission(Permission.LMS_CERTIFICATE_VIEW)
    public ResponseEntity<Certificate> verifyCertificate(@PathVariable String certificateNumber) {
        return lmsService.verifyCertificate(certificateNumber)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // ========== Dashboard ==========

    @GetMapping("/dashboard")
    @RequiresPermission(Permission.LMS_COURSE_VIEW)
    public ResponseEntity<Map<String, Object>> getMyDashboard() {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID employeeId = SecurityContext.getCurrentEmployeeId();
        Map<String, Object> dashboard = lmsService.getEmployeeDashboard(tenantId, employeeId);
        return ResponseEntity.ok(dashboard);
    }

    @GetMapping("/admin/dashboard")
    @RequiresPermission(Permission.LMS_COURSE_MANAGE)
    public ResponseEntity<Map<String, Object>> getAdminDashboard() {
        UUID tenantId = TenantContext.getCurrentTenant();
        Map<String, Object> dashboard = lmsService.getAdminDashboard(tenantId);
        return ResponseEntity.ok(dashboard);
    }
}
