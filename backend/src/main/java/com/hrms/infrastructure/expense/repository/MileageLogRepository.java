package com.hrms.infrastructure.expense.repository;

import com.hrms.domain.expense.MileageLog;
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
public interface MileageLogRepository extends JpaRepository<MileageLog, UUID>, JpaSpecificationExecutor<MileageLog> {

    Optional<MileageLog> findByIdAndTenantId(UUID id, UUID tenantId);

    Page<MileageLog> findByTenantIdAndEmployeeId(UUID tenantId, UUID employeeId, Pageable pageable);

    Page<MileageLog> findByTenantIdAndStatus(UUID tenantId, MileageLog.MileageStatus status, Pageable pageable);

    List<MileageLog> findByTenantIdAndEmployeeIdAndTravelDateBetween(
            UUID tenantId, UUID employeeId, LocalDate startDate, LocalDate endDate);

    @Query("SELECT COALESCE(SUM(m.distanceKm), 0) FROM MileageLog m " +
           "WHERE m.tenantId = :tenantId AND m.employeeId = :employeeId " +
           "AND m.travelDate BETWEEN :startDate AND :endDate " +
           "AND m.status <> 'REJECTED'")
    BigDecimal sumDistanceByEmployeeAndDateRange(
            @Param("tenantId") UUID tenantId,
            @Param("employeeId") UUID employeeId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);

    @Query("SELECT COALESCE(SUM(m.distanceKm), 0) FROM MileageLog m " +
           "WHERE m.tenantId = :tenantId AND m.employeeId = :employeeId " +
           "AND m.travelDate = :travelDate " +
           "AND m.status <> 'REJECTED' AND m.id <> :excludeId")
    BigDecimal sumDistanceByEmployeeAndDate(
            @Param("tenantId") UUID tenantId,
            @Param("employeeId") UUID employeeId,
            @Param("travelDate") LocalDate travelDate,
            @Param("excludeId") UUID excludeId);

    @Query("SELECT COALESCE(SUM(m.reimbursementAmount), 0) FROM MileageLog m " +
           "WHERE m.tenantId = :tenantId AND m.employeeId = :employeeId " +
           "AND m.travelDate BETWEEN :startDate AND :endDate " +
           "AND m.status <> 'REJECTED'")
    BigDecimal sumReimbursementByEmployeeAndDateRange(
            @Param("tenantId") UUID tenantId,
            @Param("employeeId") UUID employeeId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);

    @Query("SELECT COUNT(m) FROM MileageLog m WHERE m.tenantId = :tenantId AND m.status = :status")
    long countByTenantIdAndStatus(@Param("tenantId") UUID tenantId,
                                   @Param("status") MileageLog.MileageStatus status);
}
