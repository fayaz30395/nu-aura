package com.hrms.api.lms.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.lms.dto.CourseCatalogResponse;
import com.hrms.api.lms.dto.SkillGapReport;
import com.hrms.application.lms.service.LmsService;
import com.hrms.application.lms.service.QuizManagementService;
import com.hrms.application.lms.service.SkillGapAnalysisService;
import com.hrms.common.exception.GlobalExceptionHandler;
import com.hrms.common.config.TestMeterRegistryConfig;
import com.hrms.common.security.*;
import com.hrms.domain.lms.Certificate;
import com.hrms.domain.lms.ContentProgress;
import com.hrms.domain.lms.Course;
import com.hrms.domain.lms.Quiz;
import com.hrms.domain.lms.QuizQuestion;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.*;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(LmsController.class)
@ContextConfiguration(classes = {LmsController.class, GlobalExceptionHandler.class})
@Import(TestMeterRegistryConfig.class)
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("LmsController Unit Tests")
class LmsControllerTest {

    @MockitoBean
    private JpaMetamodelMappingContext jpaMetamodelMappingContext;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private LmsService lmsService;

    @MockitoBean
    private SkillGapAnalysisService skillGapAnalysisService;

    @MockitoBean
    private QuizManagementService quizManagementService;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockitoBean
    private TenantFilter tenantFilter;

    private UUID courseId;
    private UUID quizId;
    private UUID questionId;
    private UUID employeeId;
    private UUID enrollmentId;
    private UUID contentId;
    private Course sampleCourse;

    @BeforeEach
    void setUp() {
        courseId = UUID.randomUUID();
        quizId = UUID.randomUUID();
        questionId = UUID.randomUUID();
        employeeId = UUID.randomUUID();
        enrollmentId = UUID.randomUUID();
        contentId = UUID.randomUUID();

        sampleCourse = new Course();
        sampleCourse.setId(courseId);
        sampleCourse.setTitle("Java Fundamentals");
        sampleCourse.setCode("JAVA-101");
        sampleCourse.setStatus(Course.CourseStatus.PUBLISHED);
        sampleCourse.setDurationHours(new BigDecimal("40"));

        // TenantContext and SecurityContext are static — mock via MockedStatic if needed.
        // For @WebMvcTest with addFilters=false, these are typically not invoked.
        try (var tenantCtx = org.mockito.Mockito.mockStatic(TenantContext.class);
             var secCtx = org.mockito.Mockito.mockStatic(SecurityContext.class)) {
            tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(UUID.randomUUID());
            secCtx.when(SecurityContext::getCurrentEmployeeId).thenReturn(employeeId);
        }
    }

    // ─── Catalog ─────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("Catalog Tests")
    class CatalogTests {

        @Test
        @DisplayName("Should get course catalog with default pagination")
        void shouldGetCourseCatalog() throws Exception {
            CourseCatalogResponse catalog = CourseCatalogResponse.builder()
                    .courses(List.of(CourseCatalogResponse.CourseSummaryDto.builder()
                            .id(courseId)
                            .title("Java Fundamentals")
                            .code("JAVA-101")
                            .build()))
                    .build();

            try (var tenantCtx = org.mockito.Mockito.mockStatic(TenantContext.class)) {
                tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(UUID.randomUUID());
                when(lmsService.getCourseCatalog(any(UUID.class), eq(0), eq(10))).thenReturn(catalog);

                mockMvc.perform(get("/api/v1/lms/catalog"))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.courses.length()").value(1))
                        .andExpect(jsonPath("$.courses[0].title").value("Java Fundamentals"));
            }
        }
    }

    // ─── Course CRUD ──────────────────────────────────────────────────────────

    @Nested
    @DisplayName("Course CRUD Tests")
    class CourseCRUDTests {

