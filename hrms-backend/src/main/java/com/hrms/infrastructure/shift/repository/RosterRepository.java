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

    Page<Roster> findByTenantId(UUID tenantId, Pageable pageable);

    List<Roster> findByTenantIdAndStatus(UUID tenantId, Roster.RosterStatus status);

    @Query("SELECT r FROM Roster r WHERE r.tenantId = :tenantId AND r.departmentId = :departmentId AND r.status = 'PUBLISHED'")
    List<Roster> findPublishedByDepartment(@Param("tenantId") UUID tenantId, @Param("departmentId") UUID departmentId);

    @Query("SELECT r FROM Roster r WHERE r.tenantId = :tenantId AND :date BETWEEN r.startDate AND r.endDate AND r.status = 'PUBLISHED'")
    List<Roster> findActiveForDate(@Param("tenantId") UUID tenantId, @Param("date") LocalDate date);

    @Query("SELECT r FROM Roster r WHERE r.tenantId = :tenantId AND r.startDate >= :startDate AND r.endDate <= :endDate")
    List<Roster> findByDateRange(@Param("tenantId") UUID tenantId, @Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);
}
