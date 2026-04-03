package com.hrms.infrastructure.expense.repository;

import com.hrms.domain.expense.ExpenseClaim;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ExpenseClaimRepository extends JpaRepository<ExpenseClaim, UUID>, JpaSpecificationExecutor<ExpenseClaim> {

    Optional<ExpenseClaim> findByIdAndTenantId(UUID id, UUID tenantId);

    Optional<ExpenseClaim> findByClaimNumberAndTenantId(String claimNumber, UUID tenantId);

    Page<ExpenseClaim> findAllByTenantId(UUID tenantId, Pageable pageable);

    Page<ExpenseClaim> findAllByEmployeeIdAndTenantId(UUID employeeId, UUID tenantId, Pageable pageable);

    List<ExpenseClaim> findAllByEmployeeIdAndTenantId(UUID employeeId, UUID tenantId);

    Page<ExpenseClaim> findAllByStatusAndTenantId(ExpenseClaim.ExpenseStatus status, UUID tenantId, Pageable pageable);

    Page<ExpenseClaim> findAllByCategoryAndTenantId(ExpenseClaim.ExpenseCategory category, UUID tenantId, Pageable pageable);

    @Query("SELECT e FROM ExpenseClaim e WHERE e.tenantId = :tenantId AND e.claimDate BETWEEN :startDate AND :endDate")
    Page<ExpenseClaim> findByDateRange(@Param("tenantId") UUID tenantId,
                                       @Param("startDate") LocalDate startDate,
                                       @Param("endDate") LocalDate endDate,
                                       Pageable pageable);

    @Query("SELECT e FROM ExpenseClaim e WHERE e.tenantId = :tenantId AND e.employeeId = :employeeId " +
            "AND e.claimDate BETWEEN :startDate AND :endDate")
    List<ExpenseClaim> findByEmployeeAndDateRange(@Param("tenantId") UUID tenantId,
                                                  @Param("employeeId") UUID employeeId,
                                                  @Param("startDate") LocalDate startDate,
                                                  @Param("endDate") LocalDate endDate);

    @Query("SELECT e FROM ExpenseClaim e WHERE e.tenantId = :tenantId AND e.status IN :statuses")
    Page<ExpenseClaim> findByStatuses(@Param("tenantId") UUID tenantId,
                                      @Param("statuses") List<ExpenseClaim.ExpenseStatus> statuses,
                                      Pageable pageable);

    @Query("SELECT SUM(e.amount) FROM ExpenseClaim e WHERE e.tenantId = :tenantId AND e.employeeId = :employeeId " +
            "AND e.status = :status AND e.claimDate BETWEEN :startDate AND :endDate")
    BigDecimal sumByEmployeeAndStatusAndDateRange(@Param("tenantId") UUID tenantId,
                                                  @Param("employeeId") UUID employeeId,
                                                  @Param("status") ExpenseClaim.ExpenseStatus status,
                                                  @Param("startDate") LocalDate startDate,
                                                  @Param("endDate") LocalDate endDate);

    @Query("SELECT SUM(e.amount) FROM ExpenseClaim e WHERE e.tenantId = :tenantId " +
            "AND e.status = :status AND e.claimDate BETWEEN :startDate AND :endDate")
    BigDecimal sumByStatusAndDateRange(@Param("tenantId") UUID tenantId,
                                       @Param("status") ExpenseClaim.ExpenseStatus status,
                                       @Param("startDate") LocalDate startDate,
                                       @Param("endDate") LocalDate endDate);

    @Query("SELECT COUNT(e) FROM ExpenseClaim e WHERE e.tenantId = :tenantId AND e.status = :status")
    long countByStatus(@Param("tenantId") UUID tenantId, @Param("status") ExpenseClaim.ExpenseStatus status);

    @Query("SELECT e.category, COUNT(e), SUM(e.amount) FROM ExpenseClaim e " +
            "WHERE e.tenantId = :tenantId AND e.claimDate BETWEEN :startDate AND :endDate " +
            "GROUP BY e.category")
    List<Object[]> getCategoryStats(@Param("tenantId") UUID tenantId,
                                    @Param("startDate") LocalDate startDate,
                                    @Param("endDate") LocalDate endDate);

    boolean existsByClaimNumberAndTenantId(String claimNumber, UUID tenantId);

    @Query("SELECT MAX(e.claimNumber) FROM ExpenseClaim e WHERE e.tenantId = :tenantId")
    String findMaxClaimNumber(@Param("tenantId") UUID tenantId);
}
