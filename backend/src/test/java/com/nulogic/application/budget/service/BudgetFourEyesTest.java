package com.nulogic.application.budget.service;

import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.security.TenantContext;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.budget.HeadcountBudget;
import com.nulogic.infrastructure.budget.repository.BudgetScenarioRepository;
import com.nulogic.infrastructure.budget.repository.HeadcountBudgetRepository;
import com.nulogic.infrastructure.budget.repository.HeadcountPositionRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.MockedStatic;
import org.springframework.security.access.AccessDeniedException;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@DisplayName("Budget approval four-eyes")
class BudgetFourEyesTest {

    private final UUID tenantId = UUID.randomUUID();
    private final UUID userId = UUID.randomUUID();
    private final UUID budgetId = UUID.randomUUID();

    private MockedStatic<TenantContext> tenantCtx;
    private HeadcountBudgetRepository repo;
    private BudgetPlanningService service;
    private HeadcountBudget budget;

    @BeforeEach
    void setUp() {
        tenantCtx = mockStatic(TenantContext.class);
        tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
        tenantCtx.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);
        SecurityContext.setCurrentUser(userId, UUID.randomUUID(), Set.of("HR_MANAGER"), Map.of());

        repo = mock(HeadcountBudgetRepository.class);
        TenantTimeService time = mock(TenantTimeService.class);
        when(time.now(any())).thenReturn(LocalDateTime.of(2026, 1, 1, 9, 0));
        service = new BudgetPlanningService(repo, mock(HeadcountPositionRepository.class),
                mock(BudgetScenarioRepository.class), time);
        budget = new HeadcountBudget();
        budget.setStatus(HeadcountBudget.BudgetStatus.DRAFT);
        when(repo.findByIdAndTenantId(budgetId, tenantId)).thenReturn(Optional.of(budget));
        when(repo.save(any())).thenAnswer(i -> i.getArgument(0));
    }

    @AfterEach
    void tearDown() {
        tenantCtx.close();
        SecurityContext.clear();
    }

    @Test
    @DisplayName("the submitter cannot approve their own budget; a different approver can")
    void submitterCannotApprove() {
        service.submitForApproval(budgetId);
        assertThat(budget.getSubmittedBy()).isEqualTo(userId);

        assertThatThrownBy(() -> service.approveBudget(budgetId)).isInstanceOf(AccessDeniedException.class);
        assertThat(budget.getStatus()).isEqualTo(HeadcountBudget.BudgetStatus.PENDING_APPROVAL);
        assertThat(budget.getApprovedBy()).isNull();

        SecurityContext.setCurrentUser(UUID.randomUUID(), UUID.randomUUID(), Set.of("HR_MANAGER"), Map.of());
        service.approveBudget(budgetId);
        assertThat(budget.getStatus()).isEqualTo(HeadcountBudget.BudgetStatus.APPROVED);
    }
}
