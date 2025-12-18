package com.hrms.application.lms.service;

import com.hrms.domain.lms.*;
import com.hrms.domain.lms.Course.CourseStatus;
import com.hrms.domain.lms.CourseEnrollment.EnrollmentStatus;
import com.hrms.domain.lms.ContentProgress.ProgressStatus;
import com.hrms.infrastructure.lms.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class LmsService {

    private final CourseRepository courseRepository;
    private final CourseModuleRepository moduleRepository;
    private final ModuleContentRepository contentRepository;
    private final CourseEnrollmentRepository enrollmentRepository;
    private final ContentProgressRepository progressRepository;
    private final CertificateRepository certificateRepository;

    // ================== Courses ==================

    @Transactional
    public Course createCourse(Course course) {
        if (course.getId() == null) {
            course.setId(UUID.randomUUID());
        }
        if (course.getStatus() == null) {
            course.setStatus(CourseStatus.DRAFT);
        }
        if (course.getCreatedAt() == null) {
            course.setCreatedAt(LocalDateTime.now());
        }

        log.info("Creating course: {}", course.getTitle());
        return courseRepository.save(course);
    }

    @Transactional
    public Course updateCourse(Course course) {
        course.setUpdatedAt(LocalDateTime.now());
        return courseRepository.save(course);
    }

    @Transactional(readOnly = true)
    public Page<Course> getAllCourses(UUID tenantId, Pageable pageable) {
        return courseRepository.findAllByTenantId(tenantId, pageable);
    }

    @Transactional(readOnly = true)
    public Page<Course> getPublishedCourses(UUID tenantId, Pageable pageable) {
        return courseRepository.findPublishedCourses(tenantId, pageable);
    }

    @Transactional(readOnly = true)
    public Optional<Course> getCourseById(UUID tenantId, UUID id) {
        return courseRepository.findByIdAndTenantId(id, tenantId);
    }

    @Transactional(readOnly = true)
    public Page<Course> searchCourses(UUID tenantId, String search, Pageable pageable) {
        return courseRepository.searchCourses(tenantId, search, pageable);
    }

    @Transactional
    public void publishCourse(UUID tenantId, UUID courseId) {
        courseRepository.findByIdAndTenantId(courseId, tenantId)
                .ifPresent(course -> {
                    course.setStatus(CourseStatus.PUBLISHED);
                    course.setUpdatedAt(LocalDateTime.now());
                    courseRepository.save(course);
                    log.info("Published course: {}", courseId);
                });
    }

    @Transactional
    public void archiveCourse(UUID tenantId, UUID courseId) {
        courseRepository.findByIdAndTenantId(courseId, tenantId)
                .ifPresent(course -> {
                    course.setStatus(CourseStatus.ARCHIVED);
                    course.setUpdatedAt(LocalDateTime.now());
                    courseRepository.save(course);
                    log.info("Archived course: {}", courseId);
                });
    }

    @Transactional
    public void deleteCourse(UUID tenantId, UUID id) {
        courseRepository.findByIdAndTenantId(id, tenantId)
                .ifPresent(course -> {
                    // Delete all related data
                    List<CourseModule> modules = moduleRepository.findByCourseOrdered(tenantId, id);
                    for (CourseModule module : modules) {
                        contentRepository.deleteAllByModuleId(module.getId());
                    }
                    moduleRepository.deleteAllByCourseId(id);
                    courseRepository.delete(course);
                    log.info("Deleted course: {}", id);
                });
    }

    // ================== Modules ==================

    @Transactional
    public CourseModule createModule(CourseModule module) {
        if (module.getId() == null) {
            module.setId(UUID.randomUUID());
        }
        if (module.getCreatedAt() == null) {
            module.setCreatedAt(LocalDateTime.now());
        }

        log.info("Creating module: {} for course: {}", module.getTitle(), module.getCourseId());
        return moduleRepository.save(module);
    }

    @Transactional
    public CourseModule updateModule(CourseModule module) {
        module.setUpdatedAt(LocalDateTime.now());
        return moduleRepository.save(module);
    }

    @Transactional(readOnly = true)
    public List<CourseModule> getModulesByCourse(UUID tenantId, UUID courseId) {
        return moduleRepository.findByCourseOrdered(tenantId, courseId);
    }

    @Transactional(readOnly = true)
    public Optional<CourseModule> getModuleById(UUID tenantId, UUID id) {
        return moduleRepository.findByIdAndTenantId(id, tenantId);
    }

    @Transactional
    public void deleteModule(UUID tenantId, UUID id) {
        moduleRepository.findByIdAndTenantId(id, tenantId)
                .ifPresent(module -> {
                    contentRepository.deleteAllByModuleId(id);
                    moduleRepository.delete(module);
                    log.info("Deleted module: {}", id);
                });
    }

    // ================== Content ==================

    @Transactional
    public ModuleContent createContent(ModuleContent content) {
        if (content.getId() == null) {
            content.setId(UUID.randomUUID());
        }
        if (content.getCreatedAt() == null) {
            content.setCreatedAt(LocalDateTime.now());
        }

        log.info("Creating content: {} for module: {}", content.getTitle(), content.getModuleId());
        return contentRepository.save(content);
    }

    @Transactional
    public ModuleContent updateContent(ModuleContent content) {
        content.setUpdatedAt(LocalDateTime.now());
        return contentRepository.save(content);
    }

    @Transactional(readOnly = true)
    public List<ModuleContent> getContentByModule(UUID tenantId, UUID moduleId) {
        return contentRepository.findByModuleOrdered(tenantId, moduleId);
    }

    @Transactional(readOnly = true)
    public Optional<ModuleContent> getContentById(UUID tenantId, UUID id) {
        return contentRepository.findByIdAndTenantId(id, tenantId);
    }

    @Transactional
    public void deleteContent(UUID tenantId, UUID id) {
        contentRepository.findByIdAndTenantId(id, tenantId)
                .ifPresent(content -> {
                    contentRepository.delete(content);
                    log.info("Deleted content: {}", id);
                });
    }

    // ================== Enrollments ==================

    @Transactional
    public CourseEnrollment enrollEmployee(UUID tenantId, UUID courseId, UUID employeeId, UUID enrolledBy) {
        // Check if already enrolled
        Optional<CourseEnrollment> existing = enrollmentRepository
                .findByCourseIdAndEmployeeIdAndTenantId(courseId, employeeId, tenantId);

        if (existing.isPresent()) {
            return existing.get();
        }

        CourseEnrollment enrollment = CourseEnrollment.builder()
                .courseId(courseId)
                .employeeId(employeeId)
                .status(EnrollmentStatus.ENROLLED)
                .enrolledAt(LocalDateTime.now())
                .progressPercentage(BigDecimal.ZERO)
                .totalTimeSpentMinutes(0)
                .quizAttempts(0)
                .enrolledBy(enrolledBy)
                .build();
        enrollment.setId(UUID.randomUUID());
        enrollment.setTenantId(tenantId);

        // Update course enrollment count
        courseRepository.findByIdAndTenantId(courseId, tenantId)
                .ifPresent(course -> {
                    course.setTotalEnrollments(course.getTotalEnrollments() + 1);
                    courseRepository.save(course);
                });

        log.info("Enrolled employee: {} in course: {}", employeeId, courseId);
        return enrollmentRepository.save(enrollment);
    }

    @Transactional
    public CourseEnrollment updateEnrollmentProgress(UUID tenantId, UUID enrollmentId) {
        return enrollmentRepository.findByIdAndTenantId(enrollmentId, tenantId)
                .map(enrollment -> {
                    // Get all modules for the course
                    List<CourseModule> modules = moduleRepository.findByCourseOrdered(tenantId,
                            enrollment.getCourseId());

                    // Get all content items
                    int totalContent = 0;
                    int completedContent = 0;

                    for (CourseModule module : modules) {
                        List<ModuleContent> contents = contentRepository.findByModuleOrdered(tenantId, module.getId());
                        totalContent += contents.size();

                        for (ModuleContent content : contents) {
                            Optional<ContentProgress> progress = progressRepository
                                    .findByEnrollmentIdAndContentIdAndTenantId(enrollmentId, content.getId(), tenantId);
                            if (progress.isPresent() && progress.get().getStatus() == ProgressStatus.COMPLETED) {
                                completedContent++;
                            }
                        }
                    }

                    // Calculate progress percentage
                    BigDecimal progressPercentage = totalContent > 0
                            ? BigDecimal.valueOf(completedContent * 100.0 / totalContent)
                                    .setScale(2, RoundingMode.HALF_UP)
                            : BigDecimal.ZERO;

                    enrollment.setProgressPercentage(progressPercentage);

                    // Check if completed
                    if (progressPercentage.compareTo(BigDecimal.valueOf(100)) >= 0) {
                        enrollment.setStatus(EnrollmentStatus.COMPLETED);
                        enrollment.setCompletedAt(LocalDateTime.now());
                    } else if (progressPercentage.compareTo(BigDecimal.ZERO) > 0) {
                        enrollment.setStatus(EnrollmentStatus.IN_PROGRESS);
                    }

                    enrollment.setLastAccessedAt(LocalDateTime.now());
                    enrollment.setUpdatedAt(LocalDateTime.now());

                    return enrollmentRepository.save(enrollment);
                })
                .orElseThrow(() -> new RuntimeException("Enrollment not found: " + enrollmentId));
    }

    @Transactional(readOnly = true)
    public List<CourseEnrollment> getEmployeeEnrollments(UUID tenantId, UUID employeeId) {
        return enrollmentRepository.findByEmployee(tenantId, employeeId);
    }

    @Transactional(readOnly = true)
    public Optional<CourseEnrollment> getEnrollmentById(UUID tenantId, UUID id) {
        return enrollmentRepository.findByIdAndTenantId(id, tenantId);
    }

    @Transactional(readOnly = true)
    public Optional<CourseEnrollment> getEnrollment(UUID tenantId, UUID courseId, UUID employeeId) {
        return enrollmentRepository.findByCourseIdAndEmployeeIdAndTenantId(courseId, employeeId, tenantId);
    }

    // ================== Progress ==================

    @Transactional
    public ContentProgress updateContentProgress(UUID tenantId, UUID enrollmentId, UUID contentId,
            ProgressStatus status, Integer timeSpentSeconds) {
        ContentProgress progress = progressRepository
                .findByEnrollmentIdAndContentIdAndTenantId(enrollmentId, contentId, tenantId)
                .orElseGet(() -> {
                    // Get module ID from content
                    ModuleContent content = contentRepository.findByIdAndTenantId(contentId, tenantId)
                            .orElseThrow(() -> new RuntimeException("Content not found: " + contentId));

                    ContentProgress newProgress = ContentProgress.builder()
                            .enrollmentId(enrollmentId)
                            .contentId(contentId)
                            .moduleId(content.getModuleId())
                            .status(ProgressStatus.NOT_STARTED)
                            .progressPercentage(BigDecimal.ZERO)
                            .timeSpentSeconds(0)
                            .build();
                    newProgress.setId(UUID.randomUUID());
                    newProgress.setTenantId(tenantId);
                    return newProgress;
                });

        if (status == ProgressStatus.IN_PROGRESS && progress.getStartedAt() == null) {
            progress.setStartedAt(LocalDateTime.now());
        }

        if (status == ProgressStatus.COMPLETED) {
            progress.setCompletedAt(LocalDateTime.now());
            progress.setProgressPercentage(BigDecimal.valueOf(100));
        }

        progress.setStatus(status);
        if (timeSpentSeconds != null) {
            progress.setTimeSpentSeconds(progress.getTimeSpentSeconds() + timeSpentSeconds);
        }
        progress.setUpdatedAt(LocalDateTime.now());

        ContentProgress saved = progressRepository.save(progress);

        // Update enrollment progress
        updateEnrollmentProgress(tenantId, enrollmentId);

        return saved;
    }

    @Transactional(readOnly = true)
    public List<ContentProgress> getProgressByEnrollment(UUID tenantId, UUID enrollmentId) {
        return progressRepository.findByEnrollment(tenantId, enrollmentId);
    }

    // ================== Certificates ==================

    @Transactional
    public Certificate issueCertificate(UUID tenantId, UUID enrollmentId, UUID issuerId) {
        CourseEnrollment enrollment = enrollmentRepository.findByIdAndTenantId(enrollmentId, tenantId)
                .orElseThrow(() -> new RuntimeException("Enrollment not found: " + enrollmentId));

        // Check if already has certificate
        Optional<Certificate> existing = certificateRepository.findByEnrollmentIdAndTenantId(enrollmentId, tenantId);
        if (existing.isPresent()) {
            return existing.get();
        }

        Course course = courseRepository.findByIdAndTenantId(enrollment.getCourseId(), tenantId)
                .orElseThrow(() -> new RuntimeException("Course not found"));

        Certificate certificate = new Certificate();
        certificate.setCertificateNumber("CERT-" + System.currentTimeMillis());
        certificate.setCourseId(enrollment.getCourseId());
        certificate.setEmployeeId(enrollment.getEmployeeId());
        certificate.setEnrollmentId(enrollmentId);
        certificate.setCourseTitle(course.getTitle());
        certificate.setIssuedAt(LocalDateTime.now());
        certificate.setIsActive(true);
        certificate.setScoreAchieved(enrollment.getQuizScore() != null ? enrollment.getQuizScore().intValue() : null);
        certificate.setIssuedBy(issuerId);

        certificate.setId(UUID.randomUUID());
        certificate.setTenantId(tenantId);

        // Update enrollment
        enrollment.setCertificateId(certificate.getId());
        enrollment.setCertificateIssuedAt(LocalDateTime.now());
        enrollmentRepository.save(enrollment);

        log.info("Issued certificate: {} for enrollment: {}", certificate.getCertificateNumber(), enrollmentId);
        return certificateRepository.save(certificate);
    }

    @Transactional(readOnly = true)
    public List<Certificate> getEmployeeCertificates(UUID tenantId, UUID employeeId) {
        return certificateRepository.findActiveByEmployee(tenantId, employeeId);
    }

    @Transactional(readOnly = true)
    public Optional<Certificate> getCertificateById(UUID tenantId, UUID id) {
        return certificateRepository.findByIdAndTenantId(id, tenantId);
    }

    @Transactional(readOnly = true)
    public Optional<Certificate> verifyCertificate(String certificateNumber) {
        return certificateRepository.findByCertificateNumber(certificateNumber);
    }

    // ================== Dashboard ==================

    @Transactional(readOnly = true)
    public Map<String, Object> getEmployeeDashboard(UUID tenantId, UUID employeeId) {
        Map<String, Object> dashboard = new HashMap<>();

        List<CourseEnrollment> enrollments = enrollmentRepository.findByEmployee(tenantId, employeeId);

        long totalEnrollments = enrollments.size();
        long inProgress = enrollments.stream().filter(e -> e.getStatus() == EnrollmentStatus.IN_PROGRESS).count();
        long completed = enrollments.stream().filter(e -> e.getStatus() == EnrollmentStatus.COMPLETED).count();

        Double avgProgress = enrollmentRepository.getAverageProgressForEmployee(tenantId, employeeId);
        Long certificateCount = certificateRepository.countActiveByEmployee(tenantId, employeeId);

        dashboard.put("totalEnrollments", totalEnrollments);
        dashboard.put("inProgress", inProgress);
        dashboard.put("completed", completed);
        dashboard.put("averageProgress", avgProgress != null ? avgProgress : 0);
        dashboard.put("certificatesEarned", certificateCount);
        dashboard.put("recentEnrollments", enrollments.stream().limit(5).toList());

        return dashboard;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getAdminDashboard(UUID tenantId) {
        Map<String, Object> dashboard = new HashMap<>();

        Page<Course> allCourses = courseRepository.findAllByTenantId(tenantId, Pageable.unpaged());
        Page<Course> publishedCourses = courseRepository.findPublishedCourses(tenantId, Pageable.unpaged());

        dashboard.put("totalCourses", allCourses.getTotalElements());
        dashboard.put("publishedCourses", publishedCourses.getTotalElements());
        dashboard.put("mandatoryCourses", courseRepository.findMandatoryCourses(tenantId).size());

        return dashboard;
    }
}
