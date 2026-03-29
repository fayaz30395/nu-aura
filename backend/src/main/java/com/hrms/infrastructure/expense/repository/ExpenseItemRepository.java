package com.hrms.infrastructure.expense.repository;

import com.hrms.domain.expense.ExpenseItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Repository
public interface ExpenseItemRepository extends JpaRepository<ExpenseItem, UUID> {

    List<ExpenseItem> findAllByExpenseClaimId(UUID expenseClaimId);

    @Query("SELECT SUM(i.amount) FROM ExpenseItem i WHERE i.expenseClaimId = :claimId")
    BigDecimal sumAmountByClaimId(@Param("claimId") UUID claimId);

    long countByExpenseClaimId(UUID expenseClaimId);

    void deleteAllByExpenseClaimId(UUID expenseClaimId);
}
