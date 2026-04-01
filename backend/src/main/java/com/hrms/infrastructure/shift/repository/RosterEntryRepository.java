package com.hrms.infrastructure.shift.repository;

import com.hrms.domain.shift.RosterEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface RosterEntryRepository extends JpaRepository<RosterEntry, UUID> {

    List<RosterEntry> findAllByRosterId(UUID rosterId);

    @Query("SELECT re FROM RosterEntry re WHERE re.tenantId = :tenantId " +
           "AND re.employeeId = :employeeId " +
           "AND re.workDate BETWEEN :startDate AND :endDate")
    List<RosterEntry> findByEmployeeAndDateRange(
            @Param("tenantId") UUID tenantId,
            @Param("employeeId") UUID employeeId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);

    @Query("SELECT re FROM RosterEntry re WHERE re.tenantId = :tenantId " +
           "AND re.rosterId = :rosterId " +
           "AND re.workDate BETWEEN :startDate AND :endDate")
    List<RosterEntry> findByRosterAndDateRange(
            @Param("tenantId") UUID tenantId,
            @Param("rosterId") UUID rosterId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);

    @Query("SELECT re FROM RosterEntry re WHERE re.tenantId = :tenantId " +
           "AND re.employeeId = :employeeId " +
           "AND re.workDate = :date")
    List<RosterEntry> findByEmployeeAndDate(
            @Param("tenantId") UUID tenantId,
            @Param("employeeId") UUID employeeId,
            @Param("date") LocalDate date);

    void deleteAllByRosterId(UUID rosterId);
}