        @Test
        @DisplayName("Should get all courses with pagination")
        void shouldGetAllCourses() throws Exception {
            Page<Course> page = new PageImpl<>(List.of(sampleCourse), PageRequest.of(0, 20), 1);

            try (var tenantCtx = org.mockito.Mockito.mockStatic(TenantContext.class)) {
                tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(UUID.randomUUID());
                when(lmsService.getAllCourses(any(UUID.class), any(PageRequest.class))).thenReturn(page);

                mockMvc.perform(get("/api/v1/lms/courses"))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.content.length()").value(1))
                        .andExpect(jsonPath("$.content[0].title").value("Java Fundamentals"));
            }
        }

        @Test
        @DisplayName("Should search courses by query")
        void shouldSearchCourses() throws Exception {
            Page<Course> page = new PageImpl<>(List.of(sampleCourse), PageRequest.of(0, 20), 1);

            try (var tenantCtx = org.mockito.Mockito.mockStatic(TenantContext.class)) {
                tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(UUID.randomUUID());
                when(lmsService.searchCourses(any(UUID.class), eq("Java"), any(PageRequest.class))).thenReturn(page);

                mockMvc.perform(get("/api/v1/lms/courses").param("search", "Java"))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.content[0].title").value("Java Fundamentals"));
            }
        }

        @Test
        @DisplayName("Should get published courses only")
        void shouldGetPublishedCourses() throws Exception {
            Page<Course> page = new PageImpl<>(List.of(sampleCourse), PageRequest.of(0, 20), 1);

            try (var tenantCtx = org.mockito.Mockito.mockStatic(TenantContext.class)) {
                tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(UUID.randomUUID());
                when(lmsService.getPublishedCourses(any(UUID.class), any(PageRequest.class))).thenReturn(page);

                mockMvc.perform(get("/api/v1/lms/courses/published"))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.content.length()").value(1));
            }
        }

        @Test
        @DisplayName("Should get course by ID")
        void shouldGetCourseById() throws Exception {
            try (var tenantCtx = org.mockito.Mockito.mockStatic(TenantContext.class)) {
                tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(UUID.randomUUID());
                when(lmsService.getCourseById(any(UUID.class), eq(courseId))).thenReturn(Optional.of(sampleCourse));

                mockMvc.perform(get("/api/v1/lms/courses/{id}", courseId))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.title").value("Java Fundamentals"));
            }
        }

        @Test
        @DisplayName("Should return 404 when course not found")
        void shouldReturn404WhenCourseNotFound() throws Exception {
            UUID missingId = UUID.randomUUID();

            try (var tenantCtx = org.mockito.Mockito.mockStatic(TenantContext.class)) {
                tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(UUID.randomUUID());
                when(lmsService.getCourseById(any(UUID.class), eq(missingId))).thenReturn(Optional.empty());

                mockMvc.perform(get("/api/v1/lms/courses/{id}", missingId))
                        .andExpect(status().isNotFound());
            }
        }

        @Test
        @DisplayName("Should create course and return 201")
        void shouldCreateCourse() throws Exception {
            try (var tenantCtx = org.mockito.Mockito.mockStatic(TenantContext.class)) {
                tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(UUID.randomUUID());
                when(lmsService.createCourse(any(Course.class))).thenReturn(sampleCourse);

                Course newCourse = new Course();
                newCourse.setTitle("Java Fundamentals");
                newCourse.setCode("JAVA-101");

                mockMvc.perform(post("/api/v1/lms/courses")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(newCourse)))
                        .andExpect(status().isCreated())
                        .andExpect(jsonPath("$.title").value("Java Fundamentals"));
            }
        }

