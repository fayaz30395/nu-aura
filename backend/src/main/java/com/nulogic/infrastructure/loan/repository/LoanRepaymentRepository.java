package com.nulogic.infrastructure.loan.repository;

import com.nulogic.domain.loan.LoanRepayment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface LoanRepaymentRepository extends JpaRepository<LoanRepayment, UUID> {

    boolean existsByTenantIdAndLoanIdAndPaymentReference(UUID tenantId, UUID loanId, String paymentReference);
}
