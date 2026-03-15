package com.hrms.infrastructure.attendance.repository;

import com.hrms.domain.attendance.AttendanceRecord;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AttendanceRecordRepository
                extends JpaRepository<AttendanceRecord, UUID>, JpaSpecificationExecutor<AttendanceRecord> {

        Optional<AttendanceRecord> findByEmployeeIdAndAttendanceDateAndTenantId(
                        UUID employeeId, LocalDate attendanceDate, UUID tenantId);

        Page<AttendanceRecord> findAllByTenantId(UUID tenantId, Pageable pageable);

        Page<AttendanceRecord> findAllByTenantIdAndEmployeeId(UUID tenantId, UUID employeeId, Pageable pageable);

        List<AttendanceRecord> findAllByEmployeeIdAndAttendanceDateBetween(
                        UUID employeeId, LocalDate startDate, LocalDate endDate);

        // Tenant-aware version
        List<AttendanceRecord> findAllByTenantIdAndEmployeeIdAndAttendanceDateBetween(
                        UUID tenantId, UUID employeeId, LocalDate startDate, LocalDate endDate);

        List<AttendanceRecord> findAllByTenantIdAndAttendanceDateBetween(
                        UUID tenantId, LocalDate startDate, LocalDate endDate);

        Page<AttendanceRecord> findAllByTenantIdAndStatus(
                        UUID tenantId, AttendanceRecord.AttendanceStatus status, Pageable pageable);

        @Query("SELECT a FROM AttendanceRecord a WHERE a.tenantId = :tenantId AND a.regularizationRequested = true AND a.regularizationApproved = false")
        Page<AttendanceRecord> findPendingRegularizations(@Param("tenantId") UUID tenantId, Pageable pageable);

        boolean existsByEmployeeIdAndAttendanceDate(UUID employeeId, LocalDate attendanceDate);

        @Query("SELECT COUNT(a) FROM AttendanceRecord a WHERE a.employeeId = :employeeId AND a.status = :status AND a.attendanceDate BETWEEN :startDate AND :endDate")
        Long countByEmployeeIdAndStatusAndDateRange(
                        @Param("employeeId") UUID employeeId,
                        @Param("status") AttendanceRecord.AttendanceStatus status,
                        @Param("startDate") LocalDate startDate,
                        @Param("endDate") LocalDate endDate);

        // Get all attendance for a specific date
        List<AttendanceRecord> findByTenantIdAndAttendanceDate(UUID tenantId, LocalDate attendanceDate);

        // Analytics methods
        @Query("SELECT COUNT(a) FROM AttendanceRecord a WHERE a.tenantId = :tenantId AND a.attendanceDate = :date")
        Long countByTenantIdAndDate(@Param("tenantId") UUID tenantId, @Param("date") LocalDate date);

        @Query("SELECT COUNT(a) FROM AttendanceRecord a WHERE a.tenantId = :tenantId AND a.attendanceDate = :date AND a.isLate = false")
        Long countByTenantIdAndDateAndOnTime(@Param("tenantId") UUID tenantId, @Param("date") LocalDate date);

        // Team-based analytics methods
        @Query("SELECT COUNT(a) FROM AttendanceRecord a WHERE a.tenantId = :tenantId AND a.attendanceDate = :date AND a.employeeId IN :employeeIds")
        Long countByTenantIdAndDateAndEmployeeIdIn(@Param("tenantId") UUID tenantId, @Param("date") LocalDate date,
                        @Param("employeeIds") List<UUID> employeeIds);

        @Query("SELECT COUNT(a) FROM AttendanceRecord a WHERE a.tenantId = :tenantId AND a.attendanceDate = :date AND a.isLate = false AND a.employeeId IN :employeeIds")
        Long countByTenantIdAndDateAndOnTimeAndEmployeeIdIn(@Param("tenantId") UUID tenantId,
                        @Param("date") LocalDate date, @Param("employeeIds") List<UUID> employeeIds);

        // Check if single employee has attendance
        @Query("SELECT COUNT(a) FROM AttendanceRecord a WHERE a.tenantId = :tenantId AND a.attendanceDate = :date AND a.employeeId = :employeeId")
        Long countByTenantIdAndDateAndEmployeeId(@Param("tenantId") UUID tenantId, @Param("date") LocalDate date,
                        @Param("employeeId") UUID employeeId);

        // Find attendance by tenant, employee, and date
        @Query("SELECT a FROM AttendanceRecord a WHERE a.tenantId = :tenantId AND a.employeeId = :employeeId AND a.attendanceDate = :date")
        Optional<AttendanceRecord> findByTenantIdAndEmployeeIdAndDate(
                        @Param("tenantId") UUID tenantId,
                        @Param("employeeId") UUID employeeId,
                        @Param("date") LocalDate date);

        // Count attendance for employee in date range
        @Query("SELECT COUNT(a) FROM AttendanceRecord a WHERE a.tenantId = :tenantId AND a.employeeId = :employeeId AND a.attendanceDate BETWEEN :startDate AND :endDate")
        Long countByTenantIdAndEmployeeIdAndDateBetween(
                        @Param("tenantId") UUID tenantId,
                        @Param("employeeId") UUID employeeId,
                        @Param("startDate") LocalDate startDate,
                        @Param("endDate") LocalDate endDate);

        // Find remote check-ins for a specific date
        @Query("SELECT a FROM AttendanceRecord a WHERE a.tenantId = :tenantId AND a.attendanceDate = :date AND a.isRemoteCheckin = true")
        List<AttendanceRecord> findRemoteCheckinsByTenantIdAndDate(
                        @Param("tenantId") UUID tenantId,
                        @Param("date") LocalDate date);

        // Count remote check-ins for a specific date
        @Query("SELECT COUNT(a) FROM AttendanceRecord a WHERE a.tenantId = :tenantId AND a.attendanceDate = :date AND a.isRemoteCheckin = true")
        Long countRemoteCheckinsByTenantIdAndDate(
                        @Param("tenantId") UUID tenantId,
                        @Param("date") LocalDate date);

        // Count remote check-ins for a specific date within a team
        @Query("SELECT COUNT(a) FROM AttendanceRecord a WHERE a.tenantId = :tenantId AND a.attendanceDate = :date AND a.isRemoteCheckin = true AND a.employeeId IN :employeeIds")
        Long countRemoteCheckinsByTenantIdAndDateAndEmployeeIdIn(
                        @Param("tenantId") UUID tenantId,
                        @Param("date") LocalDate date,
                        @Param("employeeIds") List<UUID> employeeIds);
}
