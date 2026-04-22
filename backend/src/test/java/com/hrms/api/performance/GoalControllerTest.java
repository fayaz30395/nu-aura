package com.hrms.api.performance;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.application.performance.dto.GoalRequest;
import com.hrms.application.performance.dto.GoalResponse;
import com.hrms.application.performance.service.GoalService;
import com.hrms.common.exception.GlobalExceptionHandler;
import com.hrms.common.config.TestMeterRegistryConfig;
import org.springframework.context.annotation.Import;
import com.hrms.common.security.*;
import com.hrms.domain.performance.Goal;
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

@WebMvcTest(GoalController.class)
@ContextConfiguration(classes = {GoalController.class, GlobalExceptionHandler.class})
@Import(TestMeterRegistryConfig.class)
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("GoalController Unit Tests")
class GoalControllerTest {

    @MockitoBean
    private JpaMetamodelMappingContext jpaMetamodelMappingContext;


    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private GoalService goalService;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockitoBean
    private TenantFilter tenantFilter;

    private UUID goalId;
    private UUID employeeId;
    private UUID managerId;
    private UUID approverId;
    private GoalRequest goalRequest;
    private GoalResponse goalResponse;

    @BeforeEach
    void setUp() {
        goalId = UUID.randomUUID();
        employeeId = UUID.randomUUID();
        managerId = UUID.randomUUID();
        approverId = UUID.randomUUID();

        goalRequest = GoalRequest.builder()
                .employeeId(employeeId)
                .title("Increase sales revenue by 20%")
                .description("Drive growth in Q4")
                .goalType(Goal.GoalType.KPI)
                .category("Sales")
                .targetValue(new BigDecimal("120"))
                .currentValue(new BigDecimal("100"))
                .measurementUnit("percent")
                .startDate(LocalDate.of(2026, 10, 1))
                .dueDate(LocalDate.of(2026, 12, 31))
                .status(Goal.GoalStatus.ACTIVE)
                .progressPercentage(0)
                .weight(100)
                .build();

        goalResponse = GoalResponse.builder()
                .id(goalId)
                .employeeId(employeeId)
                .employeeName("Jane Doe")
                .title("Increase sales revenue by 20%")
                .description("Drive growth in Q4")
                .goalType(Goal.GoalType.KPI)
                .category("Sales")
                .targetValue(new BigDecimal("120"))
                .currentValue(new BigDecimal("100"))
                .measurementUnit("percent")
                .startDate(LocalDate.of(2026, 10, 1))
                .dueDate(LocalDate.of(2026, 12, 31))
                .status(Goal.GoalStatus.ACTIVE)
                .progressPercentage(0)
                .weight(100)
                .createdAt(LocalDateTime.now())
                .build();
    }

    @Nested
    @DisplayName("Create Goal Tests")
    class CreateGoalTests {

