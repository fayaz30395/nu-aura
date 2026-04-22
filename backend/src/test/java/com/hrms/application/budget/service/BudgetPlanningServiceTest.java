package com.hrms.application.budget.service;

import com.hrms.api.budget.dto.HeadcountBudgetRequest;
import com.hrms.api.budget.dto.HeadcountBudgetResponse;
import com.hrms.common.exception.ResourceNotFoundException;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.budget.HeadcountBudget;
import com.hrms.infrastructure.budget.repository.BudgetScenarioRepository;
import com.hrms.infrastructure.budget.repository.HeadcountBudgetRepository;
import com.hrms.infrastructure.budget.repository.HeadcountPositionRepository;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("BudgetPlanningService Tests")
class BudgetPlanningServiceTest {

    private static MockedStatic<TenantContext> tenantContextMock;
    @Mock
    private HeadcountBudgetRepository budgetRepository;
    @Mock
    private HeadcountPositionRepository positionRepository;
    @Mock
    private BudgetScenarioRepository scenarioRepository;
    @InjectMocks
    private BudgetPlanningService budgetPlanningService;
    private UUID tenantId;

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
        tenantContextMock.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
    }

    private HeadcountBudgetRequest buildRequest() {
        HeadcountBudgetRequest request = new HeadcountBudgetRequest();
        request.setName("Engineering Budget 2026");
        request.setDescription("Annual budget");
        request.setFiscalYear(2026);
        request.setDepartmentId(UUID.randomUUID());
        request.setDepartmentName("Engineering");
        request.setTotalBudget(new BigDecimal("1000000"));
        request.setSalaryBudget(new BigDecimal("800000"));
        request.setBenefitsBudget(new BigDecimal("150000"));
        request.setContingencyBudget(new BigDecimal("50000"));
        request.setOpeningHeadcount(20);
        request.setPlannedHires(5);
        request.setPlannedAttrition(2);
        return request;
    }

    private HeadcountBudget buildBudgetEntity() {
        return HeadcountBudget.builder()
                .id(UUID.randomUUID())
                .budgetName("Engineering Budget 2026")
                .fiscalYear(2026)
                .departmentName("Engineering")
                .totalBudget(new BigDecimal("1000000"))
                .salaryBudget(new BigDecimal("800000"))
                .benefitsBudget(new BigDecimal("150000"))
                .contingencyBudget(new BigDecimal("50000"))
                .allocatedBudget(BigDecimal.ZERO)
                .openingHeadcount(20)
                .closingHeadcount(23)
                .currentHeadcount(20)
                .plannedHires(5)
                .plannedAttrition(2)
                .status(HeadcountBudget.BudgetStatus.DRAFT)
                .currency("USD")
                .build();
    }

    // ==================== Create Budget Tests ====================

    @Test
    @DisplayName("getBudget should load positions and scenarios")
    void shouldGetBudgetWithDetails() {
        UUID budgetId = UUID.randomUUID();
        HeadcountBudget budget = buildBudgetEntity();
        budget.setId(budgetId);

        when(budgetRepository.findByIdAndTenantId(budgetId, tenantId)).thenReturn(Optional.of(budget));
        when(positionRepository.findByBudgetId(budgetId)).thenReturn(List.of());
        when(scenarioRepository.findByBudget(budgetId)).thenReturn(List.of());

        HeadcountBudgetResponse result = budgetPlanningService.getBudget(budgetId);

        assertThat(result).isNotNull();
        verify(positionRepository).findByBudgetId(budgetId);
        verify(scenarioRepository).findByBudget(budgetId);
    }

    // ==================== Update Budget Tests ====================

    @Test
    @DisplayName("getAllBudgets should return paged results")
    void shouldGetAllBudgets() {
        HeadcountBudget budget = buildBudgetEntity();
        Page<HeadcountBudget> page = new PageImpl<>(List.of(budget));
        when(budgetRepository.findByTenantId(eq(tenantId), any())).thenReturn(page);

        Page<HeadcountBudgetResponse> result = budgetPlanningService.getAllBudgets(PageRequest.of(0, 10));

        assertThat(result.getTotalElements()).isEqualTo(1);
    }

    // ==================== Get Budget Tests ====================

    @Test
    @DisplayName("getBudgetsByFiscalYear should filter by year")
    void shouldGetBudgetsByFiscalYear() {
        when(budgetRepository.findByFiscalYear(tenantId, 2026)).thenReturn(List.of(buildBudgetEntity()));

        List<HeadcountBudgetResponse> result = budgetPlanningService.getBudgetsByFiscalYear(2026);

        assertThat(result).hasSize(1);
    }

    @Test
    @DisplayName("submitForApproval should change status to PENDING_APPROVAL")
    void shouldSubmitForApproval() {
        UUID budgetId = UUID.randomUUID();
        HeadcountBudget budget = buildBudgetEntity();
        budget.setId(budgetId);
        budget.setStatus(HeadcountBudget.BudgetStatus.DRAFT);

        when(budgetRepository.findByIdAndTenantId(budgetId, tenantId)).thenReturn(Optional.of(budget));
        when(budgetRepository.save(any(HeadcountBudget.class))).thenAnswer(inv -> inv.getArgument(0));

        HeadcountBudgetResponse result = budgetPlanningService.submitForApproval(budgetId);

        assertThat(result).isNotNull();
        verify(budgetRepository).save(argThat(b ->
                b.getStatus() == HeadcountBudget.BudgetStatus.PENDING_APPROVAL));
    }

    @Test
    @DisplayName("submitForApproval should reject non-draft budgets")
    void shouldRejectSubmitForNonDraftBudget() {
        UUID budgetId = UUID.randomUUID();
        HeadcountBudget budget = buildBudgetEntity();
        budget.setId(budgetId);
        budget.setStatus(HeadcountBudget.BudgetStatus.APPROVED);

        when(budgetRepository.findByIdAndTenantId(budgetId, tenantId)).thenReturn(Optional.of(budget));

        assertThatThrownBy(() -> budgetPlanningService.submitForApproval(budgetId))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("draft");
    }

    // ==================== Delete Budget Tests ====================

    @Nested
    @DisplayName("createBudget")
    class CreateBudgetTests {

        @Test
        @DisplayName("Should create budget with calculated closing headcount")
        void shouldCreateBudget() {
            HeadcountBudgetRequest request = buildRequest();

            when(budgetRepository.save(any(HeadcountBudget.class))).thenAnswer(inv -> {
                HeadcountBudget saved = inv.getArgument(0);
                saved.setId(UUID.randomUUID());
                return saved;
            });

            HeadcountBudgetResponse result = budgetPlanningService.createBudget(request);

            assertThat(result).isNotNull();
            verify(budgetRepository).save(argThat(b ->
                    b.getClosingHeadcount() == 23 &&
                            b.getStatus() == HeadcountBudget.BudgetStatus.DRAFT &&
                            b.getTenantId().equals(tenantId)));
        }
    }

    // ==================== Approval Workflow Tests ====================

    @Nested
    @DisplayName("updateBudget")
    class UpdateBudgetTests {

        @Test
        @DisplayName("Should update draft budget")
        void shouldUpdateDraftBudget() {
            UUID budgetId = UUID.randomUUID();
            HeadcountBudget existing = buildBudgetEntity();
            existing.setId(budgetId);
            existing.setStatus(HeadcountBudget.BudgetStatus.DRAFT);

            HeadcountBudgetRequest request = buildRequest();

            when(budgetRepository.findByIdAndTenantId(budgetId, tenantId)).thenReturn(Optional.of(existing));
            when(budgetRepository.save(any(HeadcountBudget.class))).thenAnswer(inv -> inv.getArgument(0));

            HeadcountBudgetResponse result = budgetPlanningService.updateBudget(budgetId, request);

            assertThat(result).isNotNull();
        }

        @Test
        @DisplayName("Should throw when updating approved budget")
        void shouldThrowWhenUpdatingApprovedBudget() {
            UUID budgetId = UUID.randomUUID();
            HeadcountBudget budget = buildBudgetEntity();
            budget.setId(budgetId);
            budget.setStatus(HeadcountBudget.BudgetStatus.APPROVED);

            when(budgetRepository.findByIdAndTenantId(budgetId, tenantId)).thenReturn(Optional.of(budget));

            assertThatThrownBy(() -> budgetPlanningService.updateBudget(budgetId, buildRequest()))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("approved");
        }

        @Test
        @DisplayName("Should throw when budget not found")
        void shouldThrowWhenBudgetNotFound() {
            UUID budgetId = UUID.randomUUID();
            when(budgetRepository.findByIdAndTenantId(budgetId, tenantId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> budgetPlanningService.updateBudget(budgetId, buildRequest()))
                    .isInstanceOf(ResourceNotFoundException.class);
        }
    }

    @Nested
    @DisplayName("deleteBudget")
    class DeleteBudgetTests {

        @Test
        @DisplayName("Should delete draft budget")
        void shouldDeleteDraftBudget() {
            UUID budgetId = UUID.randomUUID();
            HeadcountBudget budget = buildBudgetEntity();
            budget.setId(budgetId);
            budget.setStatus(HeadcountBudget.BudgetStatus.DRAFT);

            when(budgetRepository.findByIdAndTenantId(budgetId, tenantId)).thenReturn(Optional.of(budget));

            budgetPlanningService.deleteBudget(budgetId);

            verify(budgetRepository).delete(budget);
        }

        @Test
        @DisplayName("Should throw when deleting approved budget")
        void shouldThrowWhenDeletingApprovedBudget() {
            UUID budgetId = UUID.randomUUID();
            HeadcountBudget budget = buildBudgetEntity();
            budget.setId(budgetId);
            budget.setStatus(HeadcountBudget.BudgetStatus.APPROVED);

            when(budgetRepository.findByIdAndTenantId(budgetId, tenantId)).thenReturn(Optional.of(budget));

            assertThatThrownBy(() -> budgetPlanningService.deleteBudget(budgetId))
                    .isInstanceOf(IllegalStateException.class);
        }
    }
}
