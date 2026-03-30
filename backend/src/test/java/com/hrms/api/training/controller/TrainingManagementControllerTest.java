package com.hrms.api.training.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.training.dto.*;
import com.hrms.application.training.service.TrainingManagementService;
import com.hrms.common.exception.GlobalExceptionHandler;
import com.hrms.common.security.*;
import com.hrms.domain.training.TrainingEnrollment;
import com.hrms.domain.training.TrainingProgram;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(TrainingManagementController.class)
@ContextConfiguration(classes = {TrainingManagementController.class, GlobalExceptionHandler.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("TrainingManagementController Unit Tests")
class TrainingManagementControllerTest {

    @MockitoBean
    private JpaMetamodelMappingContext jpaMetamodelMappingContext;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private TrainingManagementService trainingService;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockitoBean
    private TenantFilter tenantFilter;

    private UUID programId;
    private UUID enrollmentId;
    private UUID employeeId;
    private TrainingProgramRequest programRequest;
    private TrainingProgramResponse programResponse;
    private TrainingEnrollmentRequest enrollmentRequest;
    private TrainingEnrollmentResponse enrollmentResponse;

    @BeforeEach
    void setUp() {
        programId = UUID.randomUUID();
        enrollmentId = UUID.randomUUID();
        employeeId = UUID.randomUUID();

        programRequest = new TrainingProgramRequest();
        programRequest.setProgramCode("TRN-001");
        programRequest.setProgramName("Java Advanced Spring Boot");
        programRequest.setDescription("Deep dive into Spring Boot 3.x features");
        programRequest.setCategory(TrainingProgram.TrainingCategory.TECHNICAL);
        programRequest.setDeliveryMode(TrainingProgram.DeliveryMode.VIRTUAL);
        programRequest.setDurationHours(40);
        programRequest.setMaxParticipants(20);
        programRequest.setStartDate(LocalDate.of(2026, 11, 1));
        programRequest.setEndDate(LocalDate.of(2026, 12, 31));
        programRequest.setCost(new BigDecimal("500.00"));
        programRequest.setStatus(TrainingProgram.ProgramStatus.SCHEDULED);

        programResponse = TrainingProgramResponse.builder()
                .id(programId)
                .programCode("TRN-001")
                .programName("Java Advanced Spring Boot")
                .description("Deep dive into Spring Boot 3.x features")
                .category(TrainingProgram.TrainingCategory.TECHNICAL)
                .deliveryMode(TrainingProgram.DeliveryMode.VIRTUAL)
                .durationHours(40)
                .maxParticipants(20)
                .currentEnrollments(0)
                .startDate(LocalDate.of(2026, 11, 1))
                .endDate(LocalDate.of(2026, 12, 31))
                .cost(new BigDecimal("500.00"))
                .status(TrainingProgram.ProgramStatus.SCHEDULED)
                .createdAt(LocalDateTime.now())
                .build();

        enrollmentRequest = new TrainingEnrollmentRequest();
        enrollmentRequest.setProgramId(programId);
        enrollmentRequest.setEmployeeId(employeeId);
        enrollmentRequest.setEnrollmentDate(LocalDate.now());
        enrollmentRequest.setNotes("Approved by manager");

        enrollmentResponse = TrainingEnrollmentResponse.builder()
                .id(enrollmentId)
                .programId(programId)
                .programName("Java Advanced Spring Boot")
                .employeeId(employeeId)
                .employeeName("John Smith")
                .enrollmentDate(LocalDate.now())
                .status(TrainingEnrollment.EnrollmentStatus.ENROLLED)
                .createdAt(LocalDateTime.now())
                .build();
    }

    @Nested
    @DisplayName("Program Management Tests")
    class ProgramManagementTests {

        @Test
        @DisplayName("Should create training program successfully")
        void shouldCreateProgramSuccessfully() throws Exception {
            when(trainingService.createProgram(any(TrainingProgramRequest.class)))
                    .thenReturn(programResponse);

            mockMvc.perform(post("/api/v1/training/programs")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(programRequest)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.id").value(programId.toString()))
                    .andExpect(jsonPath("$.programCode").value("TRN-001"))
                    .andExpect(jsonPath("$.programName").value("Java Advanced Spring Boot"))
                    .andExpect(jsonPath("$.status").value("SCHEDULED"));

            verify(trainingService).createProgram(any(TrainingProgramRequest.class));
        }

        @Test
        @DisplayName("Should return 400 when required fields are missing")
        void shouldReturn400WhenRequiredFieldsMissing() throws Exception {
            TrainingProgramRequest invalidRequest = new TrainingProgramRequest();
            // Missing required programCode, programName, category, deliveryMode

            mockMvc.perform(post("/api/v1/training/programs")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(invalidRequest)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("Should update training program")
        void shouldUpdateProgram() throws Exception {
            TrainingProgramResponse updatedResponse = TrainingProgramResponse.builder()
                    .id(programId)
                    .programName("Updated Program Name")
                    .status(TrainingProgram.ProgramStatus.IN_PROGRESS)
                    .build();

            when(trainingService.updateProgram(eq(programId), any(TrainingProgramRequest.class)))
                    .thenReturn(updatedResponse);

            mockMvc.perform(put("/api/v1/training/programs/{programId}", programId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(programRequest)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.programName").value("Updated Program Name"))
                    .andExpect(jsonPath("$.status").value("IN_PROGRESS"));

            verify(trainingService).updateProgram(eq(programId), any(TrainingProgramRequest.class));
        }

        @Test
        @DisplayName("Should get program by ID")
        void shouldGetProgramById() throws Exception {
            when(trainingService.getProgramById(programId)).thenReturn(programResponse);

            mockMvc.perform(get("/api/v1/training/programs/{programId}", programId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(programId.toString()))
                    .andExpect(jsonPath("$.programCode").value("TRN-001"));

            verify(trainingService).getProgramById(programId);
        }

        @Test
        @DisplayName("Should get all programs with pagination")
        void shouldGetAllPrograms() throws Exception {
            Page<TrainingProgramResponse> page = new PageImpl<>(
                    Collections.singletonList(programResponse),
                    PageRequest.of(0, 20),
                    1);

            when(trainingService.getAllPrograms(any(Pageable.class))).thenReturn(page);

            mockMvc.perform(get("/api/v1/training/programs")
                            .param("page", "0")
                            .param("size", "20"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content.length()").value(1))
                    .andExpect(jsonPath("$.content[0].programName").value("Java Advanced Spring Boot"));

            verify(trainingService).getAllPrograms(any(Pageable.class));
        }

        @Test
        @DisplayName("Should get programs by status")
        void shouldGetProgramsByStatus() throws Exception {
            when(trainingService.getProgramsByStatus(TrainingProgram.ProgramStatus.SCHEDULED))
                    .thenReturn(Collections.singletonList(programResponse));

            mockMvc.perform(get("/api/v1/training/programs/status/{status}",
                            TrainingProgram.ProgramStatus.SCHEDULED))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(1))
                    .andExpect(jsonPath("$[0].status").value("SCHEDULED"));

            verify(trainingService).getProgramsByStatus(TrainingProgram.ProgramStatus.SCHEDULED);
        }

        @Test
        @DisplayName("Should get in-progress programs")
        void shouldGetInProgressPrograms() throws Exception {
            TrainingProgramResponse inProgressProgram = TrainingProgramResponse.builder()
                    .id(UUID.randomUUID())
                    .programName("In Progress Program")
                    .status(TrainingProgram.ProgramStatus.IN_PROGRESS)
                    .build();

            when(trainingService.getProgramsByStatus(TrainingProgram.ProgramStatus.IN_PROGRESS))
                    .thenReturn(Collections.singletonList(inProgressProgram));

            mockMvc.perform(get("/api/v1/training/programs/status/{status}",
                            TrainingProgram.ProgramStatus.IN_PROGRESS))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[0].status").value("IN_PROGRESS"));
        }

        @Test
        @DisplayName("Should delete program")
        void shouldDeleteProgram() throws Exception {
            doNothing().when(trainingService).deleteProgram(programId);

            mockMvc.perform(delete("/api/v1/training/programs/{programId}", programId))
                    .andExpect(status().isNoContent());

            verify(trainingService).deleteProgram(programId);
        }
    }

    @Nested
    @DisplayName("Enrollment Tests")
    class EnrollmentTests {

        @Test
        @DisplayName("Should enroll employee in training program")
        void shouldEnrollEmployee() throws Exception {
            when(trainingService.enrollEmployee(any(TrainingEnrollmentRequest.class)))
                    .thenReturn(enrollmentResponse);

            mockMvc.perform(post("/api/v1/training/enrollments")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(enrollmentRequest)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.id").value(enrollmentId.toString()))
                    .andExpect(jsonPath("$.programId").value(programId.toString()))
                    .andExpect(jsonPath("$.employeeId").value(employeeId.toString()))
                    .andExpect(jsonPath("$.status").value("ENROLLED"));

            verify(trainingService).enrollEmployee(any(TrainingEnrollmentRequest.class));
        }

        @Test
        @DisplayName("Should return 400 when enrollment request is missing required fields")
        void shouldReturn400WhenEnrollmentMissingFields() throws Exception {
            TrainingEnrollmentRequest invalidRequest = new TrainingEnrollmentRequest();
            // Missing required programId and employeeId

            mockMvc.perform(post("/api/v1/training/enrollments")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(invalidRequest)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("Should update enrollment status to IN_PROGRESS")
        void shouldUpdateEnrollmentStatusToInProgress() throws Exception {
            TrainingEnrollmentResponse inProgressResponse = TrainingEnrollmentResponse.builder()
                    .id(enrollmentId)
                    .status(TrainingEnrollment.EnrollmentStatus.IN_PROGRESS)
                    .build();

            when(trainingService.updateEnrollmentStatus(
                    enrollmentId, TrainingEnrollment.EnrollmentStatus.IN_PROGRESS))
                    .thenReturn(inProgressResponse);

            mockMvc.perform(patch("/api/v1/training/enrollments/{enrollmentId}/status", enrollmentId)
                            .param("status", "IN_PROGRESS"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("IN_PROGRESS"));

            verify(trainingService).updateEnrollmentStatus(
                    enrollmentId, TrainingEnrollment.EnrollmentStatus.IN_PROGRESS);
        }

        @Test
        @DisplayName("Should update enrollment status to COMPLETED")
        void shouldUpdateEnrollmentStatusToCompleted() throws Exception {
            TrainingEnrollmentResponse completedResponse = TrainingEnrollmentResponse.builder()
                    .id(enrollmentId)
                    .status(TrainingEnrollment.EnrollmentStatus.COMPLETED)
                    .completionDate(LocalDate.now())
                    .scorePercentage(85)
                    .build();

            when(trainingService.updateEnrollmentStatus(
                    enrollmentId, TrainingEnrollment.EnrollmentStatus.COMPLETED))
                    .thenReturn(completedResponse);

            mockMvc.perform(patch("/api/v1/training/enrollments/{enrollmentId}/status", enrollmentId)
                            .param("status", "COMPLETED"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("COMPLETED"))
                    .andExpect(jsonPath("$.scorePercentage").value(85));
        }

        @Test
        @DisplayName("Should get enrollments by program")
        void shouldGetEnrollmentsByProgram() throws Exception {
            when(trainingService.getEnrollmentsByProgram(programId))
                    .thenReturn(Collections.singletonList(enrollmentResponse));

            mockMvc.perform(get("/api/v1/training/enrollments/program/{programId}", programId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(1))
                    .andExpect(jsonPath("$[0].programId").value(programId.toString()));

            verify(trainingService).getEnrollmentsByProgram(programId);
        }

        @Test
        @DisplayName("Should get enrollments by employee")
        void shouldGetEnrollmentsByEmployee() throws Exception {
            when(trainingService.getEnrollmentsByEmployee(employeeId))
                    .thenReturn(Collections.singletonList(enrollmentResponse));

            mockMvc.perform(get("/api/v1/training/enrollments/employee/{employeeId}", employeeId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(1))
                    .andExpect(jsonPath("$[0].employeeId").value(employeeId.toString()));

            verify(trainingService).getEnrollmentsByEmployee(employeeId);
        }

        @Test
        @DisplayName("Should return empty list when employee has no enrollments")
        void shouldReturnEmptyListWhenNoEnrollments() throws Exception {
            when(trainingService.getEnrollmentsByEmployee(employeeId)).thenReturn(Collections.emptyList());

            mockMvc.perform(get("/api/v1/training/enrollments/employee/{employeeId}", employeeId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(0));
        }
    }

    @Nested
    @DisplayName("Permission Annotation Tests")
    class PermissionAnnotationTests {

        @Test
        @DisplayName("createProgram should have TRAINING_CREATE permission")
        void createProgramShouldRequireTrainingCreate() throws Exception {
            var method = TrainingManagementController.class.getMethod(
                    "createProgram", TrainingProgramRequest.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);
            Assertions.assertNotNull(annotation, "createProgram must have @RequiresPermission");
            Assertions.assertEquals(Permission.TRAINING_CREATE, annotation.value());
        }

        @Test
        @DisplayName("getAllPrograms should have TRAINING_VIEW permission")
        void getAllProgramsShouldRequireTrainingView() throws Exception {
            var method = TrainingManagementController.class.getMethod(
                    "getAllPrograms", Pageable.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);
            Assertions.assertNotNull(annotation, "getAllPrograms must have @RequiresPermission");
            Assertions.assertEquals(Permission.TRAINING_VIEW, annotation.value());
        }

        @Test
        @DisplayName("enrollEmployee should have TRAINING_ENROLL permission")
        void enrollEmployeeShouldRequireTrainingEnroll() throws Exception {
            var method = TrainingManagementController.class.getMethod(
                    "enrollEmployee", TrainingEnrollmentRequest.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);
            Assertions.assertNotNull(annotation, "enrollEmployee must have @RequiresPermission");
            Assertions.assertEquals(Permission.TRAINING_ENROLL, annotation.value());
        }

        @Test
        @DisplayName("updateEnrollmentStatus should have TRAINING_APPROVE permission")
        void updateEnrollmentStatusShouldRequireTrainingApprove() throws Exception {
            var method = TrainingManagementController.class.getMethod(
                    "updateEnrollmentStatus", UUID.class, TrainingEnrollment.EnrollmentStatus.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);
            Assertions.assertNotNull(annotation, "updateEnrollmentStatus must have @RequiresPermission");
            Assertions.assertEquals(Permission.TRAINING_APPROVE, annotation.value());
        }
    }
}
