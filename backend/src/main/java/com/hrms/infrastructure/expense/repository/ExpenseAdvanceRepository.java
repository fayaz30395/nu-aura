package com.hrms.infrastructure.expense.repository;

import com.hrms.domain.expense.ExpenseAdvance;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ExpenseAdvanceRepository extends JpaRepository<ExpenseAdvance, UUID>,
        JpaSpecificationExecutor<ExpenseAdvance> {

    Optional<ExpenseAdvance> findByIdAndTenantId(UUID id, UUID tenantId);

    Page<ExpenseAdvance> findAllByTenantId(UUID tenantId, Pageable pageable);

    Page<ExpenseAdvance> findAllByEmployeeIdAndTenantId(UUID employeeId, UUID tenantId, Pageable pageable);

    List<ExpenseAdvance> findAllByEmployeeIdAndTenantIdAndStatus(
            UUID employeeId, UUID tenantId, ExpenseAdvance.AdvanceStatus status);

    @Query("SELECT SUM(a.amount) FROM ExpenseAdvance a WHERE a.tenantId = :tenantId " +
           "AND a.employeeId = :employeeId AND a.status IN ('APPROVED', 'DISBURSED')")
    BigDecimal sumOutstandingByEmployee(@Param("tenantId") UUID tenantId,
                                        @Param("employeeId") UUID employeeId);
}
