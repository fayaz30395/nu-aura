package com.hrms.infrastructure.timetracking.repository;

import com.hrms.domain.timetracking.TimeEntry;
import com.hrms.domain.timetracking.TimeEntry.TimeEntryStatus;
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
public interface TimeEntryRepository extends JpaRepository<TimeEntry, UUID> {

    Optional<TimeEntry> findByIdAndTenantId(UUID id, UUID tenantId);

    Page<TimeEntry> findByEmployeeIdAndTenantId(UUID employeeId, UUID tenantId, Pageable pageable);

    Page<TimeEntry> findByTenantId(UUID tenantId, Pageable pageable);

    Page<TimeEntry> findByTenantIdAndStatus(UUID tenantId, TimeEntryStatus status, Pageable pageable);

    List<TimeEntry> findByEmployeeIdAndTenantIdAndEntryDateBetween(
            UUID employeeId, UUID tenantId, LocalDate startDate, LocalDate endDate);

    List<TimeEntry> findByProjectIdAndTenantId(UUID projectId, UUID tenantId);

    List<TimeEntry> findByTenantIdAndStatusIn(UUID tenantId, List<TimeEntryStatus> statuses);

    @Query("SELECT t FROM TimeEntry t WHERE t.tenantId = :tenantId AND t.employeeId = :employeeId " +
            "AND t.entryDate = :date")
    List<TimeEntry> findByEmployeeAndDate(
            @Param("tenantId") UUID tenantId,
            @Param("employeeId") UUID employeeId,
            @Param("date") LocalDate date);

    @Query("SELECT SUM(t.hoursWorked) FROM TimeEntry t WHERE t.tenantId = :tenantId " +
            "AND t.employeeId = :employeeId AND t.entryDate BETWEEN :startDate AND :endDate")
    BigDecimal sumHoursWorkedByEmployee(
            @Param("tenantId") UUID tenantId,
            @Param("employeeId") UUID employeeId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);

    @Query("SELECT SUM(t.billableHours) FROM TimeEntry t WHERE t.tenantId = :tenantId " +
            "AND t.projectId = :projectId AND t.isBillable = true")
    BigDecimal sumBillableHoursByProject(
            @Param("tenantId") UUID tenantId,
            @Param("projectId") UUID projectId);

    @Query("SELECT SUM(t.billingAmount) FROM TimeEntry t WHERE t.tenantId = :tenantId " +
            "AND t.projectId = :projectId AND t.status = 'APPROVED'")
    BigDecimal sumBillingAmountByProject(
            @Param("tenantId") UUID tenantId,
            @Param("projectId") UUID projectId);

    @Query("SELECT COUNT(t) FROM TimeEntry t WHERE t.tenantId = :tenantId AND t.status = :status")
    long countByStatus(@Param("tenantId") UUID tenantId, @Param("status") TimeEntryStatus status);
}
