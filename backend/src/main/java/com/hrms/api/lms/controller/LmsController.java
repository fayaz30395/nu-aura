package com.hrms.api.lms.controller;

import com.hrms.api.lms.dto.CourseCatalogResponse;
import com.hrms.api.lms.dto.CourseRequest;
import com.hrms.api.lms.dto.SkillGapReport;
import com.hrms.application.lms.service.LmsService;
import com.hrms.application.lms.service.SkillGapAnalysisService;
import com.hrms.application.lms.service.QuizManagementService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.common.security.RequiresFeature;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.featureflag.FeatureFlag;
import com.hrms.domain.lms.Certificate;
import com.hrms.domain.lms.ContentProgress;
import com.hrms.domain.lms.Course;
import com.hrms.domain.lms.Quiz;
import com.hrms.domain.lms.QuizQuestion;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/lms")
@RequiredArgsConstructor
@RequiresFeature(FeatureFlag.ENABLE_LMS)
public class LmsController {

    private final LmsService lmsService;
    private final SkillGapAnalysisService skillGapAnalysisService;
    private final QuizManagementService quizManagementService;

    // ─── Catalog ─────────────────────────────────────────────────────────────

    @GetMapping("/catalog")
    @RequiresPermission(Permission.TRAINING_VIEW)
    public CourseCatalogResponse getCatalog(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return lmsService.getCourseCatalog(tenantId, page, size);
    }

    // ─── Course CRUD ──────────────────────────────────────────────────────────

    @GetMapping("/courses")
    @RequiresPermission(Permission.TRAINING_VIEW)
    public Page<Course> getCourses(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String search) {
        UUID tenantId = TenantContext.getCurrentTenant();
        PageRequest pageable = PageRequest.of(page, size);
        return search != null && !search.isBlank()
                ? lmsService.searchCourses(tenantId, search, pageable)
                : lmsService.getAllCourses(tenantId, pageable);
    }

    @GetMapping("/courses/published")
    @RequiresPermission(Permission.TRAINING_VIEW)
    public Page<Course> getPublishedCourses(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return lmsService.getPublishedCourses(tenantId, PageRequest.of(page, size));
    }

    @GetMapping("/courses/{id}")
    @RequiresPermission(Permission.TRAINING_VIEW)
    public Course getCourse(@PathVariable UUID id) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return lmsService.getCourseById(tenantId, id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Course not found: " + id));
    }

    @PostMapping("/courses")
    @ResponseStatus(HttpStatus.CREATED)
    @RequiresPermission(Permission.LMS_COURSE_MANAGE)
    public Course createCourse(@Valid @RequestBody Course course) {
        // Reset server-managed / immutable fields to prevent mass-assignment
        course.setId(null);
        course.setTenantId(TenantContext.getCurrentTenant());
        course.setDeleted(false);
        course.setTotalEnrollments(0);
        course.setTotalRatings(0);
        course.setAvgRating(null);
        return lmsService.createCourse(course);
    }

    @PutMapping("/courses/{id}")
    @RequiresPermission(Permission.LMS_COURSE_MANAGE)
    public Course updateCourse(@PathVariable UUID id, @Valid @RequestBody Course course) {
        course.setId(id);
        course.setTenantId(TenantContext.getCurrentTenant());
        return lmsService.updateCourse(course);
    }

    @PostMapping("/courses/{id}/publish")
    @RequiresPermission(Permission.LMS_COURSE_MANAGE)
    public ResponseEntity<Void> publishCourse(@PathVariable UUID id) {
        lmsService.publishCourse(TenantContext.getCurrentTenant(), id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/courses/{id}/archive")
    @RequiresPermission(Permission.LMS_COURSE_MANAGE)
    public ResponseEntity<Void> archiveCourse(@PathVariable UUID id) {
        lmsService.archiveCourse(TenantContext.getCurrentTenant(), id);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/courses/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @RequiresPermission(Permission.LMS_COURSE_MANAGE)
    public void deleteCourse(@PathVariable UUID id) {
        lmsService.deleteCourse(TenantContext.getCurrentTenant(), id);
    }

    // NOTE: POST /courses/{courseId}/enroll is handled by CourseEnrollmentController.

    // ─── Quiz Management (HR/Admin) ───────────────────────────────────────────

    @PostMapping("/courses/{courseId}/quizzes")
    @ResponseStatus(HttpStatus.CREATED)
    @RequiresPermission(Permission.LMS_COURSE_MANAGE)
    public Quiz createQuiz(@PathVariable UUID courseId, @Valid @RequestBody Quiz quiz) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return quizManagementService.createQuiz(courseId, quiz, tenantId);
    }

    @GetMapping("/courses/{courseId}/quizzes")
    @RequiresPermission(Permission.LMS_COURSE_MANAGE)
    public List<Quiz> getQuizzesByCompany(@PathVariable UUID courseId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return quizManagementService.getQuizzesByCourse(courseId, tenantId);
    }

    @GetMapping("/quizzes/{quizId}")
    @RequiresPermission(Permission.LMS_COURSE_MANAGE)
    public Quiz getQuiz(@PathVariable UUID quizId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return quizManagementService.getQuizWithQuestions(quizId, tenantId);
    }

    @PutMapping("/quizzes/{quizId}")
    @RequiresPermission(Permission.LMS_COURSE_MANAGE)
    public Quiz updateQuiz(@PathVariable UUID quizId, @Valid @RequestBody Quiz quiz) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return quizManagementService.updateQuiz(quizId, quiz, tenantId);
    }

    @DeleteMapping("/quizzes/{quizId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @RequiresPermission(Permission.LMS_COURSE_MANAGE)
    public void deleteQuiz(@PathVariable UUID quizId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        quizManagementService.deleteQuiz(quizId, tenantId);
    }

    @PostMapping("/quizzes/{quizId}/questions")
    @ResponseStatus(HttpStatus.CREATED)
    @RequiresPermission(Permission.LMS_COURSE_MANAGE)
    public QuizQuestion addQuestionToQuiz(@PathVariable UUID quizId, @Valid @RequestBody QuizQuestion question) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return quizManagementService.addQuestionToQuiz(quizId, question, tenantId);
    }

    @GetMapping("/quizzes/{quizId}/questions")
    @RequiresPermission(Permission.LMS_COURSE_MANAGE)
    public List<QuizQuestion> getQuizQuestions(@PathVariable UUID quizId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return quizManagementService.getQuizQuestions(quizId, tenantId);
    }

    @PutMapping("/questions/{questionId}")
    @RequiresPermission(Permission.LMS_COURSE_MANAGE)
    public QuizQuestion updateQuestion(@PathVariable UUID questionId, @Valid @RequestBody QuizQuestion question) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return quizManagementService.updateQuestion(questionId, question, tenantId);
    }

