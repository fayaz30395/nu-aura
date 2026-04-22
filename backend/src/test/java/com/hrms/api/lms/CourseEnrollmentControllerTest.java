package com.hrms.api.lms;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.lms.dto.CompletionStatsResponse;
import com.hrms.api.lms.dto.UpdateProgressRequest;
import com.hrms.application.lms.service.CourseEnrollmentService;
import com.hrms.common.exception.GlobalExceptionHandler;
import com.hrms.common.config.TestMeterRegistryConfig;
import com.hrms.common.security.*;
import com.hrms.domain.lms.CourseEnrollment;
import com.hrms.domain.lms.CourseEnrollment.EnrollmentStatus;
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
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(CourseEnrollmentController.class)
@ContextConfiguration(classes = {CourseEnrollmentController.class, GlobalExceptionHandler.class})
@Import(TestMeterRegistryConfig.class)
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("CourseEnrollmentController Unit Tests")
class CourseEnrollmentControllerTest {

    @MockitoBean
    private JpaMetamodelMappingContext jpaMetamodelMappingContext;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private CourseEnrollmentService enrollmentService;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockitoBean
    private TenantFilter tenantFilter;

    private UUID courseId;
    private UUID employeeId;
    private UUID enrollmentId;
    private UUID tenantId;
    private CourseEnrollment sampleEnrollment;

    @BeforeEach
    void setUp() {
        courseId = UUID.randomUUID();
        employeeId = UUID.randomUUID();
        enrollmentId = UUID.randomUUID();
        tenantId = UUID.randomUUID();

        sampleEnrollment = new CourseEnrollment();
        sampleEnrollment.setId(enrollmentId);
        sampleEnrollment.setTenantId(tenantId);
        sampleEnrollment.setCourseId(courseId);
        sampleEnrollment.setEmployeeId(employeeId);
        sampleEnrollment.setStatus(EnrollmentStatus.ENROLLED);
        sampleEnrollment.setProgressPercentage(BigDecimal.ZERO);
        sampleEnrollment.setEnrolledAt(LocalDateTime.now());
    }

    @Nested
    @DisplayName("Enroll Tests")
    class EnrollTests {

        @Test
        @DisplayName("Should enroll current employee in course and return 201")
        void shouldEnrollCurrentEmployee() throws Exception {
            try (var tenantCtx = org.mockito.Mockito.mockStatic(TenantContext.class);
                 var secCtx = org.mockito.Mockito.mockStatic(SecurityContext.class)) {
                tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
                secCtx.when(SecurityContext::getCurrentUserId).thenReturn(UUID.randomUUID());
                secCtx.when(SecurityContext::getCurrentEmployeeId).thenReturn(employeeId);

                when(enrollmentService.enroll(eq(tenantId), eq(courseId), eq(employeeId), any(UUID.class)))
                        .thenReturn(sampleEnrollment);

                mockMvc.perform(post("/api/v1/lms/courses/{courseId}/enroll", courseId))
                        .andExpect(status().isCreated())
                        .andExpect(jsonPath("$.courseId").value(courseId.toString()))
                        .andExpect(jsonPath("$.employeeId").value(employeeId.toString()))
                        .andExpect(jsonPath("$.status").value("ENROLLED"));
            }
        }

        @Test
        @DisplayName("Should enroll specific employee by admin")
        void shouldEnrollSpecificEmployee() throws Exception {
            UUID targetEmployeeId = UUID.randomUUID();
            sampleEnrollment.setEmployeeId(targetEmployeeId);

            try (var tenantCtx = org.mockito.Mockito.mockStatic(TenantContext.class);
                 var secCtx = org.mockito.Mockito.mockStatic(SecurityContext.class)) {
                tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
                secCtx.when(SecurityContext::getCurrentUserId).thenReturn(UUID.randomUUID());
                secCtx.when(SecurityContext::getCurrentEmployeeId).thenReturn(employeeId);

                when(enrollmentService.enroll(eq(tenantId), eq(courseId), eq(targetEmployeeId), any(UUID.class)))
                        .thenReturn(sampleEnrollment);

                mockMvc.perform(post("/api/v1/lms/courses/{courseId}/enroll", courseId)
                                .param("employeeId", targetEmployeeId.toString()))
                        .andExpect(status().isCreated())
                        .andExpect(jsonPath("$.employeeId").value(targetEmployeeId.toString()));
            }
        }
    }

    @Nested
    @DisplayName("Update Progress Tests")
    class UpdateProgressTests {

