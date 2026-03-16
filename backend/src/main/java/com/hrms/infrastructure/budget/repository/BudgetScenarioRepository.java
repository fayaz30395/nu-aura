package com.hrms.infrastructure.budget.repository;

import com.hrms.domain.budget.BudgetScenario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface BudgetScenarioRepository extends JpaRepository<BudgetScenario, UUID> {

    Optional<BudgetScenario> findByIdAndTenantId(UUID id, UUID tenantId);

    /**
     * Batch-fetch multiple scenarios by ID list, scoped to a single tenant.
     * Use this instead of calling {@link #findByIdAndTenantId} inside a loop
     * to avoid N+1 queries.
     */
    @Query("SELECT s FROM BudgetScenario s WHERE s.id IN :ids AND s.tenantId = :tenantId")
    List<BudgetScenario> findAllByIdsAndTenantId(
            @Param("ids") Collection<UUID> ids,
            @Param("tenantId") UUID tenantId);

    @Query("SELECT s FROM BudgetScenario s WHERE s.baseBudget.id = :budgetId")
    List<BudgetScenario> findByBudget(@Param("budgetId") UUID budgetId);

    @Query("SELECT s FROM BudgetScenario s WHERE s.tenantId = :tenantId AND s.isSelected = true")
    List<BudgetScenario> findSelectedScenarios(@Param("tenantId") UUID tenantId);

    @Query("SELECT s FROM BudgetScenario s WHERE s.tenantId = :tenantId AND s.scenarioType = :type")
    List<BudgetScenario> findByType(@Param("tenantId") UUID tenantId, @Param("type") BudgetScenario.ScenarioType type);
}
