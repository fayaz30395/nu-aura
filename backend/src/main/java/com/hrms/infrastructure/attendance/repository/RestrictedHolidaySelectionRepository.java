package com.hrms.infrastructure.attendance.repository;

import com.hrms.domain.attendance.RestrictedHolidaySelection;
import com.hrms.domain.attendance.RestrictedHolidaySelection.SelectionStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RestrictedHolidaySelectionRepository extends JpaRepository<RestrictedHolidaySelection, UUID> {

    List<RestrictedHolidaySelection> findAllByTenantIdAndEmployeeId(UUID tenantId, UUID employeeId);

    Page<RestrictedHolidaySelection> findAllByTenantIdAndEmployeeId(
            UUID tenantId, UUID employeeId, Pageable pageable);

    Page<RestrictedHolidaySelection> findAllByTenantIdAndStatus(
            UUID tenantId, SelectionStatus status, Pageable pageable);

    Page<RestrictedHolidaySelection> findAllByTenantIdAndRestrictedHolidayId(
            UUID tenantId, UUID restrictedHolidayId, Pageable pageable);

    Optional<RestrictedHolidaySelection> findByIdAndTenantId(UUID id, UUID tenantId);

    boolean existsByTenantIdAndEmployeeIdAndRestrictedHolidayId(
            UUID tenantId, UUID employeeId, UUID restrictedHolidayId);

    @Query("SELECT COUNT(s) FROM RestrictedHolidaySelection s " +
            "WHERE s.tenantId = :tenantId AND s.employeeId = :employeeId " +
            "AND s.status IN ('PENDING', 'APPROVED') AND s.isDeleted = false " +
            "AND s.restrictedHoliday.year = :year")
    long countActiveSelectionsByEmployeeAndYear(
            @Param("tenantId") UUID tenantId,
            @Param("employeeId") UUID employeeId,
            @Param("year") Integer year);

    @Query("SELECT s FROM RestrictedHolidaySelection s " +
            "JOIN FETCH s.restrictedHoliday rh " +
            "WHERE s.tenantId = :tenantId AND s.employeeId = :employeeId " +
            "AND rh.year = :year AND s.isDeleted = false " +
            "ORDER BY rh.holidayDate ASC")
    List<RestrictedHolidaySelection> findByEmployeeAndYear(
            @Param("tenantId") UUID tenantId,
            @Param("employeeId") UUID employeeId,
            @Param("year") Integer year);
}
