package com.hrms.infrastructure.travel.repository;

import com.hrms.domain.travel.TravelExpense;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TravelExpenseRepository extends JpaRepository<TravelExpense, UUID> {

    List<TravelExpense> findByTravelRequestIdAndTenantId(UUID travelRequestId, UUID tenantId);

    Optional<TravelExpense> findByIdAndTenantId(UUID id, UUID tenantId);

    List<TravelExpense> findByTenantIdAndStatus(UUID tenantId, TravelExpense.ExpenseStatus status);

    @Query("SELECT e FROM TravelExpense e WHERE e.tenantId = :tenantId AND e.status = 'SUBMITTED'")
    List<TravelExpense> findPendingApprovals(@Param("tenantId") UUID tenantId);

    @Query("SELECT SUM(e.amountInBaseCurrency) FROM TravelExpense e WHERE e.travelRequestId = :travelRequestId")
    BigDecimal getTotalExpensesByRequest(@Param("travelRequestId") UUID travelRequestId);

    @Query("SELECT SUM(e.approvedAmount) FROM TravelExpense e WHERE e.travelRequestId = :travelRequestId AND e.status IN ('APPROVED', 'REIMBURSED')")
    BigDecimal getTotalApprovedByRequest(@Param("travelRequestId") UUID travelRequestId);

    @Query("SELECT e FROM TravelExpense e WHERE e.tenantId = :tenantId AND e.status = 'APPROVED'")
    List<TravelExpense> findPendingReimbursement(@Param("tenantId") UUID tenantId);

    Page<TravelExpense> findByEmployeeIdAndTenantId(UUID employeeId, UUID tenantId, Pageable pageable);
}