        @Test
        @DisplayName("Should update enrollment progress")
        void shouldUpdateProgress() throws Exception {
            sampleEnrollment.setProgressPercentage(new BigDecimal("75"));
            sampleEnrollment.setStatus(EnrollmentStatus.IN_PROGRESS);

            UpdateProgressRequest request = UpdateProgressRequest.builder()
                    .progressPercent(75)
                    .build();

            try (var tenantCtx = org.mockito.Mockito.mockStatic(TenantContext.class)) {
                tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
                when(enrollmentService.updateProgress(eq(tenantId), eq(enrollmentId), eq(75)))
                        .thenReturn(sampleEnrollment);

                mockMvc.perform(put("/api/v1/lms/enrollments/{enrollmentId}/progress", enrollmentId)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(request)))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.progressPercentage").value(75));
            }
        }

        @Test
        @DisplayName("Should return 400 when progress is missing")
        void shouldReturn400WhenProgressMissing() throws Exception {
            mockMvc.perform(put("/api/v1/lms/enrollments/{enrollmentId}/progress", enrollmentId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{}"))
                    .andExpect(status().isBadRequest());
        }
    }

    @Nested
    @DisplayName("Get Enrollments Tests")
    class GetEnrollmentsTests {

        @Test
        @DisplayName("Should get my enrollments")
        void shouldGetMyEnrollments() throws Exception {
            try (var tenantCtx = org.mockito.Mockito.mockStatic(TenantContext.class);
                 var secCtx = org.mockito.Mockito.mockStatic(SecurityContext.class)) {
                tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
                secCtx.when(SecurityContext::getCurrentEmployeeId).thenReturn(employeeId);

                when(enrollmentService.getMyEnrollments(tenantId, employeeId))
                        .thenReturn(List.of(sampleEnrollment));

                mockMvc.perform(get("/api/v1/lms/my-courses"))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.length()").value(1))
                        .andExpect(jsonPath("$[0].courseId").value(courseId.toString()));
            }
        }

        @Test
        @DisplayName("Should get course enrollments for admin with pagination")
        void shouldGetCourseEnrollments() throws Exception {
            Page<CourseEnrollment> page = new PageImpl<>(
                    List.of(sampleEnrollment),
                    PageRequest.of(0, 20),
                    1);

            try (var tenantCtx = org.mockito.Mockito.mockStatic(TenantContext.class)) {
                tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
                when(enrollmentService.getCourseEnrollments(eq(tenantId), eq(courseId), any(PageRequest.class)))
                        .thenReturn(page);

                mockMvc.perform(get("/api/v1/lms/courses/{courseId}/enrollments", courseId))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.content.length()").value(1));
            }
        }
    }

    @Nested
    @DisplayName("Completion Stats Tests")
    class CompletionStatsTests {

        @Test
        @DisplayName("Should get completion stats for a course")
        void shouldGetCompletionStats() throws Exception {
            CompletionStatsResponse stats = CompletionStatsResponse.builder()
                    .courseId(courseId)
                    .totalEnrolled(50)
                    .completedCount(20)
                    .avgProgress(65.0)
                    .build();

            try (var tenantCtx = org.mockito.Mockito.mockStatic(TenantContext.class)) {
                tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
                when(enrollmentService.getCompletionStats(tenantId, courseId)).thenReturn(stats);

                mockMvc.perform(get("/api/v1/lms/courses/{courseId}/enrollments/stats", courseId))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.totalEnrolled").value(50))
                        .andExpect(jsonPath("$.completedCount").value(20))
                        .andExpect(jsonPath("$.avgProgress").value(65.0));
            }
        }
    }

    @Nested
    @DisplayName("Permission Annotation Tests")
    class PermissionAnnotationTests {

        @Test
        @DisplayName("enroll should have LMS_ENROLL permission")
        void enrollShouldRequireLmsEnroll() throws Exception {
            var method = CourseEnrollmentController.class.getMethod("enroll", UUID.class, UUID.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);
            Assertions.assertNotNull(annotation, "enroll must have @RequiresPermission");
            Assertions.assertEquals(Permission.LMS_ENROLL, annotation.value()[0]);
        }

        @Test
        @DisplayName("getCourseEnrollments should have LMS_COURSE_MANAGE permission")
        void getCourseEnrollmentsShouldRequireManage() throws Exception {
            var method = CourseEnrollmentController.class.getMethod(
                    "getCourseEnrollments", UUID.class, int.class, int.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);
            Assertions.assertNotNull(annotation, "getCourseEnrollments must have @RequiresPermission");
            Assertions.assertEquals(Permission.LMS_COURSE_MANAGE, annotation.value()[0]);
        }

        @Test
        @DisplayName("getCompletionStats should have LMS_COURSE_MANAGE permission")
        void getCompletionStatsShouldRequireManage() throws Exception {
            var method = CourseEnrollmentController.class.getMethod("getCompletionStats", UUID.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);
            Assertions.assertNotNull(annotation, "getCompletionStats must have @RequiresPermission");
            Assertions.assertEquals(Permission.LMS_COURSE_MANAGE, annotation.value()[0]);
        }
    }
}
