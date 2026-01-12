package com.hrms.infrastructure.shift.repository;

import com.hrms.domain.shift.ShiftAssignment;
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
public interface ShiftAssignmentRepository extends JpaRepository<ShiftAssignment, UUID> {

    Optional<ShiftAssignment> findByIdAndTenantId(UUID id, UUID tenantId);

    Page<ShiftAssignment> findAllByTenantId(UUID tenantId, Pageable pageable);

    List<ShiftAssignment> findAllByTenantIdAndEmployeeId(UUID tenantId, UUID employeeId);

    Page<ShiftAssignment> findAllByTenantIdAndEmployeeId(UUID tenantId, UUID employeeId, Pageable pageable);

    @Query("SELECT sa FROM ShiftAssignment sa WHERE sa.tenantId = :tenantId " +
           "AND sa.employeeId = :employeeId " +
           "AND sa.assignmentDate = :date " +
           "AND sa.status = 'ACTIVE'")
    Optional<ShiftAssignment> findActiveAssignmentForEmployeeOnDate(
            @Param("tenantId") UUID tenantId,
            @Param("employeeId") UUID employeeId,
            @Param("date") LocalDate date);

    @Query("SELECT sa FROM ShiftAssignment sa WHERE sa.tenantId = :tenantId " +
           "AND sa.employeeId = :employeeId " +
           "AND sa.assignmentDate BETWEEN :startDate AND :endDate " +
           "AND sa.status = 'ACTIVE'")
    List<ShiftAssignment> findAssignmentsForEmployeeBetweenDates(
            @Param("tenantId") UUID tenantId,
            @Param("employeeId") UUID employeeId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);

    @Query("SELECT sa FROM ShiftAssignment sa WHERE sa.tenantId = :tenantId " +
           "AND sa.shiftId = :shiftId " +
           "AND sa.assignmentDate BETWEEN :startDate AND :endDate " +
           "AND sa.status = 'ACTIVE'")
    List<ShiftAssignment> findAssignmentsForShiftBetweenDates(
            @Param("tenantId") UUID tenantId,
            @Param("shiftId") UUID shiftId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);

    @Query("SELECT sa FROM ShiftAssignment sa WHERE sa.tenantId = :tenantId " +
           "AND sa.assignmentDate = :date " +
           "AND sa.status = 'ACTIVE'")
    List<ShiftAssignment> findAllActiveAssignmentsForDate(
            @Param("tenantId") UUID tenantId,
            @Param("date") LocalDate date);

    @Query("SELECT sa FROM ShiftAssignment sa WHERE sa.tenantId = :tenantId " +
           "AND sa.status = 'ACTIVE' " +
           "AND sa.effectiveFrom <= :date " +
           "AND (sa.effectiveTo IS NULL OR sa.effectiveTo >= :date)")
    List<ShiftAssignment> findActiveEffectiveAssignmentsForDate(
            @Param("tenantId") UUID tenantId,
            @Param("date") LocalDate date);
}
