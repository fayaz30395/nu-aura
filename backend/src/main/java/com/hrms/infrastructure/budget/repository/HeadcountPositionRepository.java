package com.hrms.infrastructure.budget.repository;

import com.hrms.domain.budget.HeadcountPosition;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface HeadcountPositionRepository extends JpaRepository<HeadcountPosition, UUID> {

    Optional<HeadcountPosition> findByIdAndTenantId(UUID id, UUID tenantId);

    List<HeadcountPosition> findByBudgetIdAndTenantId(UUID budgetId, UUID tenantId);

    /**
     * @deprecated Use {@link #findByBudgetIdAndTenantId(UUID, UUID)} for tenant isolation.
     */
    @Deprecated
    List<HeadcountPosition> findByBudgetId(UUID budgetId);

    @Query("SELECT p FROM HeadcountPosition p WHERE p.tenantId = :tenantId AND p.status = :status")
    List<HeadcountPosition> findByStatus(@Param("tenantId") UUID tenantId,
                                         @Param("status") HeadcountPosition.PositionStatus status);

    @Query("SELECT p FROM HeadcountPosition p WHERE p.tenantId = :tenantId AND p.positionType = :type")
    List<HeadcountPosition> findByPositionType(@Param("tenantId") UUID tenantId,
                                               @Param("type") HeadcountPosition.PositionType type);

    @Query("SELECT COUNT(p) FROM HeadcountPosition p WHERE p.budget.id = :budgetId AND p.status = :status")
    long countByBudgetAndStatus(@Param("budgetId") UUID budgetId,
                                @Param("status") HeadcountPosition.PositionStatus status);

    @Query("SELECT SUM(p.totalCost) FROM HeadcountPosition p WHERE p.budget.id = :budgetId AND p.status <> 'CANCELLED'")
    java.math.BigDecimal getTotalPositionCost(@Param("budgetId") UUID budgetId);

    @Query("SELECT p.status, COUNT(p) FROM HeadcountPosition p WHERE p.budget.id = :budgetId GROUP BY p.status")
    List<Object[]> countByStatus(@Param("budgetId") UUID budgetId);
}
