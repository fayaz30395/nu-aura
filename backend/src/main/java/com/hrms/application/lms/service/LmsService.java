package com.hrms.application.lms.service;

import com.hrms.api.lms.dto.CourseCatalogResponse;
import com.hrms.api.lms.dto.CourseCatalogResponse.CourseSummaryDto;
import com.hrms.common.exception.ResourceNotFoundException;
import com.hrms.domain.lms.*;
import com.hrms.domain.lms.Course.CourseStatus;
import com.hrms.domain.lms.CourseEnrollment.EnrollmentStatus;
import com.hrms.domain.lms.ContentProgress.ProgressStatus;
import com.hrms.infrastructure.lms.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class LmsService {

    private final CourseRepository courseRepository;
    private final CourseModuleRepository moduleRepository;
    private final ModuleContentRepository contentRepository;
    private final CourseEnrollmentRepository enrollmentRepository;
    private final ContentProgressRepository progressRepository;
    private final CertificateRepository certificateRepository;

    // ================== Course Management ==================

    @Transactional
    public Course createCourse(Course course) {
        course.setStatus(CourseStatus.DRAFT);
        course.setCreatedAt(LocalDateTime.now());
        course.setTotalEnrollments(0);
        course.setTotalRatings(0);
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

    public void publishCourse(UUID tenantId, UUID id) {
        courseRepository.findByIdAndTenantId(id, tenantId).ifPresent(course -> {
            course.setStatus(CourseStatus.PUBLISHED);
            courseRepository.save(course);
        });
    }

    public void archiveCourse(UUID tenantId, UUID id) {
        courseRepository.findByIdAndTenantId(id, tenantId).ifPresent(course -> {
            course.setStatus(CourseStatus.ARCHIVED);
            courseRepository.save(course);
        });
    }

    @Transactional
    public void deleteCourse(UUID tenantId, UUID id) {
        courseRepository.findByIdAndTenantId(id, tenantId).ifPresent(course -> {
            // Delete sub-resources
            List<CourseModule> modules = moduleRepository.findByCourseOrdered(tenantId, id);
            for (CourseModule module : modules) {
                contentRepository.deleteAllByModuleId(module.getId());
            }
            moduleRepository.deleteAllByCourseId(id);
            courseRepository.delete(course);
        });
    }

    // ================== Module Management ==================

    @Transactional
    public CourseModule createModule(CourseModule module) {
        module.setCreatedAt(LocalDateTime.now());
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
        moduleRepository.findByIdAndTenantId(id, tenantId).ifPresent(module -> {
            contentRepository.deleteAllByModuleId(id);
            moduleRepository.delete(module);
        });
    }

    // ================== Content Management ==================

    @Transactional
    public ModuleContent createContent(ModuleContent content) {
        content.setCreatedAt(LocalDateTime.now());
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
        contentRepository.findByIdAndTenantId(id, tenantId).ifPresent(contentRepository::delete);
    }

    // ================== Enrollment & Progress ==================

    public CourseEnrollment enrollEmployee(UUID tenantId, UUID courseId, UUID employeeId, UUID enrolledBy) {
        Optional<CourseEnrollment> existing = enrollmentRepository.findByCourseIdAndEmployeeIdAndTenantId(courseId,
                employeeId, tenantId);
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

        courseRepository.findByIdAndTenantId(courseId, tenantId).ifPresent(course -> {
            course.setTotalEnrollments(course.getTotalEnrollments() + 1);
            courseRepository.save(course);
        });

        return saved;
    }

    @Transactional
    public CourseEnrollment updateEnrollmentProgress(UUID tenantId, UUID enrollmentId) {
        CourseEnrollment enrollment = enrollmentRepository.findByIdAndTenantId(enrollmentId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Enrollment not found: " + enrollmentId));

        // Calculate progress based on content completions
        List<CourseModule> modules = moduleRepository.findByCourseOrdered(tenantId, enrollment.getCourseId());
        long totalContent = 0;
        long completedContent = 0;

        for (CourseModule module : modules) {
            List<ModuleContent> contents = contentRepository.findByModuleOrdered(tenantId, module.getId());
            totalContent += contents.stream().filter(ModuleContent::getIsMandatory).count();

            for (ModuleContent content : contents) {
                if (content.getIsMandatory()) {
                    Optional<ContentProgress> progress = progressRepository
                            .findByEnrollmentIdAndContentIdAndTenantId(enrollmentId, content.getId(), tenantId);
                    if (progress.isPresent() && progress.get().getStatus() == ProgressStatus.COMPLETED) {
                        completedContent++;
                    }
                }
            }
        }

        if (totalContent > 0) {
            double percentage = (double) completedContent / totalContent * 100;
            enrollment.setProgressPercentage(BigDecimal.valueOf(percentage));
            if (percentage >= 100) {
                enrollment.setStatus(EnrollmentStatus.COMPLETED);
                enrollment.setCompletedAt(LocalDateTime.now());
            } else if (percentage > 0 && enrollment.getStatus() == EnrollmentStatus.ENROLLED) {
                enrollment.setStatus(EnrollmentStatus.IN_PROGRESS);
                enrollment.setStartedAt(LocalDateTime.now());
            }
        }

        return enrollmentRepository.save(enrollment);
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

    @Transactional
    public ContentProgress updateContentProgress(UUID tenantId, UUID enrollmentId, UUID contentId,
            ProgressStatus status, int timeSpentSeconds) {
        ContentProgress progress = progressRepository
                .findByEnrollmentIdAndContentIdAndTenantId(enrollmentId, contentId, tenantId)
                .orElseGet(() -> {
                    ModuleContent content = contentRepository.findByIdAndTenantId(contentId, tenantId)
                            .orElseThrow(() -> new ResourceNotFoundException("Content not found: " + contentId));
                    ContentProgress newProgress = ContentProgress.builder()
                            .enrollmentId(enrollmentId)
                            .contentId(contentId)
                            .moduleId(content.getModuleId())
                            .status(ProgressStatus.NOT_STARTED)
                            .timeSpentSeconds(0)
                            .build();
                    newProgress.setTenantId(tenantId);
                    return newProgress;
                });

        progress.setStatus(status);
        progress.setTimeSpentSeconds(progress.getTimeSpentSeconds() + timeSpentSeconds);

        if (status == ProgressStatus.IN_PROGRESS && progress.getStartedAt() == null) {
            progress.setStartedAt(LocalDateTime.now());
        }

        if (status == ProgressStatus.COMPLETED) {
            progress.setCompletedAt(LocalDateTime.now());
            progress.setProgressPercentage(BigDecimal.valueOf(100));
        }

        ContentProgress saved = progressRepository.save(progress);
        updateEnrollmentProgress(tenantId, enrollmentId);
        return saved;
    }

    @Transactional(readOnly = true)
    public List<ContentProgress> getProgressByEnrollment(UUID tenantId, UUID enrollmentId) {
        return progressRepository.findByEnrollment(tenantId, enrollmentId);
    }

    // ================== Certificates ==================

    public Certificate issueCertificate(UUID tenantId, UUID enrollmentId, UUID issuedBy) {
        CourseEnrollment enrollment = enrollmentRepository.findByIdAndTenantId(enrollmentId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Enrollment not found: " + enrollmentId));

        Optional<Certificate> existing = certificateRepository.findByEnrollmentIdAndTenantId(enrollmentId, tenantId);
        if (existing.isPresent()) {
            return existing.get();
        }

        Course course = courseRepository.findByIdAndTenantId(enrollment.getCourseId(), tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found: " + enrollment.getCourseId()));

        Certificate certificate = Certificate.builder()
                .certificateNumber("CERT-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .courseId(enrollment.getCourseId())
                .courseTitle(course.getTitle())
                .employeeId(enrollment.getEmployeeId())
                .enrollmentId(enrollmentId)
                .issuedAt(LocalDateTime.now())
                .issuedBy(issuedBy)
                .isActive(true)
                .scoreAchieved(enrollment.getQuizScore() != null ? enrollment.getQuizScore().intValue() : null)
                .build();
        certificate.setTenantId(tenantId);

        Certificate saved = certificateRepository.save(certificate);

        enrollment.setCertificateId(saved.getId());
        enrollment.setCertificateIssuedAt(LocalDateTime.now());
        enrollmentRepository.save(enrollment);

        return saved;
    }

    @Transactional(readOnly = true)
    public List<Certificate> getEmployeeCertificates(UUID tenantId, UUID employeeId) {
        return certificateRepository.findActiveByEmployee(tenantId, employeeId);
    }

    @Transactional(readOnly = true)
    public Optional<Certificate> getCertificateById(UUID tenantId, UUID id) {
        return certificateRepository.findByIdAndTenantId(id, tenantId);
    }

    public Optional<Certificate> verifyCertificate(String certificateNumber) {
        return certificateRepository.findByCertificateNumber(certificateNumber);
    }

    // ================== Dashboards ==================

    @Transactional(readOnly = true)
    public Map<String, Object> getEmployeeDashboard(UUID tenantId, UUID employeeId) {
        List<CourseEnrollment> enrollments = getEmployeeEnrollments(tenantId, employeeId);
        Double avgProgress = enrollmentRepository.getAverageProgressForEmployee(tenantId, employeeId);
        long certCount = certificateRepository.countActiveByEmployee(tenantId, employeeId);

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalEnrollments", (long) enrollments.size());
        stats.put("inProgress",
                enrollments.stream().filter(e -> e.getStatus() == EnrollmentStatus.IN_PROGRESS).count());
        stats.put("completed", enrollments.stream().filter(e -> e.getStatus() == EnrollmentStatus.COMPLETED).count());
        stats.put("averageProgress", avgProgress != null ? avgProgress : 0.0);
        stats.put("certificatesEarned", certCount);

        return stats;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getAdminDashboard(UUID tenantId) {
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalCourses", courseRepository.count()); // Simplification
        stats.put("publishedCourses", courseRepository.count()); // Simplification
        stats.put("mandatoryCourses", courseRepository.findMandatoryCourses(tenantId).size());
        return stats;
    }

    // Catalog Mapping (from previous implementation)
    @Transactional(readOnly = true)
    public CourseCatalogResponse getCourseCatalog(UUID tenantId, int page, int size) {
        Page<Course> coursePage = courseRepository.findPublishedCourses(tenantId, PageRequest.of(page, size));
        List<CourseSummaryDto> dtos = coursePage.getContent().stream()
                .map(this::mapToSummaryDto)
                .collect(Collectors.toList());
        return CourseCatalogResponse.builder().courses(dtos).build();
    }

    private CourseSummaryDto mapToSummaryDto(Course course) {
        return CourseSummaryDto.builder()
                .id(course.getId())
                .title(course.getTitle())
                .code(course.getCode())
                .shortDescription(course.getShortDescription())
                .thumbnailUrl(course.getThumbnailUrl())
                .difficultyLevel(course.getDifficultyLevel().name())
                .durationHours(course.getDurationHours())
                .skillsCovered(course.getSkillsCovered() != null ? Arrays.asList(course.getSkillsCovered().split(","))
                        : List.of())
                .isMandatory(course.getIsMandatory())
                .totalEnrollments(course.getTotalEnrollments())
                .avgRating(course.getAvgRating())
                .build();
    }
}