        @Test
        @DisplayName("Should update course")
        void shouldUpdateCourse() throws Exception {
            try (var tenantCtx = org.mockito.Mockito.mockStatic(TenantContext.class)) {
                tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(UUID.randomUUID());
                when(lmsService.updateCourse(any(Course.class))).thenReturn(sampleCourse);

                mockMvc.perform(put("/api/v1/lms/courses/{id}", courseId)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(sampleCourse)))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.title").value("Java Fundamentals"));
            }
        }

        @Test
        @DisplayName("Should publish course")
        void shouldPublishCourse() throws Exception {
            try (var tenantCtx = org.mockito.Mockito.mockStatic(TenantContext.class)) {
                tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(UUID.randomUUID());
                doNothing().when(lmsService).publishCourse(any(UUID.class), eq(courseId));

                mockMvc.perform(post("/api/v1/lms/courses/{id}/publish", courseId))
                        .andExpect(status().isOk());

                verify(lmsService).publishCourse(any(UUID.class), eq(courseId));
            }
        }

        @Test
        @DisplayName("Should archive course")
        void shouldArchiveCourse() throws Exception {
            try (var tenantCtx = org.mockito.Mockito.mockStatic(TenantContext.class)) {
                tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(UUID.randomUUID());
                doNothing().when(lmsService).archiveCourse(any(UUID.class), eq(courseId));

                mockMvc.perform(post("/api/v1/lms/courses/{id}/archive", courseId))
                        .andExpect(status().isOk());

                verify(lmsService).archiveCourse(any(UUID.class), eq(courseId));
            }
        }

        @Test
        @DisplayName("Should delete course and return 204")
        void shouldDeleteCourse() throws Exception {
            try (var tenantCtx = org.mockito.Mockito.mockStatic(TenantContext.class)) {
                tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(UUID.randomUUID());
                doNothing().when(lmsService).deleteCourse(any(UUID.class), eq(courseId));

                mockMvc.perform(delete("/api/v1/lms/courses/{id}", courseId))
                        .andExpect(status().isNoContent());

                verify(lmsService).deleteCourse(any(UUID.class), eq(courseId));
            }
        }
    }

    // ─── Quiz Management ──────────────────────────────────────────────────────

    @Nested
    @DisplayName("Quiz Management Tests")
    class QuizManagementTests {

        @Test
        @DisplayName("Should create quiz for a course")
        void shouldCreateQuiz() throws Exception {
            Quiz quiz = new Quiz();
            quiz.setId(quizId);
            quiz.setTitle("Java Basics Quiz");

            try (var tenantCtx = org.mockito.Mockito.mockStatic(TenantContext.class)) {
                tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(UUID.randomUUID());
                when(quizManagementService.createQuiz(eq(courseId), any(Quiz.class), any(UUID.class)))
                        .thenReturn(quiz);

                mockMvc.perform(post("/api/v1/lms/courses/{courseId}/quizzes", courseId)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(quiz)))
                        .andExpect(status().isCreated())
                        .andExpect(jsonPath("$.title").value("Java Basics Quiz"));
            }
        }

        @Test
        @DisplayName("Should get quizzes by course")
        void shouldGetQuizzesByCourse() throws Exception {
            Quiz quiz = new Quiz();
            quiz.setId(quizId);
            quiz.setTitle("Java Basics Quiz");

            try (var tenantCtx = org.mockito.Mockito.mockStatic(TenantContext.class)) {
                tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(UUID.randomUUID());
                when(quizManagementService.getQuizzesByCourse(eq(courseId), any(UUID.class)))
                        .thenReturn(List.of(quiz));

                mockMvc.perform(get("/api/v1/lms/courses/{courseId}/quizzes", courseId))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.length()").value(1));
            }
        }

        @Test
        @DisplayName("Should update quiz")
        void shouldUpdateQuiz() throws Exception {
            Quiz quiz = new Quiz();
            quiz.setId(quizId);
            quiz.setTitle("Updated Quiz");

            try (var tenantCtx = org.mockito.Mockito.mockStatic(TenantContext.class)) {
                tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(UUID.randomUUID());
                when(quizManagementService.updateQuiz(eq(quizId), any(Quiz.class), any(UUID.class)))
                        .thenReturn(quiz);

                mockMvc.perform(put("/api/v1/lms/quizzes/{quizId}", quizId)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(quiz)))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.title").value("Updated Quiz"));
            }
        }

        @Test
        @DisplayName("Should delete quiz and return 204")
        void shouldDeleteQuiz() throws Exception {
            try (var tenantCtx = org.mockito.Mockito.mockStatic(TenantContext.class)) {
                tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(UUID.randomUUID());
                doNothing().when(quizManagementService).deleteQuiz(eq(quizId), any(UUID.class));

                mockMvc.perform(delete("/api/v1/lms/quizzes/{quizId}", quizId))
                        .andExpect(status().isNoContent());

                verify(quizManagementService).deleteQuiz(eq(quizId), any(UUID.class));
            }
        }

        @Test
        @DisplayName("Should add question to quiz")
        void shouldAddQuestionToQuiz() throws Exception {
            QuizQuestion question = new QuizQuestion();
            question.setId(questionId);
            question.setQuestionText("What is JVM?");

            try (var tenantCtx = org.mockito.Mockito.mockStatic(TenantContext.class)) {
                tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(UUID.randomUUID());
                when(quizManagementService.addQuestionToQuiz(eq(quizId), any(QuizQuestion.class), any(UUID.class)))
                        .thenReturn(question);

                mockMvc.perform(post("/api/v1/lms/quizzes/{quizId}/questions", quizId)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(question)))
                        .andExpect(status().isCreated())
                        .andExpect(jsonPath("$.questionText").value("What is JVM?"));
            }
        }

        @Test
        @DisplayName("Should get quiz questions")
        void shouldGetQuizQuestions() throws Exception {
            QuizQuestion question = new QuizQuestion();
            question.setId(questionId);
            question.setQuestionText("What is JVM?");

            try (var tenantCtx = org.mockito.Mockito.mockStatic(TenantContext.class)) {
                tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(UUID.randomUUID());
                when(quizManagementService.getQuizQuestions(eq(quizId), any(UUID.class)))
                        .thenReturn(List.of(question));

                mockMvc.perform(get("/api/v1/lms/quizzes/{quizId}/questions", quizId))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.length()").value(1));
            }
        }

        @Test
        @DisplayName("Should update question")
        void shouldUpdateQuestion() throws Exception {
            QuizQuestion question = new QuizQuestion();
            question.setId(questionId);
            question.setQuestionText("Updated question");

            try (var tenantCtx = org.mockito.Mockito.mockStatic(TenantContext.class)) {
                tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(UUID.randomUUID());
                when(quizManagementService.updateQuestion(eq(questionId), any(QuizQuestion.class), any(UUID.class)))
                        .thenReturn(question);

                mockMvc.perform(put("/api/v1/lms/questions/{questionId}", questionId)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(question)))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.questionText").value("Updated question"));
            }
        }

        @Test
        @DisplayName("Should delete question and return 204")
        void shouldDeleteQuestion() throws Exception {
            try (var tenantCtx = org.mockito.Mockito.mockStatic(TenantContext.class)) {
                tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(UUID.randomUUID());
                doNothing().when(quizManagementService).deleteQuestion(eq(questionId), any(UUID.class));

                mockMvc.perform(delete("/api/v1/lms/questions/{questionId}", questionId))
                        .andExpect(status().isNoContent());

                verify(quizManagementService).deleteQuestion(eq(questionId), any(UUID.class));
            }
        }

        @Test
        @DisplayName("Should reorder quiz questions")
        void shouldReorderQuestions() throws Exception {
            List<UUID> questionIds = List.of(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID());

            try (var tenantCtx = org.mockito.Mockito.mockStatic(TenantContext.class)) {
                tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(UUID.randomUUID());
                doNothing().when(quizManagementService).reorderQuestions(eq(quizId), anyList(), any(UUID.class));

                mockMvc.perform(post("/api/v1/lms/quizzes/{quizId}/reorder-questions", quizId)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(questionIds)))
                        .andExpect(status().isOk());

                verify(quizManagementService).reorderQuestions(eq(quizId), anyList(), any(UUID.class));
            }
        }
    }

    // ─── Content Progress ─────────────────────────────────────────────────────

    @Nested
    @DisplayName("Content Progress Tests")
    class ContentProgressTests {

        @Test
        @DisplayName("Should update content progress")
        void shouldUpdateContentProgress() throws Exception {
            ContentProgress progress = new ContentProgress();
            progress.setId(UUID.randomUUID());
            progress.setStatus(ContentProgress.ProgressStatus.COMPLETED);

            try (var tenantCtx = org.mockito.Mockito.mockStatic(TenantContext.class)) {
                tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(UUID.randomUUID());
                when(lmsService.updateContentProgress(
                        any(UUID.class), eq(enrollmentId), eq(contentId),
                        eq(ContentProgress.ProgressStatus.COMPLETED), eq(120)))
                        .thenReturn(progress);

                mockMvc.perform(post("/api/v1/lms/progress/{enrollmentId}/content/{contentId}",
                                enrollmentId, contentId)
                                .param("status", "COMPLETED")
                                .param("timeSpentSeconds", "120"))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.status").value("COMPLETED"));
            }
        }

        @Test
        @DisplayName("Should get enrollment progress")
        void shouldGetEnrollmentProgress() throws Exception {
            ContentProgress progress = new ContentProgress();
            progress.setId(UUID.randomUUID());
            progress.setStatus(ContentProgress.ProgressStatus.IN_PROGRESS);

            try (var tenantCtx = org.mockito.Mockito.mockStatic(TenantContext.class)) {
                tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(UUID.randomUUID());
                when(lmsService.getProgressByEnrollment(any(UUID.class), eq(enrollmentId)))
                        .thenReturn(List.of(progress));

                mockMvc.perform(get("/api/v1/lms/progress/{enrollmentId}", enrollmentId))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.length()").value(1));
            }
        }
    }

    // ─── Certificates ─────────────────────────────────────────────────────────

    @Nested
    @DisplayName("Certificate Tests")
    class CertificateTests {

        @Test
        @DisplayName("Should get my certificates")
        void shouldGetMyCertificates() throws Exception {
            Certificate cert = new Certificate();
            cert.setId(UUID.randomUUID());
            cert.setCertificateNumber("CERT-2026-001");

            try (var tenantCtx = org.mockito.Mockito.mockStatic(TenantContext.class);
                 var secCtx = org.mockito.Mockito.mockStatic(SecurityContext.class)) {
                tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(UUID.randomUUID());
                secCtx.when(SecurityContext::getCurrentEmployeeId).thenReturn(employeeId);
                when(lmsService.getEmployeeCertificates(any(UUID.class), eq(employeeId)))
                        .thenReturn(List.of(cert));

                mockMvc.perform(get("/api/v1/lms/my-certificates"))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.length()").value(1));
            }
        }

        @Test
        @DisplayName("Should verify certificate by number")
        void shouldVerifyCertificate() throws Exception {
            Certificate cert = new Certificate();
            cert.setId(UUID.randomUUID());
            cert.setCertificateNumber("CERT-2026-001");

            when(lmsService.verifyCertificate("CERT-2026-001")).thenReturn(Optional.of(cert));

            mockMvc.perform(get("/api/v1/lms/certificates/verify/{certificateNumber}", "CERT-2026-001"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.certificateNumber").value("CERT-2026-001"));
        }

        @Test
        @DisplayName("Should return 404 when certificate not found")
        void shouldReturn404WhenCertificateNotFound() throws Exception {
            when(lmsService.verifyCertificate("INVALID")).thenReturn(Optional.empty());

            mockMvc.perform(get("/api/v1/lms/certificates/verify/{certificateNumber}", "INVALID"))
                    .andExpect(status().isNotFound());
        }
    }

    // ─── Dashboards ───────────────────────────────────────────────────────────

    @Nested
    @DisplayName("Dashboard Tests")
    class DashboardTests {

        @Test
        @DisplayName("Should get employee dashboard")
        void shouldGetMyDashboard() throws Exception {
            Map<String, Object> dashboard = Map.of(
                    "enrolledCourses", 5,
                    "completedCourses", 2,
                    "certificates", 2);

            try (var tenantCtx = org.mockito.Mockito.mockStatic(TenantContext.class);
                 var secCtx = org.mockito.Mockito.mockStatic(SecurityContext.class)) {
                tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(UUID.randomUUID());
                secCtx.when(SecurityContext::getCurrentEmployeeId).thenReturn(employeeId);
                when(lmsService.getEmployeeDashboard(any(UUID.class), eq(employeeId)))
                        .thenReturn(dashboard);

                mockMvc.perform(get("/api/v1/lms/dashboard"))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.enrolledCourses").value(5));
            }
        }

        @Test
        @DisplayName("Should get admin dashboard")
        void shouldGetAdminDashboard() throws Exception {
            Map<String, Object> dashboard = Map.of(
                    "totalCourses", 25,
                    "totalEnrollments", 200,
                    "avgCompletionRate", 65.5);

            try (var tenantCtx = org.mockito.Mockito.mockStatic(TenantContext.class)) {
                tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(UUID.randomUUID());
                when(lmsService.getAdminDashboard(any(UUID.class))).thenReturn(dashboard);

                mockMvc.perform(get("/api/v1/lms/admin/dashboard"))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.totalCourses").value(25));
            }
        }
    }

    // ─── Skill Gaps ───────────────────────────────────────────────────────────

    @Nested
    @DisplayName("Skill Gap Tests")
    class SkillGapTests {

        @Test
        @DisplayName("Should get skill gap report for employee")
        void shouldGetSkillGaps() throws Exception {
            SkillGapReport report = SkillGapReport.builder()
                    .employeeName("John Doe")
                    .department("Engineering")
                    .gaps(List.of(SkillGapReport.GapDetail.builder()
                            .skillName("Kubernetes")
                            .requiredLevel(4)
                            .currentLevel(2)
                            .gapLevel("MODERATE")
                            .build()))
                    .build();

            try (var tenantCtx = org.mockito.Mockito.mockStatic(TenantContext.class)) {
                tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(UUID.randomUUID());
                when(skillGapAnalysisService.analyzeGaps(any(UUID.class), eq(employeeId)))
                        .thenReturn(report);

                mockMvc.perform(get("/api/v1/lms/employees/{employeeId}/skill-gaps", employeeId))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.employeeName").value("John Doe"))
                        .andExpect(jsonPath("$.gaps.length()").value(1))
                        .andExpect(jsonPath("$.gaps[0].skillName").value("Kubernetes"));
            }
        }
    }

    // ─── Permission Annotation Tests ──────────────────────────────────────────

    @Nested
    @DisplayName("Permission Annotation Tests")
    class PermissionAnnotationTests {

        @Test
        @DisplayName("createCourse should have LMS_COURSE_MANAGE permission")
        void createCourseShouldRequireManage() throws Exception {
            var method = LmsController.class.getMethod("createCourse", Course.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);
            Assertions.assertNotNull(annotation, "createCourse must have @RequiresPermission");
            Assertions.assertEquals(Permission.LMS_COURSE_MANAGE, annotation.value()[0]);
        }

        @Test
        @DisplayName("deleteCourse should have LMS_COURSE_MANAGE permission")
        void deleteCourseShouldRequireManage() throws Exception {
            var method = LmsController.class.getMethod("deleteCourse", UUID.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);
            Assertions.assertNotNull(annotation, "deleteCourse must have @RequiresPermission");
            Assertions.assertEquals(Permission.LMS_COURSE_MANAGE, annotation.value()[0]);
        }

        @Test
        @DisplayName("getSkillGaps should have EMPLOYEE_READ permission")
        void getSkillGapsShouldRequireEmployeeRead() throws Exception {
            var method = LmsController.class.getMethod("getSkillGaps", UUID.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);
            Assertions.assertNotNull(annotation, "getSkillGaps must have @RequiresPermission");
            Assertions.assertEquals(Permission.EMPLOYEE_READ, annotation.value()[0]);
        }
    }
}
