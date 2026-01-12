package com.hrms.application.performance.service;

import com.hrms.application.performance.dto.GoalRequest;
import com.hrms.application.performance.dto.GoalResponse;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.performance.Goal;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.performance.repository.GoalRepository;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("GoalService Tests")
class GoalServiceTest {

    @Mock
    private GoalRepository goalRepository;

    @Mock
    private EmployeeRepository employeeRepository;

    @InjectMocks
    private GoalService goalService;

    private static MockedStatic<TenantContext> tenantContextMock;

    private UUID tenantId;
    private UUID employeeId;
    private UUID goalId;
    private UUID managerId;
    private Goal goal;
    private Employee employee;

    @BeforeAll
    static void setUpClass() {
        tenantContextMock = mockStatic(TenantContext.class);
    }

    @AfterAll
    static void tearDownClass() {
        tenantContextMock.close();
    }

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
        employeeId = UUID.randomUUID();
        goalId = UUID.randomUUID();
        managerId = UUID.randomUUID();

        tenantContextMock.when(TenantContext::getCurrentTenant).thenReturn(tenantId);

        // Setup employee
        employee = new Employee();
        employee.setId(employeeId);
        employee.setFirstName("John");
        employee.setLastName("Doe");

        // Setup goal
        goal = Goal.builder()
                .employeeId(employeeId)
                .title("Increase Sales by 20%")
                .description("Achieve 20% increase in sales this quarter")
                .goalType(Goal.GoalType.KPI)
                .category("Sales")
                .targetValue(new BigDecimal("120"))
                .currentValue(new BigDecimal("100"))
                .measurementUnit("percentage")
                .startDate(LocalDate.now())
                .dueDate(LocalDate.now().plusMonths(3))
                .status(Goal.GoalStatus.ACTIVE)
                .progressPercentage(50)
                .weight(100)
                .build();
        goal.setId(goalId);
        goal.setTenantId(tenantId);
        goal.setCreatedAt(LocalDateTime.now());
        goal.setUpdatedAt(LocalDateTime.now());
    }

    @Nested
    @DisplayName("Create Goal Tests")
    class CreateGoalTests {

        @Test
        @DisplayName("Should create goal successfully")
        void shouldCreateGoalSuccessfully() {
            GoalRequest request = new GoalRequest();
            request.setEmployeeId(employeeId);
            request.setTitle("Complete Project Alpha");
            request.setDescription("Deliver Project Alpha by Q2");
            request.setGoalType(Goal.GoalType.TEAM);
            request.setCategory("Projects");
            request.setTargetValue(new BigDecimal("100"));
            request.setStartDate(LocalDate.now());
            request.setDueDate(LocalDate.now().plusMonths(6));

            when(goalRepository.save(any(Goal.class))).thenAnswer(invocation -> {
                Goal saved = invocation.getArgument(0);
                saved.setId(UUID.randomUUID());
                saved.setCreatedAt(LocalDateTime.now());
                return saved;
            });
            when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(employee));

            GoalResponse result = goalService.createGoal(request);

            assertThat(result).isNotNull();
            assertThat(result.getTitle()).isEqualTo("Complete Project Alpha");
            assertThat(result.getGoalType()).isEqualTo(Goal.GoalType.TEAM);
            assertThat(result.getStatus()).isEqualTo(Goal.GoalStatus.DRAFT); // Default status
            assertThat(result.getProgressPercentage()).isEqualTo(0); // Default progress
            verify(goalRepository).save(any(Goal.class));
        }

        @Test
        @DisplayName("Should create goal with provided status")
        void shouldCreateGoalWithProvidedStatus() {
            GoalRequest request = new GoalRequest();
            request.setEmployeeId(employeeId);
            request.setTitle("Active Goal");
            request.setStartDate(LocalDate.now());
            request.setDueDate(LocalDate.now().plusMonths(1));
            request.setStatus(Goal.GoalStatus.ACTIVE);
            request.setProgressPercentage(25);

            when(goalRepository.save(any(Goal.class))).thenAnswer(invocation -> {
                Goal saved = invocation.getArgument(0);
                saved.setId(UUID.randomUUID());
                return saved;
            });

            GoalResponse result = goalService.createGoal(request);

            assertThat(result).isNotNull();
            assertThat(result.getStatus()).isEqualTo(Goal.GoalStatus.ACTIVE);
            assertThat(result.getProgressPercentage()).isEqualTo(25);
        }
    }

    @Nested
    @DisplayName("Update Goal Tests")
    class UpdateGoalTests {

        @Test
        @DisplayName("Should update goal successfully")
        void shouldUpdateGoalSuccessfully() {
            GoalRequest request = new GoalRequest();
            request.setTitle("Updated Goal Title");
            request.setProgressPercentage(75);

            when(goalRepository.findByIdAndTenantId(goalId, tenantId)).thenReturn(Optional.of(goal));
            when(goalRepository.save(any(Goal.class))).thenAnswer(invocation -> invocation.getArgument(0));
            when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(employee));

            GoalResponse result = goalService.updateGoal(goalId, request);

            assertThat(result).isNotNull();
            assertThat(result.getTitle()).isEqualTo("Updated Goal Title");
            assertThat(result.getProgressPercentage()).isEqualTo(75);
        }

        @Test
        @DisplayName("Should throw exception when goal not found")
        void shouldThrowExceptionWhenGoalNotFound() {
            UUID invalidId = UUID.randomUUID();
            GoalRequest request = new GoalRequest();

            when(goalRepository.findByIdAndTenantId(invalidId, tenantId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> goalService.updateGoal(invalidId, request))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("Goal not found");
        }

        @Test
        @DisplayName("Should only update non-null fields")
        void shouldOnlyUpdateNonNullFields() {
            GoalRequest request = new GoalRequest();
            request.setTitle("New Title Only");
            // Other fields are null

            when(goalRepository.findByIdAndTenantId(goalId, tenantId)).thenReturn(Optional.of(goal));
            when(goalRepository.save(any(Goal.class))).thenAnswer(invocation -> invocation.getArgument(0));
            when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(employee));

            GoalResponse result = goalService.updateGoal(goalId, request);

            assertThat(result.getTitle()).isEqualTo("New Title Only");
            assertThat(result.getGoalType()).isEqualTo(Goal.GoalType.KPI); // Original value preserved
        }
    }

    @Nested
    @DisplayName("Get Goal Tests")
    class GetGoalTests {

        @Test
        @DisplayName("Should get goal by ID")
        void shouldGetGoalById() {
            when(goalRepository.findByIdAndTenantId(goalId, tenantId)).thenReturn(Optional.of(goal));
            when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(employee));

            GoalResponse result = goalService.getGoalById(goalId);

            assertThat(result).isNotNull();
            assertThat(result.getId()).isEqualTo(goalId);
            assertThat(result.getEmployeeName()).isEqualTo("John Doe");
        }

        @Test
        @DisplayName("Should throw exception when goal not found by ID")
        void shouldThrowExceptionWhenGoalNotFoundById() {
            UUID invalidId = UUID.randomUUID();

            when(goalRepository.findByIdAndTenantId(invalidId, tenantId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> goalService.getGoalById(invalidId))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("Goal not found");
        }

        @Test
        @DisplayName("Should get all goals with pagination")
        void shouldGetAllGoalsWithPagination() {
            Pageable pageable = PageRequest.of(0, 10);
            Page<Goal> page = new PageImpl<>(List.of(goal));

            when(goalRepository.findAllByTenantId(tenantId, pageable)).thenReturn(page);
            when(employeeRepository.findById(any())).thenReturn(Optional.of(employee));

            Page<GoalResponse> result = goalService.getAllGoals(pageable);

            assertThat(result).isNotNull();
            assertThat(result.getContent()).hasSize(1);
        }

        @Test
        @DisplayName("Should get employee goals")
        void shouldGetEmployeeGoals() {
            when(goalRepository.findAllByTenantIdAndEmployeeId(tenantId, employeeId))
                    .thenReturn(List.of(goal));
            when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(employee));

            List<GoalResponse> result = goalService.getEmployeeGoals(employeeId);

            assertThat(result).hasSize(1);
            assertThat(result.get(0).getEmployeeId()).isEqualTo(employeeId);
        }

        @Test
        @DisplayName("Should get team goals")
        void shouldGetTeamGoals() {
            when(goalRepository.findTeamGoals(tenantId, managerId)).thenReturn(List.of(goal));
            when(employeeRepository.findById(any())).thenReturn(Optional.of(employee));

            List<GoalResponse> result = goalService.getTeamGoals(managerId);

            assertThat(result).hasSize(1);
        }
    }

    @Nested
    @DisplayName("Update Progress Tests")
    class UpdateProgressTests {

        @Test
        @DisplayName("Should update progress successfully")
        void shouldUpdateProgressSuccessfully() {
            when(goalRepository.findByIdAndTenantId(goalId, tenantId)).thenReturn(Optional.of(goal));
            when(goalRepository.save(any(Goal.class))).thenAnswer(invocation -> invocation.getArgument(0));
            when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(employee));

            GoalResponse result = goalService.updateProgress(goalId, 75);

            assertThat(result).isNotNull();
            assertThat(result.getProgressPercentage()).isEqualTo(75);
            assertThat(result.getStatus()).isEqualTo(Goal.GoalStatus.ACTIVE); // Still active
        }

        @Test
        @DisplayName("Should mark goal as completed when progress is 100%")
        void shouldMarkGoalAsCompletedWhenProgressIs100() {
            when(goalRepository.findByIdAndTenantId(goalId, tenantId)).thenReturn(Optional.of(goal));
            when(goalRepository.save(any(Goal.class))).thenAnswer(invocation -> invocation.getArgument(0));
            when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(employee));

            GoalResponse result = goalService.updateProgress(goalId, 100);

            assertThat(result).isNotNull();
            assertThat(result.getProgressPercentage()).isEqualTo(100);
            assertThat(result.getStatus()).isEqualTo(Goal.GoalStatus.COMPLETED);
        }

        @Test
        @DisplayName("Should mark goal as completed when progress exceeds 100%")
        void shouldMarkGoalAsCompletedWhenProgressExceeds100() {
            when(goalRepository.findByIdAndTenantId(goalId, tenantId)).thenReturn(Optional.of(goal));
            when(goalRepository.save(any(Goal.class))).thenAnswer(invocation -> invocation.getArgument(0));
            when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(employee));

            GoalResponse result = goalService.updateProgress(goalId, 120);

            assertThat(result.getStatus()).isEqualTo(Goal.GoalStatus.COMPLETED);
        }

        @Test
        @DisplayName("Should throw exception when updating progress for non-existent goal")
        void shouldThrowExceptionWhenUpdatingProgressForNonExistentGoal() {
            UUID invalidId = UUID.randomUUID();

            when(goalRepository.findByIdAndTenantId(invalidId, tenantId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> goalService.updateProgress(invalidId, 50))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("Goal not found");
        }
    }

    @Nested
    @DisplayName("Approve Goal Tests")
    class ApproveGoalTests {

        @Test
        @DisplayName("Should approve goal successfully")
        void shouldApproveGoalSuccessfully() {
            UUID approverId = UUID.randomUUID();
            goal.setStatus(Goal.GoalStatus.DRAFT);

            Employee approver = new Employee();
            approver.setId(approverId);
            approver.setFirstName("Jane");
            approver.setLastName("Manager");

            when(goalRepository.findByIdAndTenantId(goalId, tenantId)).thenReturn(Optional.of(goal));
            when(goalRepository.save(any(Goal.class))).thenAnswer(invocation -> invocation.getArgument(0));
            when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(employee));
            when(employeeRepository.findById(approverId)).thenReturn(Optional.of(approver));

            GoalResponse result = goalService.approveGoal(goalId, approverId);

            assertThat(result).isNotNull();
            assertThat(result.getStatus()).isEqualTo(Goal.GoalStatus.ACTIVE);
            assertThat(result.getApprovedBy()).isEqualTo(approverId);
            assertThat(result.getApprovedByName()).isEqualTo("Jane Manager");
        }

        @Test
        @DisplayName("Should throw exception when approving non-existent goal")
        void shouldThrowExceptionWhenApprovingNonExistentGoal() {
            UUID invalidId = UUID.randomUUID();
            UUID approverId = UUID.randomUUID();

            when(goalRepository.findByIdAndTenantId(invalidId, tenantId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> goalService.approveGoal(invalidId, approverId))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("Goal not found");
        }
    }

    @Nested
    @DisplayName("Goal Analytics Tests")
    class GoalAnalyticsTests {

        @Test
        @DisplayName("Should get goal analytics")
        void shouldGetGoalAnalytics() {
            when(goalRepository.countCompletedGoals(tenantId)).thenReturn(25L);
            when(goalRepository.getAverageProgress(tenantId)).thenReturn(65.5);
            when(goalRepository.findByStatus(tenantId, Goal.GoalStatus.ACTIVE)).thenReturn(List.of(goal, goal, goal));

            Map<String, Object> result = goalService.getGoalAnalytics();

            assertThat(result).isNotNull();
            assertThat(result).containsKey("completedGoals");
            assertThat(result).containsKey("averageProgress");
            assertThat(result).containsKey("activeGoals");
            assertThat(result.get("completedGoals")).isEqualTo(25L);
            assertThat(result.get("averageProgress")).isEqualTo(65.5);
            assertThat(result.get("activeGoals")).isEqualTo(3L);
        }
    }

    @Nested
    @DisplayName("Goal Response Enrichment Tests")
    class GoalResponseEnrichmentTests {

        @Test
        @DisplayName("Should enrich response with parent goal title")
        void shouldEnrichResponseWithParentGoalTitle() {
            UUID parentGoalId = UUID.randomUUID();
            goal.setParentGoalId(parentGoalId);

            Goal parentGoal = Goal.builder()
                    .title("Parent Goal Title")
                    .build();
            parentGoal.setId(parentGoalId);

            when(goalRepository.findByIdAndTenantId(goalId, tenantId)).thenReturn(Optional.of(goal));
            when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(employee));
            when(goalRepository.findById(parentGoalId)).thenReturn(Optional.of(parentGoal));

            GoalResponse result = goalService.getGoalById(goalId);

            assertThat(result.getParentGoalTitle()).isEqualTo("Parent Goal Title");
        }

        @Test
        @DisplayName("Should enrich response with created by name")
        void shouldEnrichResponseWithCreatedByName() {
            UUID createdById = UUID.randomUUID();
            goal.setCreatedBy(createdById);

            Employee creator = new Employee();
            creator.setId(createdById);
            creator.setFirstName("Creator");
            creator.setLastName("User");

            when(goalRepository.findByIdAndTenantId(goalId, tenantId)).thenReturn(Optional.of(goal));
            when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(employee));
            when(employeeRepository.findById(createdById)).thenReturn(Optional.of(creator));

            GoalResponse result = goalService.getGoalById(goalId);

            assertThat(result.getCreatedByName()).isEqualTo("Creator User");
        }
    }
}
