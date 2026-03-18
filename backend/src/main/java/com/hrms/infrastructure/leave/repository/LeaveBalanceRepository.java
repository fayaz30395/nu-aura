package com.hrms.infrastructure.leave.repository;

import com.hrms.domain.leave.LeaveBalance;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface LeaveBalanceRepository extends JpaRepository<LeaveBalance, UUID> {

    Optional<LeaveBalance> findByEmployeeIdAndLeaveTypeIdAndYearAndTenantId(
            UUID employeeId, UUID leaveTypeId, Integer year, UUID tenantId);

    List<LeaveBalance> findAllByEmployeeIdAndYear(UUID employeeId, Integer year);

    List<LeaveBalance> findAllByTenantIdAndEmployeeId(UUID tenantId, UUID employeeId);

    @Query("SELECT lb FROM LeaveBalance lb WHERE lb.employeeId = :employeeId AND lb.year = :year AND lb.tenantId = :tenantId")
    List<LeaveBalance> findByEmployeeIdAndYear(
            @Param("employeeId") UUID employeeId,
            @Param("year") Integer year,
            @Param("tenantId") UUID tenantId);

    boolean existsByEmployeeIdAndLeaveTypeIdAndYear(UUID employeeId, UUID leaveTypeId, Integer year);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT lb FROM LeaveBalance lb WHERE lb.employeeId = :employeeId AND lb.leaveTypeId = :leaveTypeId AND lb.year = :year AND lb.tenantId = :tenantId")
    Optional<LeaveBalance> findForUpdate(
            @Param("employeeId") UUID employeeId,
            @Param("leaveTypeId") UUID leaveTypeId,
            @Param("year") Integer year,
            @Param("tenantId") UUID tenantId);

    // Sum total available balance for employee
    @Query("SELECT COALESCE(SUM(lb.available), 0) FROM LeaveBalance lb WHERE lb.tenantId = :tenantId AND lb.employeeId = :employeeId AND lb.year = :year")
    java.math.BigDecimal sumBalanceByEmployeeId(@Param("tenantId") UUID tenantId, @Param("employeeId") UUID employeeId, @Param("year") Integer year);

    // Get detailed balances for employee with leave type info (native query for JOIN)
    @Query(value = "SELECT lt.leave_code, lt.leave_name, lb.opening_balance, lb.used, lb.available, lb.pending " +
           "FROM leave_balances lb JOIN leave_types lt ON lb.leave_type_id = lt.id " +
           "WHERE lb.tenant_id = :tenantId AND lb.employee_id = :employeeId AND lb.year = :year", nativeQuery = true)
    List<Object[]> findBalancesByEmployeeId(@Param("tenantId") UUID tenantId, @Param("employeeId") UUID employeeId, @Param("year") Integer year);
}
