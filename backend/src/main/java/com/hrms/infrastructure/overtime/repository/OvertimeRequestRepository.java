package com.hrms.infrastructure.overtime.repository;

import com.hrms.domain.overtime.OvertimeRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface OvertimeRequestRepository extends JpaRepository<OvertimeRequest, UUID> {

    Optional<OvertimeRequest> findByIdAndTenantId(UUID id, UUID tenantId);

    Optional<OvertimeRequest> findByRequestNumberAndTenantId(String requestNumber, UUID tenantId);

    Page<OvertimeRequest> findByTenantId(UUID tenantId, Pageable pageable);

    List<OvertimeRequest> findByTenantIdAndEmployeeId(UUID tenantId, UUID employeeId);

    Page<OvertimeRequest> findByTenantIdAndEmployeeId(UUID tenantId, UUID employeeId, Pageable pageable);

    @Query("SELECT o FROM OvertimeRequest o WHERE o.tenantId = :tenantId " +
            "AND o.status = 'PENDING_APPROVAL'")
    List<OvertimeRequest> findPendingApprovals(@Param("tenantId") UUID tenantId);

    @Query("SELECT o FROM OvertimeRequest o WHERE o.tenantId = :tenantId " +
            "AND o.employeeId = :employeeId " +
            "AND o.overtimeDate BETWEEN :startDate AND :endDate")
    List<OvertimeRequest> findByEmployeeAndDateRange(
            @Param("tenantId") UUID tenantId,
            @Param("employeeId") UUID employeeId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);

    @Query("SELECT o FROM OvertimeRequest o WHERE o.tenantId = :tenantId " +
            "AND o.status = 'APPROVED' AND o.processedInPayroll = false")
    List<OvertimeRequest> findApprovedUnprocessed(@Param("tenantId") UUID tenantId);

    @Query("SELECT SUM(o.actualHours) FROM OvertimeRequest o " +
            "WHERE o.tenantId = :tenantId AND o.employeeId = :employeeId " +
            "AND o.status = 'APPROVED' " +
            "AND FUNCTION('WEEK', o.overtimeDate) = :weekNumber " +
            "AND FUNCTION('YEAR', o.overtimeDate) = :year")
    java.math.BigDecimal getWeeklyApprovedHours(
            @Param("tenantId") UUID tenantId,
            @Param("employeeId") UUID employeeId,
            @Param("weekNumber") int weekNumber,
            @Param("year") int year);

    @Query("SELECT SUM(o.actualHours) FROM OvertimeRequest o " +
            "WHERE o.tenantId = :tenantId AND o.employeeId = :employeeId " +
            "AND o.status = 'APPROVED' " +
            "AND FUNCTION('MONTH', o.overtimeDate) = :month " +
            "AND FUNCTION('YEAR', o.overtimeDate) = :year")
    java.math.BigDecimal getMonthlyApprovedHours(
            @Param("tenantId") UUID tenantId,
            @Param("employeeId") UUID employeeId,
            @Param("month") int month,
            @Param("year") int year);

    @Query("SELECT o.status, COUNT(o) FROM OvertimeRequest o " +
            "WHERE o.tenantId = :tenantId GROUP BY o.status")
    List<Object[]> countByStatus(@Param("tenantId") UUID tenantId);

    @Query("SELECT o FROM OvertimeRequest o WHERE o.tenantId = :tenantId " +
            "AND o.takeAsCompTime = true AND o.status = 'APPROVED'")
    List<OvertimeRequest> findCompTimeRequests(@Param("tenantId") UUID tenantId);
}
