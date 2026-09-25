package com.nulogic.application.lms.service;

import com.nulogic.domain.lms.*;
import com.nulogic.domain.lms.ContentProgress.ProgressStatus;
import com.nulogic.domain.lms.Course.CourseStatus;
import com.nulogic.domain.lms.Course.DifficultyLevel;
import com.nulogic.domain.lms.CourseEnrollment.EnrollmentStatus;
import com.nulogic.common.security.TenantContext;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.lms.ModuleContent.ContentType;
import com.nulogic.infrastructure.lms.repository.*;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LmsServiceTest {

    @Mock
    private CourseRepository courseRepository;

    @Mock
    private CourseModuleRepository moduleRepository;

    @Mock
    private ModuleContentRepository contentRepository;

    @Mock
    private CourseEnrollmentRepository enrollmentRepository;

    @Mock
    private ContentProgressRepository progressRepository;

    @Mock
    private CertificateRepository certificateRepository;

    @Mock
    private LearningPathRepository learningPathRepository;

    @Mock
    private LearningPathCourseRepository learningPathCourseRepository;

    @Mock
    private TenantTimeService tenantTimeService;

    @InjectMocks
    private LmsService lmsService;

    private UUID tenantId;
    private UUID courseId;
    private UUID moduleId;
    private UUID contentId;
    private UUID employeeId;
    private UUID enrollmentId;
    private LocalDateTime now;
    private Course testCourse;
    private CourseModule testModule;
    private ModuleContent testContent;
    private CourseEnrollment testEnrollment;

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
        courseId = UUID.randomUUID();
        moduleId = UUID.randomUUID();
        contentId = UUID.randomUUID();
        employeeId = UUID.randomUUID();
        enrollmentId = UUID.randomUUID();
        now = LocalDateTime.of(2026, 1, 15, 9, 30);
        TenantContext.setCurrentTenant(tenantId);
        lenient().when(tenantTimeService.now(tenantId)).thenReturn(now);

        testCourse = createTestCourse();
        testModule = createTestModule();
        testContent = createTestContent();
        testEnrollment = createTestEnrollment();
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    private Course createTestCourse() {
        Course course = Course.builder()
                .title("Java Fundamentals")
                .code("JAVA-101")
                .description("Learn Java programming from scratch")
                .shortDescription("Java basics course")
                .difficultyLevel(DifficultyLevel.BEGINNER)
                .durationHours(BigDecimal.valueOf(40))
                .passingScore(70)
                .maxAttempts(3)
                .isMandatory(false)
                .isSelfPaced(true)
                .isCertificateEnabled(true)
                .totalEnrollments(0)
                .totalRatings(0)
                .status(CourseStatus.DRAFT)
                .build();
        course.setId(courseId);
        course.setTenantId(tenantId);
        course.setCreatedAt(LocalDateTime.now());
        return course;
    }

    private CourseModule createTestModule() {
        CourseModule module = CourseModule.builder()
                .courseId(courseId)
                .title("Introduction to Java")
                .description("Basic concepts of Java programming")
                .orderIndex(1)
                .durationMinutes(120)
                .isMandatory(true)
                .build();
        module.setId(moduleId);
        module.setTenantId(tenantId);
        module.setCreatedAt(LocalDateTime.now());
        return module;
    }

    private ModuleContent createTestContent() {
        ModuleContent content = ModuleContent.builder()
                .moduleId(moduleId)
                .title("What is Java?")
                .contentType(ContentType.VIDEO)
                .orderIndex(1)
                .durationMinutes(30)
                .videoUrl("https://example.com/video.mp4")
                .isMandatory(true)
                .completionRequired(true)
                .build();
        content.setId(contentId);
        content.setTenantId(tenantId);
        content.setCreatedAt(LocalDateTime.now());
        return content;
    }

    private CourseEnrollment createTestEnrollment() {
        CourseEnrollment enrollment = CourseEnrollment.builder()
                .courseId(courseId)
                .employeeId(employeeId)
                .status(EnrollmentStatus.ENROLLED)
                .enrolledAt(LocalDateTime.now())
                .progressPercentage(BigDecimal.ZERO)
                .totalTimeSpentMinutes(0)
                .quizAttempts(0)
                .enrolledBy(employeeId)
                .build();
        enrollment.setId(enrollmentId);
        enrollment.setTenantId(tenantId);
        return enrollment;
    }

    // ================== Course Tests ==================

    @Test
    void createCourse_Success() {
        Course newCourse = Course.builder()
                .title("Python Basics")
                .code("PY-101")
                .build();
        newCourse.setTenantId(tenantId);

        when(courseRepository.save(any(Course.class))).thenAnswer(invocation -> {
            Course saved = invocation.getArgument(0);
            if (saved.getId() == null) {
                saved.setId(UUID.randomUUID());
            }
            return saved;
        });

        Course result = lmsService.createCourse(newCourse);

        assertNotNull(result.getId());
        assertEquals(CourseStatus.DRAFT, result.getStatus());
        assertNotNull(result.getCreatedAt());
        verify(courseRepository).save(any(Course.class));
    }

    @Test
    void updateCourse_Success() {
        testCourse.setTitle("Advanced Java");

        when(courseRepository.save(any(Course.class))).thenReturn(testCourse);

        Course result = lmsService.updateCourse(testCourse);

        assertEquals("Advanced Java", result.getTitle());
        assertNotNull(result.getUpdatedAt());
    }

    @Test
    void getAllCourses_Success() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<Course> expectedPage = new PageImpl<>(List.of(testCourse), pageable, 1);

        when(courseRepository.findAllByTenantId(tenantId, pageable)).thenReturn(expectedPage);

        Page<Course> result = lmsService.getAllCourses(tenantId, pageable);

        assertEquals(1, result.getTotalElements());
    }

    @Test
    void getPublishedCourses_Success() {
        testCourse.setStatus(CourseStatus.PUBLISHED);
        Pageable pageable = PageRequest.of(0, 10);
        Page<Course> expectedPage = new PageImpl<>(List.of(testCourse), pageable, 1);

        when(courseRepository.findPublishedCourses(tenantId, pageable)).thenReturn(expectedPage);

        Page<Course> result = lmsService.getPublishedCourses(tenantId, pageable);

        assertEquals(1, result.getTotalElements());
    }

    @Test
    void getCourseById_Success() {
        when(courseRepository.findByIdAndTenantId(courseId, tenantId))
                .thenReturn(Optional.of(testCourse));

        Optional<Course> result = lmsService.getCourseById(tenantId, courseId);

        assertTrue(result.isPresent());
        assertEquals(testCourse.getTitle(), result.get().getTitle());
    }

    @Test
    void searchCourses_Success() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<Course> expectedPage = new PageImpl<>(List.of(testCourse), pageable, 1);

        when(courseRepository.searchCourses(tenantId, "Java", pageable)).thenReturn(expectedPage);

        Page<Course> result = lmsService.searchCourses(tenantId, "Java", pageable);

        assertEquals(1, result.getTotalElements());
    }

    @Test
    void publishCourse_Success() {
        when(courseRepository.findByIdAndTenantId(courseId, tenantId))
                .thenReturn(Optional.of(testCourse));
        when(courseRepository.save(any(Course.class))).thenReturn(testCourse);

        lmsService.publishCourse(tenantId, courseId);

        assertEquals(CourseStatus.PUBLISHED, testCourse.getStatus());
        verify(courseRepository).save(testCourse);
    }

    @Test
    void archiveCourse_Success() {
        when(courseRepository.findByIdAndTenantId(courseId, tenantId))
                .thenReturn(Optional.of(testCourse));
        when(courseRepository.save(any(Course.class))).thenReturn(testCourse);

        lmsService.archiveCourse(tenantId, courseId);

        assertEquals(CourseStatus.ARCHIVED, testCourse.getStatus());
    }

    @Test
    void deleteCourse_Success() {
        when(courseRepository.findByIdAndTenantId(courseId, tenantId))
                .thenReturn(Optional.of(testCourse));
        when(moduleRepository.findByCourseOrdered(tenantId, courseId))
                .thenReturn(List.of(testModule));

        lmsService.deleteCourse(tenantId, courseId);

        verify(contentRepository).deleteAllByModuleId(moduleId);
        verify(moduleRepository).deleteAllByCourseId(courseId);
        verify(courseRepository).delete(testCourse);
    }

    // ================== Module Tests ==================

    @Test
    void createModule_Success() {
        CourseModule newModule = CourseModule.builder()
                .courseId(courseId)
                .title("New Module")
                .build();
        newModule.setTenantId(tenantId);

        when(moduleRepository.save(any(CourseModule.class))).thenAnswer(invocation -> {
            CourseModule saved = invocation.getArgument(0);
            if (saved.getId() == null) {
                saved.setId(UUID.randomUUID());
            }
            return saved;
        });

        CourseModule result = lmsService.createModule(newModule);

        assertNotNull(result.getId());
        assertNotNull(result.getCreatedAt());
    }

    @Test
    void updateModule_Success() {
        testModule.setTitle("Updated Module");

        when(moduleRepository.save(any(CourseModule.class))).thenReturn(testModule);

        CourseModule result = lmsService.updateModule(testModule);

        assertEquals("Updated Module", result.getTitle());
        assertNotNull(result.getUpdatedAt());
    }

    @Test
    void getModulesByCourse_Success() {
        when(moduleRepository.findByCourseOrdered(tenantId, courseId))
                .thenReturn(List.of(testModule));

        List<CourseModule> result = lmsService.getModulesByCourse(tenantId, courseId);

        assertEquals(1, result.size());
    }

    @Test
    void getModuleById_Success() {
        when(moduleRepository.findByIdAndTenantId(moduleId, tenantId))
                .thenReturn(Optional.of(testModule));

        Optional<CourseModule> result = lmsService.getModuleById(tenantId, moduleId);

        assertTrue(result.isPresent());
    }

    @Test
    void deleteModule_Success() {
        when(moduleRepository.findByIdAndTenantId(moduleId, tenantId))
                .thenReturn(Optional.of(testModule));

        lmsService.deleteModule(tenantId, moduleId);

        verify(contentRepository).deleteAllByModuleId(moduleId);
        verify(moduleRepository).delete(testModule);
    }

    // ================== Content Tests ==================

    @Test
    void createContent_Success() {
        ModuleContent newContent = ModuleContent.builder()
                .moduleId(moduleId)
                .title("New Content")
                .contentType(ContentType.TEXT)
                .build();
        newContent.setTenantId(tenantId);

        when(contentRepository.save(any(ModuleContent.class))).thenAnswer(invocation -> {
            ModuleContent saved = invocation.getArgument(0);
            if (saved.getId() == null) {
                saved.setId(UUID.randomUUID());
            }
            return saved;
        });

        ModuleContent result = lmsService.createContent(newContent);

        assertNotNull(result.getId());
        assertNotNull(result.getCreatedAt());
    }

    @Test
    void updateContent_Success() {
        testContent.setTitle("Updated Content");

        when(contentRepository.save(any(ModuleContent.class))).thenReturn(testContent);

        ModuleContent result = lmsService.updateContent(testContent);

        assertEquals("Updated Content", result.getTitle());
    }

    @Test
    void getContentByModule_Success() {
        when(contentRepository.findByModuleOrdered(tenantId, moduleId))
                .thenReturn(List.of(testContent));

        List<ModuleContent> result = lmsService.getContentByModule(tenantId, moduleId);

        assertEquals(1, result.size());
    }

    @Test
    void getContentById_Success() {
        when(contentRepository.findByIdAndTenantId(contentId, tenantId))
                .thenReturn(Optional.of(testContent));

        Optional<ModuleContent> result = lmsService.getContentById(tenantId, contentId);

        assertTrue(result.isPresent());
    }

    @Test
    void deleteContent_Success() {
        when(contentRepository.findByIdAndTenantId(contentId, tenantId))
                .thenReturn(Optional.of(testContent));

        lmsService.deleteContent(tenantId, contentId);

        verify(contentRepository).delete(testContent);
    }

    // ================== Enrollment Tests ==================

    @Test
    void enrollEmployee_NewEnrollment_Success() {
        UUID enrolledBy = UUID.randomUUID();

        when(enrollmentRepository.findByCourseIdAndEmployeeIdAndTenantId(courseId, employeeId, tenantId))
                .thenReturn(Optional.empty());
        when(courseRepository.findByIdAndTenantId(courseId, tenantId))
                .thenReturn(Optional.of(testCourse));
        when(courseRepository.save(any(Course.class))).thenReturn(testCourse);
        when(enrollmentRepository.save(any(CourseEnrollment.class))).thenAnswer(invocation -> {
            CourseEnrollment saved = invocation.getArgument(0);
            saved.setId(UUID.randomUUID());
            return saved;
        });

        CourseEnrollment result = lmsService.enrollEmployee(tenantId, courseId, employeeId, enrolledBy);

        assertNotNull(result.getId());
        assertEquals(EnrollmentStatus.ENROLLED, result.getStatus());
        assertEquals(1, testCourse.getTotalEnrollments());
        verify(enrollmentRepository).save(any(CourseEnrollment.class));
    }

    @Test
    void enrollEmployee_AlreadyEnrolled_ReturnsExisting() {
        when(enrollmentRepository.findByCourseIdAndEmployeeIdAndTenantId(courseId, employeeId, tenantId))
                .thenReturn(Optional.of(testEnrollment));

        CourseEnrollment result = lmsService.enrollEmployee(tenantId, courseId, employeeId, employeeId);

        assertEquals(testEnrollment.getId(), result.getId());
        verify(enrollmentRepository, never()).save(any(CourseEnrollment.class));
    }

    @Test
    void updateEnrollmentProgress_Success() {
        ContentProgress completedProgress = ContentProgress.builder()
                .enrollmentId(enrollmentId)
                .contentId(contentId)
                .status(ProgressStatus.COMPLETED)
                .build();
        completedProgress.setId(UUID.randomUUID());
        completedProgress.setTenantId(tenantId);

        when(enrollmentRepository.findByIdAndTenantId(enrollmentId, tenantId))
                .thenReturn(Optional.of(testEnrollment));
        when(moduleRepository.findByCourseOrdered(tenantId, courseId))
                .thenReturn(List.of(testModule));
        when(contentRepository.findAllByModuleIdInAndTenantId(Set.of(moduleId), tenantId))
                .thenReturn(List.of(testContent));
        when(progressRepository.findByEnrollment(tenantId, enrollmentId))
                .thenReturn(List.of(completedProgress));
        when(enrollmentRepository.save(any(CourseEnrollment.class))).thenReturn(testEnrollment);

        CourseEnrollment result = lmsService.updateEnrollmentProgress(tenantId, enrollmentId);

        assertNotNull(result);
        verify(enrollmentRepository).save(any(CourseEnrollment.class));
    }

    @Test
    void updateEnrollmentProgress_AllContentCompleted_SetsCompleted() {
        testEnrollment.setProgressPercentage(BigDecimal.valueOf(100));

        ContentProgress completedProgress = ContentProgress.builder()
                .enrollmentId(enrollmentId)
                .contentId(contentId)
                .status(ProgressStatus.COMPLETED)
                .build();
        completedProgress.setId(UUID.randomUUID());
        completedProgress.setTenantId(tenantId);

        when(enrollmentRepository.findByIdAndTenantId(enrollmentId, tenantId))
                .thenReturn(Optional.of(testEnrollment));
        when(moduleRepository.findByCourseOrdered(tenantId, courseId))
                .thenReturn(List.of(testModule));
        when(contentRepository.findAllByModuleIdInAndTenantId(Set.of(moduleId), tenantId))
                .thenReturn(List.of(testContent));
        when(progressRepository.findByEnrollment(tenantId, enrollmentId))
                .thenReturn(List.of(completedProgress));
        when(enrollmentRepository.save(any(CourseEnrollment.class))).thenAnswer(invocation -> {
            CourseEnrollment saved = invocation.getArgument(0);
            // Simulate 100% progress completing the enrollment
            if (saved.getProgressPercentage().compareTo(BigDecimal.valueOf(100)) >= 0) {
                saved.setStatus(EnrollmentStatus.COMPLETED);
            }
            return saved;
        });

        CourseEnrollment result = lmsService.updateEnrollmentProgress(tenantId, enrollmentId);

        assertEquals(EnrollmentStatus.COMPLETED, result.getStatus());
    }

    @Test
    void updateEnrollmentProgress_NotFound_ThrowsException() {
        when(enrollmentRepository.findByIdAndTenantId(enrollmentId, tenantId))
                .thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () ->
                lmsService.updateEnrollmentProgress(tenantId, enrollmentId));
    }

    @Test
    void getEmployeeEnrollments_Success() {
        when(enrollmentRepository.findByEmployee(tenantId, employeeId))
                .thenReturn(List.of(testEnrollment));

        List<CourseEnrollment> result = lmsService.getEmployeeEnrollments(tenantId, employeeId);

        assertEquals(1, result.size());
    }

    @Test
    void getEnrollmentById_Success() {
        when(enrollmentRepository.findByIdAndTenantId(enrollmentId, tenantId))
                .thenReturn(Optional.of(testEnrollment));

        Optional<CourseEnrollment> result = lmsService.getEnrollmentById(tenantId, enrollmentId);

        assertTrue(result.isPresent());
    }

    @Test
    void getEnrollment_Success() {
        when(enrollmentRepository.findByCourseIdAndEmployeeIdAndTenantId(courseId, employeeId, tenantId))
                .thenReturn(Optional.of(testEnrollment));

        Optional<CourseEnrollment> result = lmsService.getEnrollment(tenantId, courseId, employeeId);

        assertTrue(result.isPresent());
    }

    // ================== Progress Tests ==================

    @Test
    void updateContentProgress_NewProgress_Success() {
        when(progressRepository.findByEnrollmentIdAndContentIdAndTenantId(enrollmentId, contentId, tenantId))
                .thenReturn(Optional.empty());
        when(contentRepository.findByIdAndTenantId(contentId, tenantId))
                .thenReturn(Optional.of(testContent));
        when(progressRepository.save(any(ContentProgress.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(enrollmentRepository.findByIdAndTenantId(enrollmentId, tenantId))
                .thenReturn(Optional.of(testEnrollment));
        when(moduleRepository.findByCourseOrdered(tenantId, courseId))
                .thenReturn(List.of(testModule));
        when(contentRepository.findAllByModuleIdInAndTenantId(Set.of(moduleId), tenantId))
                .thenReturn(List.of(testContent));
        when(progressRepository.findByEnrollment(tenantId, enrollmentId))
                .thenReturn(Collections.emptyList());
        when(enrollmentRepository.save(any(CourseEnrollment.class))).thenReturn(testEnrollment);

        ContentProgress result = lmsService.updateContentProgress(tenantId, enrollmentId, contentId, ProgressStatus.IN_PROGRESS, 60);

        assertEquals(ProgressStatus.IN_PROGRESS, result.getStatus());
        assertNotNull(result.getStartedAt());
    }

    @Test
    void updateContentProgress_MarkCompleted_Success() {
        ContentProgress existingProgress = ContentProgress.builder()
                .enrollmentId(enrollmentId)
                .contentId(contentId)
                .moduleId(moduleId)
                .status(ProgressStatus.IN_PROGRESS)
                .progressPercentage(BigDecimal.valueOf(50))
                .timeSpentSeconds(100)
                .startedAt(LocalDateTime.now().minusHours(1))
                .build();
        existingProgress.setId(UUID.randomUUID());
        existingProgress.setTenantId(tenantId);

        when(progressRepository.findByEnrollmentIdAndContentIdAndTenantId(enrollmentId, contentId, tenantId))
                .thenReturn(Optional.of(existingProgress));
        when(progressRepository.save(any(ContentProgress.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(enrollmentRepository.findByIdAndTenantId(enrollmentId, tenantId))
                .thenReturn(Optional.of(testEnrollment));
        when(moduleRepository.findByCourseOrdered(tenantId, courseId))
                .thenReturn(List.of(testModule));
        when(contentRepository.findAllByModuleIdInAndTenantId(Set.of(moduleId), tenantId))
                .thenReturn(List.of(testContent));
        when(progressRepository.findByEnrollment(tenantId, enrollmentId))
                .thenReturn(List.of(existingProgress));
        when(enrollmentRepository.save(any(CourseEnrollment.class))).thenReturn(testEnrollment);

        ContentProgress result = lmsService.updateContentProgress(tenantId, enrollmentId, contentId, ProgressStatus.COMPLETED, 120);

        assertEquals(ProgressStatus.COMPLETED, result.getStatus());
        assertNotNull(result.getCompletedAt());
        assertEquals(BigDecimal.valueOf(100), result.getProgressPercentage());
    }

    @Test
    void getProgressByEnrollment_Success() {
        ContentProgress progress = ContentProgress.builder()
                .enrollmentId(enrollmentId)
                .status(ProgressStatus.IN_PROGRESS)
                .build();
        progress.setId(UUID.randomUUID());

        when(progressRepository.findByEnrollment(tenantId, enrollmentId))
                .thenReturn(List.of(progress));

        List<ContentProgress> result = lmsService.getProgressByEnrollment(tenantId, enrollmentId);

        assertEquals(1, result.size());
    }

    // ================== Certificate Tests ==================

    @Test
    void issueCertificate_Success() {
        UUID issuerId = UUID.randomUUID();
        testEnrollment.setStatus(EnrollmentStatus.COMPLETED);
        testEnrollment.setQuizScore(BigDecimal.valueOf(85));

        when(enrollmentRepository.findByIdAndTenantId(enrollmentId, tenantId))
                .thenReturn(Optional.of(testEnrollment));
        when(certificateRepository.findByEnrollmentIdAndTenantId(enrollmentId, tenantId))
                .thenReturn(Optional.empty());
        when(courseRepository.findByIdAndTenantId(courseId, tenantId))
                .thenReturn(Optional.of(testCourse));
        when(certificateRepository.save(any(Certificate.class))).thenAnswer(invocation -> {
            Certificate saved = invocation.getArgument(0);
            saved.setId(UUID.randomUUID());
            return saved;
        });
        when(enrollmentRepository.save(any(CourseEnrollment.class))).thenReturn(testEnrollment);

        Certificate result = lmsService.issueCertificate(tenantId, enrollmentId, issuerId);

        assertNotNull(result.getId());
        assertNotNull(result.getCertificateNumber());
        assertTrue(result.getCertificateNumber().startsWith("CERT-"));
        assertTrue(result.getIsActive());
        assertEquals(issuerId, result.getIssuedBy());
    }

    @Test
    void issueCertificate_AlreadyExists_ReturnsExisting() {
        Certificate existingCertificate = Certificate.builder()
                .certificateNumber("CERT-123")
                .courseId(courseId)
                .employeeId(employeeId)
                .enrollmentId(enrollmentId)
                .isActive(true)
                .build();
        existingCertificate.setId(UUID.randomUUID());
        existingCertificate.setTenantId(tenantId);

        when(enrollmentRepository.findByIdAndTenantId(enrollmentId, tenantId))
                .thenReturn(Optional.of(testEnrollment));
        when(certificateRepository.findByEnrollmentIdAndTenantId(enrollmentId, tenantId))
                .thenReturn(Optional.of(existingCertificate));

        Certificate result = lmsService.issueCertificate(tenantId, enrollmentId, UUID.randomUUID());

        assertEquals(existingCertificate.getId(), result.getId());
        verify(certificateRepository, never()).save(any(Certificate.class));
    }

    @Test
    void issueCertificate_EnrollmentNotFound_ThrowsException() {
        when(enrollmentRepository.findByIdAndTenantId(enrollmentId, tenantId))
                .thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () ->
                lmsService.issueCertificate(tenantId, enrollmentId, UUID.randomUUID()));
    }

    @Test
    void getEmployeeCertificates_Success() {
        Certificate certificate = Certificate.builder()
                .employeeId(employeeId)
                .isActive(true)
                .build();
        certificate.setId(UUID.randomUUID());

        when(certificateRepository.findActiveByEmployee(tenantId, employeeId))
                .thenReturn(List.of(certificate));

        List<Certificate> result = lmsService.getEmployeeCertificates(tenantId, employeeId);

        assertEquals(1, result.size());
    }

    @Test
    void getCertificateById_Success() {
        UUID certificateId = UUID.randomUUID();
        Certificate certificate = Certificate.builder().build();
        certificate.setId(certificateId);

        when(certificateRepository.findByIdAndTenantId(certificateId, tenantId))
                .thenReturn(Optional.of(certificate));

        Optional<Certificate> result = lmsService.getCertificateById(tenantId, certificateId);

        assertTrue(result.isPresent());
    }

    @Test
    void verifyCertificate_Success() {
        String certificateNumber = "CERT-123456";
        Certificate certificate = Certificate.builder()
                .certificateNumber(certificateNumber)
                .isActive(true)
                .build();
        certificate.setId(UUID.randomUUID());

        when(certificateRepository.findByCertificateNumber(certificateNumber))
                .thenReturn(Optional.of(certificate));

        Optional<Certificate> result = lmsService.verifyCertificate(certificateNumber);

        assertTrue(result.isPresent());
        assertEquals(certificateNumber, result.get().getCertificateNumber());
    }

    // ================== Dashboard Tests ==================

    @Test
    void getEmployeeDashboard_Success() {
        testEnrollment.setStatus(EnrollmentStatus.IN_PROGRESS);

        when(enrollmentRepository.findByEmployee(tenantId, employeeId))
                .thenReturn(List.of(testEnrollment));
        when(enrollmentRepository.getAverageProgressForEmployee(tenantId, employeeId))
                .thenReturn(50.0);
        when(certificateRepository.countActiveByEmployee(tenantId, employeeId))
                .thenReturn(2L);

        Map<String, Object> dashboard = lmsService.getEmployeeDashboard(tenantId, employeeId);

        assertEquals(1L, dashboard.get("totalEnrollments"));
        assertEquals(1L, dashboard.get("inProgress"));
        assertEquals(0L, dashboard.get("completed"));
        assertEquals(50.0, dashboard.get("averageProgress"));
        assertEquals(2L, dashboard.get("certificatesEarned"));
    }

    @Test
    void getEmployeeDashboard_EmptyData_ReturnsZeros() {
        when(enrollmentRepository.findByEmployee(tenantId, employeeId))
                .thenReturn(Collections.emptyList());
        when(enrollmentRepository.getAverageProgressForEmployee(tenantId, employeeId))
                .thenReturn(null);
        when(certificateRepository.countActiveByEmployee(tenantId, employeeId))
                .thenReturn(0L);

        Map<String, Object> dashboard = lmsService.getEmployeeDashboard(tenantId, employeeId);

        assertEquals(0L, dashboard.get("totalEnrollments"));
        assertEquals(0.0, dashboard.get("averageProgress"));
    }

    @Test
    void getAdminDashboard_Success() {
        when(courseRepository.count()).thenReturn(2L);
        when(courseRepository.findMandatoryCourses(tenantId)).thenReturn(Collections.emptyList());

        Map<String, Object> dashboard = lmsService.getAdminDashboard(tenantId);

        assertEquals(2L, dashboard.get("totalCourses"));
        assertEquals(2L, dashboard.get("publishedCourses"));
        assertEquals(0, dashboard.get("mandatoryCourses"));
    }

    // ─── BUG-L1: learning paths list + enrolment ────────────────────────────
    //
    // GET /lms/learning-paths and POST /lms/learning-paths/{id}/enroll did not exist at all;
    // the Programs page called both and sat on "Loading learning paths…" forever.

    private LearningPath pathWith(UUID pathId, String title) {
        LearningPath path = new LearningPath();
        path.setId(pathId);
        path.setTenantId(tenantId);
        path.setTitle(title);
        path.setDescription("Path description");
        path.setDifficultyLevel(LearningPath.DifficultyLevel.BEGINNER);
        path.setEstimatedHours(7);
        path.setIsPublished(true);
        return path;
    }

    private LearningPathCourse member(UUID pathId, UUID memberCourseId, int order) {
        LearningPathCourse lpc = LearningPathCourse.builder()
                .id(UUID.randomUUID())
                .tenantId(tenantId)
                .pathId(pathId)
                .courseId(memberCourseId)
                .orderIndex(order)
                .isRequired(true)
                .build();
        return lpc;
    }

    private CourseEnrollment enrollmentFor(UUID memberCourseId, String progress, EnrollmentStatus status) {
        CourseEnrollment e = CourseEnrollment.builder()
                .id(UUID.randomUUID())
                .courseId(memberCourseId)
                .employeeId(employeeId)
                .status(status)
                .progressPercentage(new BigDecimal(progress))
                .build();
        e.setTenantId(tenantId);
        return e;
    }

    @Test
    void getLearningPaths_withoutEnrollment_reportsNotStarted() {
        UUID pathId = UUID.randomUUID();
        UUID courseA = UUID.randomUUID();
        UUID courseB = UUID.randomUUID();
        Pageable pageable = PageRequest.of(0, 20);

        when(learningPathRepository.findPublishedPaths(tenantId, pageable))
                .thenReturn(new PageImpl<>(List.of(pathWith(pathId, "Security Onboarding"))));
        when(learningPathCourseRepository.findByPathIds(eq(tenantId), anyCollection()))
                .thenReturn(List.of(member(pathId, courseA, 0), member(pathId, courseB, 1)));
        when(learningPathCourseRepository.countDistinctLearnersByPath(eq(tenantId), anyCollection()))
                .thenReturn(List.<Object[]>of(new Object[]{pathId, 4L}));
        when(enrollmentRepository.findByEmployee(tenantId, employeeId)).thenReturn(List.of());

        var result = lmsService.getLearningPaths(tenantId, employeeId, pageable);

        assertEquals(1, result.getTotalElements());
        var dto = result.getContent().get(0);
        assertEquals("Security Onboarding", dto.getTitle());
        assertEquals("BEGINNER", dto.getDifficulty());
        assertEquals(7, dto.getDurationHours());
        assertEquals(2, dto.getCourseCount());
        assertEquals(4L, dto.getTotalEnrollments());
        assertFalse(dto.isEnrolled());
        assertEquals(0, dto.getProgressPercentage());
        assertEquals("NOT_STARTED", dto.getStatus());
    }

    @Test
    void getLearningPaths_partialProgress_averagesOverEveryCourseInThePath() {
        UUID pathId = UUID.randomUUID();
        UUID courseA = UUID.randomUUID();
        UUID courseB = UUID.randomUUID();
        Pageable pageable = PageRequest.of(0, 20);

        when(learningPathRepository.findPublishedPaths(tenantId, pageable))
                .thenReturn(new PageImpl<>(List.of(pathWith(pathId, "Security Onboarding"))));
        when(learningPathCourseRepository.findByPathIds(eq(tenantId), anyCollection()))
                .thenReturn(List.of(member(pathId, courseA, 0), member(pathId, courseB, 1)));
        when(learningPathCourseRepository.countDistinctLearnersByPath(eq(tenantId), anyCollection()))
                .thenReturn(List.of());
        when(enrollmentRepository.findByEmployee(tenantId, employeeId)).thenReturn(List.of(
                enrollmentFor(courseA, "100", EnrollmentStatus.COMPLETED),
                enrollmentFor(courseB, "50", EnrollmentStatus.IN_PROGRESS)));

        var dto = lmsService.getLearningPaths(tenantId, employeeId, pageable).getContent().get(0);

        assertTrue(dto.isEnrolled());
        assertEquals(75, dto.getProgressPercentage());
        assertEquals("IN_PROGRESS", dto.getStatus());
        assertEquals(0L, dto.getTotalEnrollments());
    }

    @Test
    void getLearningPaths_allCoursesCompleted_reportsCompleted() {
        UUID pathId = UUID.randomUUID();
        UUID courseA = UUID.randomUUID();
        Pageable pageable = PageRequest.of(0, 20);

        when(learningPathRepository.findPublishedPaths(tenantId, pageable))
                .thenReturn(new PageImpl<>(List.of(pathWith(pathId, "Security Onboarding"))));
        when(learningPathCourseRepository.findByPathIds(eq(tenantId), anyCollection()))
                .thenReturn(List.of(member(pathId, courseA, 0)));
        when(learningPathCourseRepository.countDistinctLearnersByPath(eq(tenantId), anyCollection()))
                .thenReturn(List.of());
        when(enrollmentRepository.findByEmployee(tenantId, employeeId))
                .thenReturn(List.of(enrollmentFor(courseA, "100", EnrollmentStatus.COMPLETED)));

        var dto = lmsService.getLearningPaths(tenantId, employeeId, pageable).getContent().get(0);

        assertEquals(100, dto.getProgressPercentage());
        assertEquals("COMPLETED", dto.getStatus());
    }

    @Test
    void getLearningPaths_withoutEmployeeContext_doesNotQueryEnrollments() {
        UUID pathId = UUID.randomUUID();
        Pageable pageable = PageRequest.of(0, 20);

        when(learningPathRepository.findPublishedPaths(tenantId, pageable))
                .thenReturn(new PageImpl<>(List.of(pathWith(pathId, "Security Onboarding"))));
        when(learningPathCourseRepository.findByPathIds(eq(tenantId), anyCollection()))
                .thenReturn(List.of(member(pathId, UUID.randomUUID(), 0)));
        when(learningPathCourseRepository.countDistinctLearnersByPath(eq(tenantId), anyCollection()))
                .thenReturn(List.of());

        var dto = lmsService.getLearningPaths(tenantId, null, pageable).getContent().get(0);

        assertFalse(dto.isEnrolled());
        assertEquals("NOT_STARTED", dto.getStatus());
        verify(enrollmentRepository, never()).findByEmployee(any(), any());
    }

    @Test
    void getLearningPaths_emptyPage_returnsEmptyWithoutTouchingJoinTable() {
        Pageable pageable = PageRequest.of(0, 20);
        when(learningPathRepository.findPublishedPaths(tenantId, pageable))
                .thenReturn(new PageImpl<>(List.of()));

        assertTrue(lmsService.getLearningPaths(tenantId, employeeId, pageable).isEmpty());
        verify(learningPathCourseRepository, never()).findByPathIds(any(), anyCollection());
    }

    @Test
    void enrollInLearningPath_enrollsEveryMemberCourse_andIsIdempotent() {
        UUID pathId = UUID.randomUUID();
        UUID courseA = UUID.randomUUID();
        UUID courseB = UUID.randomUUID();
        UUID enrolledBy = UUID.randomUUID();

        LearningPath path = pathWith(pathId, "Security Onboarding");
        path.setCourses(List.of(member(pathId, courseA, 0), member(pathId, courseB, 1)));
        when(learningPathRepository.findByIdAndTenantIdWithCourses(pathId, tenantId))
                .thenReturn(Optional.of(path));

        // courseA is already enrolled, courseB is not.
        when(enrollmentRepository.findByCourseIdAndEmployeeIdAndTenantId(courseA, employeeId, tenantId))
                .thenReturn(Optional.of(enrollmentFor(courseA, "10", EnrollmentStatus.IN_PROGRESS)));
        when(enrollmentRepository.findByCourseIdAndEmployeeIdAndTenantId(courseB, employeeId, tenantId))
                .thenReturn(Optional.empty());
        when(enrollmentRepository.save(any(CourseEnrollment.class))).thenAnswer(inv -> inv.getArgument(0));
        when(courseRepository.findByIdAndTenantId(courseB, tenantId)).thenReturn(Optional.of(testCourse));

        lmsService.enrollInLearningPath(tenantId, pathId, employeeId, enrolledBy);

        // Only the missing enrolment is created — the existing one is untouched.
        verify(enrollmentRepository, times(1)).save(any(CourseEnrollment.class));
    }

    @Test
    void enrollInLearningPath_unknownPath_throwsNotFound() {
        UUID pathId = UUID.randomUUID();
        when(learningPathRepository.findByIdAndTenantIdWithCourses(pathId, tenantId))
                .thenReturn(Optional.empty());

        assertThrows(com.nulogic.common.exception.ResourceNotFoundException.class,
                () -> lmsService.enrollInLearningPath(tenantId, pathId, employeeId, UUID.randomUUID()));
        verify(enrollmentRepository, never()).save(any());
    }
}