        @Test
        @DisplayName("Should create goal successfully")
        void shouldCreateGoalSuccessfully() throws Exception {
            when(goalService.createGoal(any(GoalRequest.class))).thenReturn(goalResponse);

            mockMvc.perform(post("/api/v1/goals")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(goalRequest)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.id").value(goalId.toString()))
                    .andExpect(jsonPath("$.title").value("Increase sales revenue by 20%"))
                    .andExpect(jsonPath("$.goalType").value("KPI"))
                    .andExpect(jsonPath("$.status").value("ACTIVE"));

            verify(goalService).createGoal(any(GoalRequest.class));
        }

        @Test
        @DisplayName("Should create personal development goal")
        void shouldCreatePersonalGoal() throws Exception {
            GoalRequest personalRequest = GoalRequest.builder()
                    .employeeId(employeeId)
                    .title("Complete AWS certification")
                    .goalType(Goal.GoalType.PERSONAL)
                    .dueDate(LocalDate.of(2026, 12, 31))
                    .build();

            GoalResponse personalResponse = GoalResponse.builder()
                    .id(UUID.randomUUID())
                    .title("Complete AWS certification")
                    .goalType(Goal.GoalType.PERSONAL)
                    .status(Goal.GoalStatus.DRAFT)
                    .build();

            when(goalService.createGoal(any(GoalRequest.class))).thenReturn(personalResponse);

            mockMvc.perform(post("/api/v1/goals")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(personalRequest)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.goalType").value("PERSONAL"));
        }

        @Test
        @DisplayName("Should return 400 when request body is missing")
        void shouldReturn400WhenBodyMissing() throws Exception {
            mockMvc.perform(post("/api/v1/goals")
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isBadRequest());
        }
    }

    @Nested
    @DisplayName("Get Goal Tests")
    class GetGoalTests {

        @Test
        @DisplayName("Should get all goals with pagination and default sort")
        void shouldGetAllGoalsWithPagination() throws Exception {
            Page<GoalResponse> page = new PageImpl<>(
                    Collections.singletonList(goalResponse),
                    PageRequest.of(0, 20, Sort.by(Sort.Direction.DESC, "createdAt")),
                    1);

            when(goalService.getAllGoals(any(Pageable.class))).thenReturn(page);

            mockMvc.perform(get("/api/v1/goals")
                            .param("page", "0")
                            .param("size", "20"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content.length()").value(1))
                    .andExpect(jsonPath("$.content[0].title").value("Increase sales revenue by 20%"));

            verify(goalService).getAllGoals(any(Pageable.class));
        }

        @Test
        @DisplayName("Should get goal by ID")
        void shouldGetGoalById() throws Exception {
            when(goalService.getGoalById(goalId)).thenReturn(goalResponse);

            mockMvc.perform(get("/api/v1/goals/{id}", goalId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(goalId.toString()))
                    .andExpect(jsonPath("$.employeeName").value("Jane Doe"));

            verify(goalService).getGoalById(goalId);
        }

        @Test
        @DisplayName("Should get employee goals")
        void shouldGetEmployeeGoals() throws Exception {
            when(goalService.getEmployeeGoals(employeeId))
                    .thenReturn(Collections.singletonList(goalResponse));

            mockMvc.perform(get("/api/v1/goals/employee/{employeeId}", employeeId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(1))
                    .andExpect(jsonPath("$[0].employeeId").value(employeeId.toString()));

            verify(goalService).getEmployeeGoals(employeeId);
        }

        @Test
        @DisplayName("Should get employee goals paged")
        void shouldGetEmployeeGoalsPaged() throws Exception {
            Page<GoalResponse> page = new PageImpl<>(
                    Collections.singletonList(goalResponse),
                    PageRequest.of(0, 10),
                    1);

            when(goalService.getEmployeeGoalsPaged(eq(employeeId), any(Pageable.class)))
                    .thenReturn(page);

            mockMvc.perform(get("/api/v1/goals/employee/{employeeId}/paged", employeeId)
                            .param("page", "0")
                            .param("size", "10"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content.length()").value(1));

            verify(goalService).getEmployeeGoalsPaged(eq(employeeId), any(Pageable.class));
        }

        @Test
        @DisplayName("Should get team goals by manager")
        void shouldGetTeamGoals() throws Exception {
            GoalResponse teamGoal = GoalResponse.builder()
                    .id(UUID.randomUUID())
                    .title("Team Q4 Revenue Target")
                    .goalType(Goal.GoalType.TEAM)
                    .build();

            when(goalService.getTeamGoals(managerId))
                    .thenReturn(Collections.singletonList(teamGoal));

            mockMvc.perform(get("/api/v1/goals/team/{managerId}", managerId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(1))
                    .andExpect(jsonPath("$[0].goalType").value("TEAM"));

            verify(goalService).getTeamGoals(managerId);
        }

        @Test
        @DisplayName("Should get team goals paged")
        void shouldGetTeamGoalsPaged() throws Exception {
            Page<GoalResponse> page = new PageImpl<>(
                    Collections.singletonList(goalResponse),
                    PageRequest.of(0, 10),
                    1);

            when(goalService.getTeamGoalsPaged(eq(managerId), any(Pageable.class)))
                    .thenReturn(page);

            mockMvc.perform(get("/api/v1/goals/team/{managerId}/paged", managerId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content.length()").value(1));

            verify(goalService).getTeamGoalsPaged(eq(managerId), any(Pageable.class));
        }

        @Test
        @DisplayName("Should get goal analytics")
        void shouldGetGoalAnalytics() throws Exception {
            Map<String, Object> analytics = new HashMap<>();
            analytics.put("totalGoals", 50);
            analytics.put("completedGoals", 20);
            analytics.put("activeGoals", 25);
            analytics.put("averageProgress", 60);

            when(goalService.getGoalAnalytics()).thenReturn(analytics);

            mockMvc.perform(get("/api/v1/goals/analytics"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.totalGoals").value(50))
                    .andExpect(jsonPath("$.completedGoals").value(20));

            verify(goalService).getGoalAnalytics();
        }
    }

    @Nested
    @DisplayName("Update Goal Tests")
    class UpdateGoalTests {

        @Test
        @DisplayName("Should update goal successfully")
        void shouldUpdateGoal() throws Exception {
            GoalResponse updatedResponse = GoalResponse.builder()
                    .id(goalId)
                    .title("Updated goal title")
                    .goalType(Goal.GoalType.KPI)
                    .status(Goal.GoalStatus.ACTIVE)
                    .build();

            when(goalService.updateGoal(eq(goalId), any(GoalRequest.class)))
                    .thenReturn(updatedResponse);

            mockMvc.perform(put("/api/v1/goals/{id}", goalId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(goalRequest)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.title").value("Updated goal title"));

            verify(goalService).updateGoal(eq(goalId), any(GoalRequest.class));
        }
    }

    @Nested
    @DisplayName("Goal Progress Tests")
    class GoalProgressTests {

        @Test
        @DisplayName("Should update goal progress")
        void shouldUpdateGoalProgress() throws Exception {
            GoalResponse progressResponse = GoalResponse.builder()
                    .id(goalId)
                    .title("Increase sales revenue by 20%")
                    .progressPercentage(50)
                    .status(Goal.GoalStatus.ACTIVE)
                    .build();

            when(goalService.updateProgress(goalId, 50)).thenReturn(progressResponse);

            mockMvc.perform(put("/api/v1/goals/{id}/progress", goalId)
                            .param("progressPercentage", "50"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.progressPercentage").value(50));

            verify(goalService).updateProgress(goalId, 50);
        }

        @Test
        @DisplayName("Should update goal progress to 100 percent (completed)")
        void shouldUpdateGoalProgressTo100() throws Exception {
            GoalResponse completedResponse = GoalResponse.builder()
                    .id(goalId)
                    .progressPercentage(100)
                    .status(Goal.GoalStatus.COMPLETED)
                    .build();

            when(goalService.updateProgress(goalId, 100)).thenReturn(completedResponse);

            mockMvc.perform(put("/api/v1/goals/{id}/progress", goalId)
                            .param("progressPercentage", "100"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.progressPercentage").value(100));
        }
    }

    @Nested
    @DisplayName("Goal Approval Tests")
    class GoalApprovalTests {

        @Test
        @DisplayName("Should approve goal")
        void shouldApproveGoal() throws Exception {
            GoalResponse approvedResponse = GoalResponse.builder()
                    .id(goalId)
                    .title("Increase sales revenue by 20%")
                    .approvedBy(approverId)
                    .status(Goal.GoalStatus.ACTIVE)
                    .build();

            SecurityContext.setCurrentUser(UUID.randomUUID(), approverId,
                    java.util.Set.of("HR_MANAGER"), java.util.Map.of());
            when(goalService.approveGoal(eq(goalId), eq(approverId))).thenReturn(approvedResponse);

            mockMvc.perform(put("/api/v1/goals/{id}/approve", goalId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.approvedBy").value(approverId.toString()));

            verify(goalService).approveGoal(eq(goalId), eq(approverId));
            SecurityContext.clear();
        }
    }

    @Nested
    @DisplayName("Permission Annotation Tests")
    class PermissionAnnotationTests {

        @Test
        @DisplayName("createGoal should have GOAL_CREATE permission")
        void createGoalShouldRequireGoalCreate() throws Exception {
            var method = GoalController.class.getMethod("createGoal", GoalRequest.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);
            Assertions.assertNotNull(annotation, "createGoal must have @RequiresPermission");
            Assertions.assertEquals(Permission.GOAL_CREATE, annotation.value()[0]);
        }

        @Test
        @DisplayName("approveGoal should have GOAL_APPROVE permission")
        void approveGoalShouldRequireGoalApprove() throws Exception {
            var method = GoalController.class.getMethod("approveGoal", UUID.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);
            Assertions.assertNotNull(annotation, "approveGoal must have @RequiresPermission");
            Assertions.assertEquals(Permission.GOAL_APPROVE, annotation.value()[0]);
        }

        @Test
        @DisplayName("getAllGoals should have GOAL_VIEW permission")
        void getAllGoalsShouldRequireReviewView() throws Exception {
            var method = GoalController.class.getMethod("getAllGoals",
                    int.class, int.class, String.class, String.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);
            Assertions.assertNotNull(annotation, "getAllGoals must have @RequiresPermission");
            Assertions.assertEquals(Permission.GOAL_VIEW, annotation.value()[0]);
        }
    }
}
