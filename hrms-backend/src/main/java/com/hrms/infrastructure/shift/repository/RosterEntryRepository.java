package com.hrms.infrastructure.shift.repository;

import com.hrms.domain.shift.RosterEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RosterEntryRepository extends JpaRepository<RosterEntry, UUID> {

    List<RosterEntry> findByRosterIdAndTenantId(UUID rosterId, UUID tenantId);

    Optional<RosterEntry> findByIdAndTenantId(UUID id, UUID tenantId);

    @Query("SELECT e FROM RosterEntry e WHERE e.tenantId = :tenantId AND e.employeeId = :employeeId AND e.workDate = :date")
    Optional<RosterEntry> findByEmployeeAndDate(@Param("tenantId") UUID tenantId, @Param("employeeId") UUID employeeId, @Param("date") LocalDate date);

    @Query("SELECT e FROM RosterEntry e WHERE e.tenantId = :tenantId AND e.employeeId = :employeeId AND e.workDate BETWEEN :startDate AND :endDate ORDER BY e.workDate")
    List<RosterEntry> findByEmployeeAndDateRange(@Param("tenantId") UUID tenantId, @Param("employeeId") UUID employeeId, @Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    @Query("SELECT e FROM RosterEntry e WHERE e.rosterId = :rosterId AND e.workDate = :date")
    List<RosterEntry> findByRosterAndDate(@Param("rosterId") UUID rosterId, @Param("date") LocalDate date);

    @Query("SELECT e FROM RosterEntry e WHERE e.rosterId = :rosterId AND e.employeeId = :employeeId AND e.isAcknowledged = false")
    List<RosterEntry> findPendingAcknowledgment(@Param("rosterId") UUID rosterId, @Param("employeeId") UUID employeeId);

    @Query("SELECT e FROM RosterEntry e WHERE e.tenantId = :tenantId AND e.shiftId = :shiftId AND e.workDate = :date")
    List<RosterEntry> findByShiftAndDate(@Param("tenantId") UUID tenantId, @Param("shiftId") UUID shiftId, @Param("date") LocalDate date);
}
