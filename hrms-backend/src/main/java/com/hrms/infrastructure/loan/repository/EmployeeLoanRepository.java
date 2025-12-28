package com.hrms.infrastructure.loan.repository;

import com.hrms.domain.loan.EmployeeLoan;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface EmployeeLoanRepository extends JpaRepository<EmployeeLoan, UUID> {

    List<EmployeeLoan> findByEmployeeIdAndTenantId(UUID employeeId, UUID tenantId);

    Page<EmployeeLoan> findByEmployeeIdAndTenantId(UUID employeeId, UUID tenantId, Pageable pageable);

    Optional<EmployeeLoan> findByIdAndTenantId(UUID id, UUID tenantId);

    Optional<EmployeeLoan> findByLoanNumberAndTenantId(String loanNumber, UUID tenantId);

    Page<EmployeeLoan> findByTenantId(UUID tenantId, Pageable pageable);

    List<EmployeeLoan> findByTenantIdAndStatus(UUID tenantId, EmployeeLoan.LoanStatus status);

    Page<EmployeeLoan> findByTenantIdAndStatus(UUID tenantId, EmployeeLoan.LoanStatus status, Pageable pageable);

    List<EmployeeLoan> findByTenantIdAndStatusIn(UUID tenantId, List<EmployeeLoan.LoanStatus> statuses);

    @Query("SELECT l FROM EmployeeLoan l WHERE l.tenantId = :tenantId AND l.employeeId = :employeeId AND l.status IN ('DISBURSED', 'ACTIVE')")
    List<EmployeeLoan> findActiveLoans(@Param("tenantId") UUID tenantId, @Param("employeeId") UUID employeeId);

    @Query("SELECT l FROM EmployeeLoan l WHERE l.tenantId = :tenantId AND l.status = 'PENDING'")
    List<EmployeeLoan> findPendingApprovals(@Param("tenantId") UUID tenantId);

    @Query("SELECT SUM(l.outstandingAmount) FROM EmployeeLoan l WHERE l.tenantId = :tenantId AND l.employeeId = :employeeId AND l.status IN ('DISBURSED', 'ACTIVE')")
    BigDecimal getTotalOutstandingByEmployee(@Param("tenantId") UUID tenantId, @Param("employeeId") UUID employeeId);

    @Query("SELECT SUM(l.outstandingAmount) FROM EmployeeLoan l WHERE l.tenantId = :tenantId AND l.status IN ('DISBURSED', 'ACTIVE')")
    BigDecimal getTotalOutstanding(@Param("tenantId") UUID tenantId);

    @Query("SELECT COUNT(l) FROM EmployeeLoan l WHERE l.tenantId = :tenantId AND l.status = :status")
    long countByStatus(@Param("tenantId") UUID tenantId, @Param("status") EmployeeLoan.LoanStatus status);
}
