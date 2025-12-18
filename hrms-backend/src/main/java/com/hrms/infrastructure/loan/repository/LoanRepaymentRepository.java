package com.hrms.infrastructure.loan.repository;

import com.hrms.domain.loan.LoanRepayment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface LoanRepaymentRepository extends JpaRepository<LoanRepayment, UUID> {

    List<LoanRepayment> findByLoanIdAndTenantId(UUID loanId, UUID tenantId);

    Optional<LoanRepayment> findByIdAndTenantId(UUID id, UUID tenantId);

    @Query("SELECT r FROM LoanRepayment r WHERE r.tenantId = :tenantId AND r.loanId = :loanId ORDER BY r.installmentNumber")
    List<LoanRepayment> findByLoanOrderByInstallment(@Param("tenantId") UUID tenantId, @Param("loanId") UUID loanId);

    @Query("SELECT r FROM LoanRepayment r WHERE r.tenantId = :tenantId AND r.dueDate <= :date AND r.status = 'PENDING'")
    List<LoanRepayment> findDueRepayments(@Param("tenantId") UUID tenantId, @Param("date") LocalDate date);

    @Query("SELECT r FROM LoanRepayment r WHERE r.tenantId = :tenantId AND r.dueDate < :date AND r.status IN ('PENDING', 'PARTIAL')")
    List<LoanRepayment> findOverdueRepayments(@Param("tenantId") UUID tenantId, @Param("date") LocalDate date);

    @Query("SELECT SUM(r.paidAmount) FROM LoanRepayment r WHERE r.loanId = :loanId AND r.status IN ('PAID', 'PARTIAL')")
    BigDecimal getTotalPaidByLoan(@Param("loanId") UUID loanId);

    @Query("SELECT r FROM LoanRepayment r WHERE r.tenantId = :tenantId AND r.employeeId = :employeeId AND r.status = 'PENDING' AND MONTH(r.dueDate) = :month AND YEAR(r.dueDate) = :year")
    List<LoanRepayment> findPendingForPayroll(@Param("tenantId") UUID tenantId, @Param("employeeId") UUID employeeId, @Param("month") int month, @Param("year") int year);
}
