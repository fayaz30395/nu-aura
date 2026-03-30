package com.hrms.api.performance.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.performance.dto.*;
import com.hrms.application.performance.service.OkrService;
import com.hrms.common.exception.GlobalExceptionHandler;
import com.hrms.common.security.*;
import com.hrms.domain.performance.KeyResult;
import com.hrms.domain.performance.Objective;
import com.hrms.domain.performance.Objective.ObjectiveLevel;
import com.hrms.domain.performance.Objective.ObjectiveStatus;
import com.hrms.domain.performance.OkrCheckIn;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
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

@WebMvcTest(OkrController.class)
@ContextConfiguration(classes = {OkrController.class, GlobalExceptionHandler.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("OkrController Unit Tests")
class OkrControllerTest {

    @MockBean
    private JpaMetamodelMappingContext jpaMetamodelMappingContext;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private OkrService okrService;

    @MockBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockBean
    private TenantFilter tenantFilter;

    private UUID objectiveId;
    private UUID keyResultId;
    private UUID employeeId;
    private UUID tenantId;
    private Objective objective;
    private KeyResult keyResult;
    private ObjectiveRequest objectiveRequest;

    @BeforeEach
    void setUp() {
        objectiveId = UUID.randomUUID();
        keyResultId = UUID.randomUUID();
        employeeId = UUID.randomUUID();
        tenantId = UUID.randomUUID();

        // Set up SecurityContext and TenantContext for endpoints that use them
        SecurityContext.setCurrentUser(UUID.randomUUID(), employeeId, Set.of("HR_MANAGER"), Map.of());
        TenantContext.setCurrentTenant(tenantId);

        objective = Objective.builder()
                .id(objectiveId)
                .ownerId(employeeId)
                .title("Grow Platform Revenue")
                .description("Increase platform MRR by 30%")
                .startDate(LocalDate.of(2026, 10, 1))
                .endDate(LocalDate.of(2026, 12, 31))
                .level(ObjectiveLevel.INDIVIDUAL)
                .status(ObjectiveStatus.DRAFT)
                .weight(100)
                .isStretchGoal(false)
                .progressPercentage(BigDecimal.ZERO)
                .build();
        objective.setTenantId(tenantId);

        keyResult = KeyResult.builder()
                .id(keyResultId)
                .objectiveId(objectiveId)
                .ownerId(employeeId)
                .title("Achieve 1000 new subscriptions")
                .targetValue(new BigDecimal("1000"))
                .currentValue(BigDecimal.ZERO)
                .progressPercentage(BigDecimal.ZERO)
                .weight(100)
                .isMilestone(false)
                .build();
        keyResult.setTenantId(tenantId);

        objectiveRequest = ObjectiveRequest.builder()
                .title("Grow Platform Revenue")
                .description("Increase platform MRR by 30%")
                .startDate(LocalDate.of(2026, 10, 1))
                .endDate(LocalDate.of(2026, 12, 31))
                .objectiveLevel(ObjectiveLevel.INDIVIDUAL)
                .weight(100)
                .isStretchGoal(false)
                .build();
    }

    @AfterEach
    void tearDown() {
        SecurityContext.clear();
        TenantContext.clear();
    }

    @Nested
    @DisplayName("Objective CRUD Tests")
    class ObjectiveCrudTests {

        @Test
        @DisplayName("Should create objective successfully")
        void shouldCreateObjectiveSuccessfully() throws Exception {
            when(okrService.createObjective(any(Objective.class))).thenReturn(objective);

            mockMvc.perform(post("/api/v1/okr/objectives")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(objectiveRequest)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(objectiveId.toString()))
                    .andExpect(jsonPath("$.title").value("Grow Platform Revenue"))
                    .andExpect(jsonPath("$.status").value("DRAFT"));

            verify(okrService).createObjective(any(Objective.class));
        }

        @Test
        @DisplayName("Should create objective with key results")
        void shouldCreateObjectiveWithKeyResults() throws Exception {
            KeyResultRequest krRequest = KeyResultRequest.builder()
                    .title("Achieve 1000 new subscriptions")
                    .targetValue(new BigDecimal("1000"))
                    .measurementUnit("count")
                    .build();

            ObjectiveRequest requestWithKR = ObjectiveRequest.builder()
                    .title("Grow Platform Revenue")
                    .startDate(LocalDate.of(2026, 10, 1))
                    .endDate(LocalDate.of(2026, 12, 31))
                    .keyResults(Collections.singletonList(krRequest))
                    .build();

            when(okrService.createObjective(any(Objective.class))).thenReturn(objective);
            when(okrService.createKeyResult(any(KeyResult.class))).thenReturn(keyResult);

            mockMvc.perform(post("/api/v1/okr/objectives")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(requestWithKR)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(objectiveId.toString()));

            verify(okrService).createObjective(any(Objective.class));
            verify(okrService).createKeyResult(any(KeyResult.class));
        }

        @Test
        @DisplayName("Should get objective by ID")
        void shouldGetObjectiveById() throws Exception {
            when(okrService.getObjectiveById(tenantId, objectiveId))
                    .thenReturn(Optional.of(objective));

            mockMvc.perform(get("/api/v1/okr/objectives/{id}", objectiveId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(objectiveId.toString()))
                    .andExpect(jsonPath("$.title").value("Grow Platform Revenue"));

            verify(okrService).getObjectiveById(tenantId, objectiveId);
        }

        @Test
        @DisplayName("Should return 404 when objective not found")
        void shouldReturn404WhenObjectiveNotFound() throws Exception {
            when(okrService.getObjectiveById(tenantId, objectiveId)).thenReturn(Optional.empty());

            mockMvc.perform(get("/api/v1/okr/objectives/{id}", objectiveId))
                    .andExpect(status().isNotFound());
        }

        @Test
        @DisplayName("Should get all objectives with pagination")
        void shouldGetAllObjectives() throws Exception {
            Page<Objective> page = new PageImpl<>(
                    Collections.singletonList(objective),
                    PageRequest.of(0, 20),
                    1);

            when(okrService.getAllObjectives(eq(tenantId), any(Pageable.class))).thenReturn(page);

            mockMvc.perform(get("/api/v1/okr/objectives")
                            .param("page", "0")
                            .param("size", "20"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content.length()").value(1));

            verify(okrService).getAllObjectives(eq(tenantId), any(Pageable.class));
        }

        @Test
        @DisplayName("Should filter objectives by owner")
        void shouldFilterObjectivesByOwner() throws Exception {
            Page<Objective> page = new PageImpl<>(
                    Collections.singletonList(objective),
                    PageRequest.of(0, 20),
                    1);

            when(okrService.getObjectivesByOwner(eq(tenantId), eq(employeeId), any(Pageable.class)))
                    .thenReturn(page);

            mockMvc.perform(get("/api/v1/okr/objectives")
                            .param("ownerId", employeeId.toString()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content.length()").value(1));

            verify(okrService).getObjectivesByOwner(eq(tenantId), eq(employeeId), any(Pageable.class));
        }

        @Test
        @DisplayName("Should filter objectives by level")
        void shouldFilterObjectivesByLevel() throws Exception {
            Page<Objective> page = new PageImpl<>(
                    Collections.singletonList(objective),
                    PageRequest.of(0, 20),
                    1);

            when(okrService.getObjectivesByLevel(eq(tenantId), eq(ObjectiveLevel.INDIVIDUAL), any(Pageable.class)))
                    .thenReturn(page);

            mockMvc.perform(get("/api/v1/okr/objectives")
                            .param("level", "INDIVIDUAL"))
                    .andExpect(status().isOk());

            verify(okrService).getObjectivesByLevel(eq(tenantId), eq(ObjectiveLevel.INDIVIDUAL), any(Pageable.class));
        }

        @Test
        @DisplayName("Should get my objectives")
        void shouldGetMyObjectives() throws Exception {
            when(okrService.getObjectivesByOwnerList(tenantId, employeeId))
                    .thenReturn(Collections.singletonList(objective));

            mockMvc.perform(get("/api/v1/okr/objectives/my"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(1));

            verify(okrService).getObjectivesByOwnerList(tenantId, employeeId);
        }

        @Test
        @DisplayName("Should update objective")
        void shouldUpdateObjective() throws Exception {
            Objective updatedObjective = Objective.builder()
                    .id(objectiveId)
                    .ownerId(employeeId)
                    .title("Updated Objective Title")
                    .status(ObjectiveStatus.DRAFT)
                    .build();
            updatedObjective.setTenantId(tenantId);

            when(okrService.getObjectiveById(tenantId, objectiveId))
                    .thenReturn(Optional.of(objective));
            when(okrService.updateObjective(any(Objective.class))).thenReturn(updatedObjective);

            mockMvc.perform(put("/api/v1/okr/objectives/{id}", objectiveId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(objectiveRequest)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.title").value("Updated Objective Title"));

            verify(okrService).updateObjective(any(Objective.class));
        }

        @Test
        @DisplayName("Should return 404 when updating non-existent objective")
        void shouldReturn404WhenUpdatingNonExistentObjective() throws Exception {
            when(okrService.getObjectiveById(tenantId, objectiveId)).thenReturn(Optional.empty());

            mockMvc.perform(put("/api/v1/okr/objectives/{id}", objectiveId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(objectiveRequest)))
                    .andExpect(status().isNotFound());
        }

        @Test
        @DisplayName("Should update objective status")
        void shouldUpdateObjectiveStatus() throws Exception {
            Objective activeObjective = Objective.builder()
                    .id(objectiveId)
                    .title("Grow Platform Revenue")
                    .status(ObjectiveStatus.ACTIVE)
                    .build();
            activeObjective.setTenantId(tenantId);

            when(okrService.getObjectiveById(tenantId, objectiveId))
                    .thenReturn(Optional.of(objective));
            when(okrService.updateObjective(any(Objective.class))).thenReturn(activeObjective);

            mockMvc.perform(put("/api/v1/okr/objectives/{id}/status", objectiveId)
                            .param("status", "ACTIVE"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("ACTIVE"));

            verify(okrService).updateObjective(any(Objective.class));
        }

        @Test
        @DisplayName("Should approve objective")
        void shouldApproveObjective() throws Exception {
            Objective approvedObjective = Objective.builder()
                    .id(objectiveId)
                    .title("Grow Platform Revenue")
                    .status(ObjectiveStatus.ACTIVE)
                    .approvedBy(employeeId)
                    .build();
            approvedObjective.setTenantId(tenantId);

            when(okrService.getObjectiveById(tenantId, objectiveId))
                    .thenReturn(Optional.of(objective));
            when(okrService.updateObjective(any(Objective.class))).thenReturn(approvedObjective);

            mockMvc.perform(post("/api/v1/okr/objectives/{id}/approve", objectiveId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("ACTIVE"));

            verify(okrService).updateObjective(any(Objective.class));
        }

        @Test
        @DisplayName("Should delete objective")
        void shouldDeleteObjective() throws Exception {
            doNothing().when(okrService).deleteObjective(tenantId, objectiveId);

            mockMvc.perform(delete("/api/v1/okr/objectives/{id}", objectiveId))
                    .andExpect(status().isNoContent());

            verify(okrService).deleteObjective(tenantId, objectiveId);
        }
    }

    @Nested
    @DisplayName("Key Result CRUD Tests")
    class KeyResultCrudTests {

        @Test
        @DisplayName("Should add key result to objective")
        void shouldAddKeyResultToObjective() throws Exception {
            KeyResultRequest krRequest = KeyResultRequest.builder()
                    .title("Achieve 1000 new subscriptions")
                    .targetValue(new BigDecimal("1000"))
                    .measurementUnit("count")
                    .build();

            when(okrService.createKeyResult(any(KeyResult.class))).thenReturn(keyResult);

            mockMvc.perform(post("/api/v1/okr/objectives/{objectiveId}/key-results", objectiveId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(krRequest)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(keyResultId.toString()))
                    .andExpect(jsonPath("$.objectiveId").value(objectiveId.toString()));

            verify(okrService).createKeyResult(any(KeyResult.class));
        }

        @Test
        @DisplayName("Should get key results for objective")
        void shouldGetKeyResultsForObjective() throws Exception {
            when(okrService.getKeyResultsByObjective(tenantId, objectiveId))
                    .thenReturn(Collections.singletonList(keyResult));

            mockMvc.perform(get("/api/v1/okr/objectives/{objectiveId}/key-results", objectiveId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(1));

            verify(okrService).getKeyResultsByObjective(tenantId, objectiveId);
        }

        @Test
        @DisplayName("Should update key result")
        void shouldUpdateKeyResult() throws Exception {
            KeyResultRequest krRequest = KeyResultRequest.builder()
                    .title("Updated KR Title")
                    .targetValue(new BigDecimal("1500"))
                    .build();

            KeyResult updatedKR = KeyResult.builder()
                    .id(keyResultId)
                    .objectiveId(objectiveId)
                    .title("Updated KR Title")
                    .targetValue(new BigDecimal("1500"))
                    .build();
            updatedKR.setTenantId(tenantId);

            when(okrService.getKeyResultById(tenantId, keyResultId))
                    .thenReturn(Optional.of(keyResult));
            when(okrService.updateKeyResult(any(KeyResult.class))).thenReturn(updatedKR);

            mockMvc.perform(put("/api/v1/okr/key-results/{id}", keyResultId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(krRequest)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.title").value("Updated KR Title"));

            verify(okrService).updateKeyResult(any(KeyResult.class));
        }

        @Test
        @DisplayName("Should return 404 when updating non-existent key result")
        void shouldReturn404WhenUpdatingNonExistentKeyResult() throws Exception {
            KeyResultRequest krRequest = KeyResultRequest.builder()
                    .title("Some Title")
                    .build();

            when(okrService.getKeyResultById(tenantId, keyResultId)).thenReturn(Optional.empty());

            mockMvc.perform(put("/api/v1/okr/key-results/{id}", keyResultId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(krRequest)))
                    .andExpect(status().isNotFound());
        }

        @Test
        @DisplayName("Should delete key result")
        void shouldDeleteKeyResult() throws Exception {
            doNothing().when(okrService).deleteKeyResult(tenantId, keyResultId);

            mockMvc.perform(delete("/api/v1/okr/key-results/{id}", keyResultId))
                    .andExpect(status().isNoContent());

            verify(okrService).deleteKeyResult(tenantId, keyResultId);
        }
    }

    @Nested
    @DisplayName("Progress Tracking Tests")
    class ProgressTrackingTests {

        @Test
        @DisplayName("Should update key result progress")
        void shouldUpdateKeyResultProgress() throws Exception {
            BigDecimal newValue = new BigDecimal("500");

            KeyResult updatedKR = KeyResult.builder()
                    .id(keyResultId)
                    .objectiveId(objectiveId)
                    .currentValue(newValue)
                    .progressPercentage(new BigDecimal("50"))
                    .build();
            updatedKR.setTenantId(tenantId);

            when(okrService.getKeyResultById(tenantId, keyResultId))
                    .thenReturn(Optional.of(keyResult));
            when(okrService.updateKeyResult(any(KeyResult.class))).thenReturn(updatedKR);
            when(okrService.createCheckIn(any(OkrCheckIn.class))).thenReturn(new OkrCheckIn());
            doNothing().when(okrService).recalculateObjectiveProgress(tenantId, objectiveId);

            mockMvc.perform(put("/api/v1/okr/key-results/{id}/progress", keyResultId)
                            .param("value", "500"))
                    .andExpect(status().isOk());

            verify(okrService).updateKeyResult(any(KeyResult.class));
            verify(okrService).createCheckIn(any(OkrCheckIn.class));
            verify(okrService).recalculateObjectiveProgress(tenantId, objectiveId);
        }

        @Test
        @DisplayName("Should create a manual check-in")
        void shouldCreateManualCheckIn() throws Exception {
            CheckInRequest checkInRequest = CheckInRequest.builder()
                    .objectiveId(objectiveId)
                    .keyResultId(keyResultId)
                    .newValue(new BigDecimal("500"))
                    .newProgress(new BigDecimal("50"))
                    .notes("Good progress this week")
                    .build();

            OkrCheckIn savedCheckIn = OkrCheckIn.builder()
                    .id(UUID.randomUUID())
                    .objectiveId(objectiveId)
                    .keyResultId(keyResultId)
                    .employeeId(employeeId)
                    .checkInDate(LocalDateTime.now())
                    .build();
            savedCheckIn.setTenantId(tenantId);

            when(okrService.createCheckIn(any(OkrCheckIn.class))).thenReturn(savedCheckIn);

            mockMvc.perform(post("/api/v1/okr/check-ins")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(checkInRequest)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.objectiveId").value(objectiveId.toString()));

            verify(okrService).createCheckIn(any(OkrCheckIn.class));
        }

        @Test
        @DisplayName("Should get check-ins for objective")
        void shouldGetCheckInsForObjective() throws Exception {
            OkrCheckIn checkIn = OkrCheckIn.builder()
                    .id(UUID.randomUUID())
                    .objectiveId(objectiveId)
                    .employeeId(employeeId)
                    .checkInDate(LocalDateTime.now())
                    .build();
            checkIn.setTenantId(tenantId);

            when(okrService.getCheckInsByObjective(tenantId, objectiveId))
                    .thenReturn(Collections.singletonList(checkIn));

            mockMvc.perform(get("/api/v1/okr/objectives/{objectiveId}/check-ins", objectiveId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(1));

            verify(okrService).getCheckInsByObjective(tenantId, objectiveId);
        }

        @Test
        @DisplayName("Should get check-ins for key result")
        void shouldGetCheckInsForKeyResult() throws Exception {
            OkrCheckIn checkIn = OkrCheckIn.builder()
                    .id(UUID.randomUUID())
                    .keyResultId(keyResultId)
                    .employeeId(employeeId)
                    .checkInDate(LocalDateTime.now())
                    .build();
            checkIn.setTenantId(tenantId);

            when(okrService.getCheckInsByKeyResult(tenantId, keyResultId))
                    .thenReturn(Collections.singletonList(checkIn));

            mockMvc.perform(get("/api/v1/okr/key-results/{keyResultId}/check-ins", keyResultId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(1));

            verify(okrService).getCheckInsByKeyResult(tenantId, keyResultId);
        }
    }

    @Nested
    @DisplayName("OKR Dashboard and Company Objectives Tests")
    class DashboardAndCompanyTests {

        @Test
        @DisplayName("Should get OKR dashboard summary")
        void shouldGetDashboardSummary() throws Exception {
            Map<String, Object> summary = new HashMap<>();
            summary.put("totalObjectives", 10);
            summary.put("completedObjectives", 4);
            summary.put("averageProgress", 55.0);

            when(okrService.getOkrSummary(tenantId, employeeId)).thenReturn(summary);

            mockMvc.perform(get("/api/v1/okr/dashboard/summary"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.totalObjectives").value(10));

            verify(okrService).getOkrSummary(tenantId, employeeId);
        }

        @Test
        @DisplayName("Should get company-level objectives")
        void shouldGetCompanyObjectives() throws Exception {
            Objective companyObj = Objective.builder()
                    .id(UUID.randomUUID())
                    .title("Company-wide Revenue Target")
                    .level(ObjectiveLevel.COMPANY)
                    .status(ObjectiveStatus.ACTIVE)
                    .build();
            companyObj.setTenantId(tenantId);

            when(okrService.getCompanyObjectives(tenantId))
                    .thenReturn(Collections.singletonList(companyObj));

            mockMvc.perform(get("/api/v1/okr/company/objectives"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(1))
                    .andExpect(jsonPath("$[0].objectiveLevel").value("COMPANY"));

            verify(okrService).getCompanyObjectives(tenantId);
        }
    }

    @Nested
    @DisplayName("Permission Annotation Tests")
    class PermissionAnnotationTests {

        @Test
        @DisplayName("createObjective should have OKR_CREATE permission")
        void createObjectiveShouldRequireOkrCreate() throws Exception {
            var method = OkrController.class.getMethod("createObjective", ObjectiveRequest.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);
            Assertions.assertNotNull(annotation, "createObjective must have @RequiresPermission");
            Assertions.assertEquals(Permission.OKR_CREATE, annotation.value());
        }

        @Test
        @DisplayName("getObjectives should have OKR_VIEW permission")
        void getObjectivesShouldRequireOkrView() throws Exception {
            var method = OkrController.class.getMethod("getObjectives",
                    ObjectiveLevel.class, ObjectiveStatus.class, UUID.class, UUID.class, Pageable.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);
            Assertions.assertNotNull(annotation, "getObjectives must have @RequiresPermission");
            Assertions.assertEquals(Permission.OKR_VIEW, annotation.value());
        }

        @Test
        @DisplayName("approveObjective should have OKR_APPROVE permission")
        void approveObjectiveShouldRequireOkrApprove() throws Exception {
            var method = OkrController.class.getMethod("approveObjective", UUID.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);
            Assertions.assertNotNull(annotation, "approveObjective must have @RequiresPermission");
            Assertions.assertEquals(Permission.OKR_APPROVE, annotation.value());
        }

        @Test
        @DisplayName("getCompanyObjectives should have OKR_VIEW_ALL permission")
        void getCompanyObjectivesShouldRequireOkrViewAll() throws Exception {
            var method = OkrController.class.getMethod("getCompanyObjectives");
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);
            Assertions.assertNotNull(annotation, "getCompanyObjectives must have @RequiresPermission");
            Assertions.assertEquals(Permission.OKR_VIEW_ALL, annotation.value());
        }
    }
}