    @DeleteMapping("/questions/{questionId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @RequiresPermission(Permission.LMS_COURSE_MANAGE)
    public void deleteQuestion(@PathVariable UUID questionId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        quizManagementService.deleteQuestion(questionId, tenantId);
    }

    @PostMapping("/quizzes/{quizId}/reorder-questions")
    @RequiresPermission(Permission.LMS_COURSE_MANAGE)
    public ResponseEntity<Void> reorderQuestions(@PathVariable UUID quizId, @RequestBody List<UUID> questionIds) {
        UUID tenantId = TenantContext.getCurrentTenant();
        quizManagementService.reorderQuestions(quizId, questionIds, tenantId);
        return ResponseEntity.ok().build();
    }

    // ─── Content Progress ─────────────────────────────────────────────────────

    @PostMapping("/progress/{enrollmentId}/content/{contentId}")
    @RequiresPermission(Permission.LMS_ENROLL)
    public ContentProgress updateContentProgress(
            @PathVariable UUID enrollmentId,
            @PathVariable UUID contentId,
            @RequestParam ContentProgress.ProgressStatus status,
            @RequestParam(required = false, defaultValue = "0") Integer timeSpentSeconds) {
        return lmsService.updateContentProgress(
                TenantContext.getCurrentTenant(), enrollmentId, contentId, status, timeSpentSeconds);
    }

    @GetMapping("/progress/{enrollmentId}")
    @RequiresPermission(Permission.LMS_ENROLL)
    public List<ContentProgress> getEnrollmentProgress(@PathVariable UUID enrollmentId) {
        return lmsService.getProgressByEnrollment(TenantContext.getCurrentTenant(), enrollmentId);
    }

    // ─── Certificates ─────────────────────────────────────────────────────────

    @GetMapping("/my-certificates")
    @RequiresPermission(Permission.LMS_COURSE_VIEW)
    public List<Certificate> getMyCertificates() {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID employeeId = SecurityContext.getCurrentEmployeeId();
        return lmsService.getEmployeeCertificates(tenantId, employeeId);
    }

    @GetMapping("/certificates/verify/{certificateNumber}")
    @RequiresPermission(Permission.TRAINING_VIEW)
    public Certificate verifyCertificate(@PathVariable String certificateNumber) {
        return lmsService.verifyCertificate(certificateNumber)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Certificate not found: " + certificateNumber));
    }

    // ─── Dashboards ───────────────────────────────────────────────────────────

    @GetMapping("/dashboard")
    @RequiresPermission(Permission.LMS_COURSE_VIEW)
    public Map<String, Object> getMyDashboard() {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID employeeId = SecurityContext.getCurrentEmployeeId();
        return lmsService.getEmployeeDashboard(tenantId, employeeId);
    }

    @GetMapping("/admin/dashboard")
    @RequiresPermission(Permission.LMS_COURSE_MANAGE)
    public Map<String, Object> getAdminDashboard() {
        return lmsService.getAdminDashboard(TenantContext.getCurrentTenant());
    }

    // ─── Skill Gaps ───────────────────────────────────────────────────────────

    @GetMapping("/employees/{employeeId}/skill-gaps")
    @RequiresPermission(Permission.EMPLOYEE_READ)
    public SkillGapReport getSkillGaps(@PathVariable UUID employeeId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return skillGapAnalysisService.analyzeGaps(tenantId, employeeId);
    }
}
