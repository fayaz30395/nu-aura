package com.hrms.infrastructure.attendance.repository;

import com.hrms.domain.attendance.Holiday;
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
public interface HolidayRepository extends JpaRepository<Holiday, UUID> {

    Page<Holiday> findAllByTenantId(UUID tenantId, Pageable pageable);

    Page<Holiday> findAllByTenantIdAndYear(UUID tenantId, Integer year, Pageable pageable);

    List<Holiday> findAllByTenantIdAndYear(UUID tenantId, Integer year);

    List<Holiday> findAllByTenantIdAndHolidayDateBetween(UUID tenantId, LocalDate startDate, LocalDate endDate);

    @Query("SELECT h FROM Holiday h WHERE h.tenantId = :tenantId AND h.holidayDate = :date")
    Optional<Holiday> findByTenantIdAndDate(@Param("tenantId") UUID tenantId, @Param("date") LocalDate date);

    boolean existsByTenantIdAndHolidayDate(UUID tenantId, LocalDate holidayDate);

    @Query("SELECT COUNT(h) FROM Holiday h WHERE h.tenantId = :tenantId AND h.holidayDate BETWEEN :startDate AND :endDate")
    Long countByTenantIdAndHolidayDateBetween(@Param("tenantId") UUID tenantId, @Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);
}
