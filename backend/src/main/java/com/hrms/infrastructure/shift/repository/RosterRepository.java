package com.hrms.infrastructure.shift.repository;

import com.hrms.domain.shift.Roster;
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
public interface RosterRepository extends JpaRepository<Roster, UUID> {

    Optional<Roster> findByIdAndTenantId(UUID id, UUID tenantId);

    Page<Roster> findAllByTenantId(UUID tenantId, Pageable pageable);

    @Query("SELECT r FROM Roster r WHERE r.tenantId = :tenantId " +
            "AND r.status = 'PUBLISHED' " +
            "AND r.startDate <= :endDate AND r.endDate >= :startDate")
    List<Roster> findPublishedRostersOverlapping(
            @Param("tenantId") UUID tenantId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);

    @Query("SELECT r FROM Roster r WHERE r.tenantId = :tenantId " +
            "AND r.departmentId = :departmentId " +
            "AND r.startDate <= :endDate AND r.endDate >= :startDate")
    List<Roster> findByDepartmentAndDateRange(
            @Param("tenantId") UUID tenantId,
            @Param("departmentId") UUID departmentId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);
}
