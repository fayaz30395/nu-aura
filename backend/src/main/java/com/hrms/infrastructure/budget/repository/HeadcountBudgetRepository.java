package com.hrms.infrastructure.budget.repository;

import com.hrms.domain.budget.HeadcountBudget;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface HeadcountBudgetRepository extends JpaRepository<HeadcountBudget, UUID> {

    Optional<HeadcountBudget> findByIdAndTenantId(UUID id, UUID tenantId);

    Page<HeadcountBudget> findByTenantId(UUID tenantId, Pageable pageable);

    @Query("SELECT b FROM HeadcountBudget b WHERE b.tenantId = :tenantId AND b.fiscalYear = :year")
    List<HeadcountBudget> findByFiscalYear(@Param("tenantId") UUID tenantId, @Param("year") Integer year);

    @Query("SELECT b FROM HeadcountBudget b WHERE b.tenantId = :tenantId AND b.departmentId = :deptId")
    List<HeadcountBudget> findByDepartment(@Param("tenantId") UUID tenantId, @Param("deptId") UUID deptId);

    @Query("SELECT b FROM HeadcountBudget b WHERE b.tenantId = :tenantId AND b.status = :status")
    List<HeadcountBudget> findByStatus(@Param("tenantId") UUID tenantId,
                                        @Param("status") HeadcountBudget.BudgetStatus status);

    @Query("SELECT SUM(b.totalBudget) FROM HeadcountBudget b WHERE b.tenantId = :tenantId " +
           "AND b.fiscalYear = :year AND b.status = 'APPROVED'")
    java.math.BigDecimal getTotalApprovedBudget(@Param("tenantId") UUID tenantId, @Param("year") Integer year);

    @Query("SELECT SUM(b.closingHeadcount) FROM HeadcountBudget b WHERE b.tenantId = :tenantId " +
           "AND b.fiscalYear = :year AND b.status = 'APPROVED'")
    Integer getTotalPlannedHeadcount(@Param("tenantId") UUID tenantId, @Param("year") Integer year);

    @Query("SELECT b.departmentId, SUM(b.totalBudget) FROM HeadcountBudget b WHERE b.tenantId = :tenantId " +
           "AND b.fiscalYear = :year AND b.status = 'APPROVED' " +
           "GROUP BY b.departmentId")
    List<Object[]> getBudgetByDepartment(@Param("tenantId") UUID tenantId, @Param("year") Integer year);
}
