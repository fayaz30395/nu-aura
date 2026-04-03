package com.hrms.infrastructure.overtime.repository;

import com.hrms.domain.overtime.OvertimeRecord;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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
public interface OvertimeRecordRepository extends JpaRepository<OvertimeRecord, UUID> {

    Optional<OvertimeRecord> findByIdAndTenantId(UUID id, UUID tenantId);

    Page<OvertimeRecord> findAllByTenantId(UUID tenantId, Pageable pageable);

    Page<OvertimeRecord> findAllByTenantIdAndEmployeeId(UUID tenantId, UUID employeeId, Pageable pageable);

    Optional<OvertimeRecord> findByTenantIdAndAttendanceRecordId(UUID tenantId, UUID attendanceRecordId);

    @Query("SELECT otr FROM OvertimeRecord otr WHERE otr.tenantId = :tenantId " +
            "AND otr.employeeId = :employeeId " +
            "AND otr.overtimeDate BETWEEN :startDate AND :endDate")
    List<OvertimeRecord> findByEmployeeAndDateRange(
            @Param("tenantId") UUID tenantId,
            @Param("employeeId") UUID employeeId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);

    @Query("SELECT otr FROM OvertimeRecord otr WHERE otr.tenantId = :tenantId " +
            "AND otr.status = :status")
    Page<OvertimeRecord> findByStatus(@Param("tenantId") UUID tenantId,
                                      @Param("status") OvertimeRecord.OvertimeStatus status,
                                      Pageable pageable);

    @Query("SELECT otr FROM OvertimeRecord otr WHERE otr.tenantId = :tenantId " +
            "AND otr.status = 'PENDING'")
    Page<OvertimeRecord> findPendingRecords(@Param("tenantId") UUID tenantId, Pageable pageable);

    @Query("SELECT otr FROM OvertimeRecord otr WHERE otr.tenantId = :tenantId " +
            "AND otr.status = 'APPROVED' " +
            "AND otr.processedInPayroll = false")
    List<OvertimeRecord> findApprovedUnprocessedRecords(@Param("tenantId") UUID tenantId);

    @Query("SELECT otr FROM OvertimeRecord otr WHERE otr.tenantId = :tenantId " +
            "AND otr.payrollRunId = :payrollRunId")
    List<OvertimeRecord> findByPayrollRun(@Param("tenantId") UUID tenantId,
                                          @Param("payrollRunId") UUID payrollRunId);

    @Query("SELECT SUM(otr.effectiveHours) FROM OvertimeRecord otr " +
            "WHERE otr.tenantId = :tenantId " +
            "AND otr.employeeId = :employeeId " +
            "AND otr.overtimeDate BETWEEN :startDate AND :endDate " +
            "AND otr.status = 'APPROVED'")
    BigDecimal sumApprovedEffectiveHoursByEmployeeAndDateRange(
            @Param("tenantId") UUID tenantId,
            @Param("employeeId") UUID employeeId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);

    @Query("SELECT SUM(otr.overtimeHours) FROM OvertimeRecord otr " +
            "WHERE otr.tenantId = :tenantId " +
            "AND otr.employeeId = :employeeId " +
            "AND otr.overtimeDate BETWEEN :startDate AND :endDate " +
            "AND otr.status IN ('APPROVED', 'PROCESSED', 'PAID')")
    BigDecimal sumOvertimeHoursByEmployeeAndDateRange(
            @Param("tenantId") UUID tenantId,
            @Param("employeeId") UUID employeeId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);

    @Query("SELECT COUNT(otr) FROM OvertimeRecord otr " +
            "WHERE otr.tenantId = :tenantId " +
            "AND otr.status = 'PENDING'")
    long countPendingRecords(@Param("tenantId") UUID tenantId);

    boolean existsByTenantIdAndAttendanceRecordId(UUID tenantId, UUID attendanceRecordId);
}
