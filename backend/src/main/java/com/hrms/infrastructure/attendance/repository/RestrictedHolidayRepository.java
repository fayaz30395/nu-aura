package com.hrms.infrastructure.attendance.repository;

import com.hrms.domain.attendance.RestrictedHoliday;
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
public interface RestrictedHolidayRepository extends JpaRepository<RestrictedHoliday, UUID> {

    List<RestrictedHoliday> findAllByTenantIdAndYearAndIsActiveTrue(UUID tenantId, Integer year);

    Page<RestrictedHoliday> findAllByTenantIdAndYear(UUID tenantId, Integer year, Pageable pageable);

    Page<RestrictedHoliday> findAllByTenantId(UUID tenantId, Pageable pageable);

    Optional<RestrictedHoliday> findByIdAndTenantId(UUID id, UUID tenantId);

    boolean existsByTenantIdAndHolidayDateAndYear(UUID tenantId, LocalDate holidayDate, Integer year);

    @Query("SELECT rh FROM RestrictedHoliday rh WHERE rh.tenantId = :tenantId " +
           "AND rh.year = :year AND rh.isActive = true AND rh.isDeleted = false " +
           "AND rh.holidayDate >= :today " +
           "ORDER BY rh.holidayDate ASC")
    List<RestrictedHoliday> findUpcomingByTenantIdAndYear(
            @Param("tenantId") UUID tenantId,
            @Param("year") Integer year,
            @Param("today") LocalDate today);
}
