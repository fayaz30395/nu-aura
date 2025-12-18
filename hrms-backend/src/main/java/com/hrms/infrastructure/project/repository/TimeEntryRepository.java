package com.hrms.infrastructure.project.repository;

import com.hrms.domain.project.TimeEntry;
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
public interface TimeEntryRepository extends JpaRepository<TimeEntry, UUID>, JpaSpecificationExecutor<TimeEntry> {

    Optional<TimeEntry> findByIdAndTenantId(UUID id, UUID tenantId);

    List<TimeEntry> findByTenantIdAndProjectId(UUID tenantId, UUID projectId);

    List<TimeEntry> findByTenantIdAndEmployeeId(UUID tenantId, UUID employeeId);

    List<TimeEntry> findByTenantIdAndStatus(UUID tenantId, TimeEntry.TimeEntryStatus status);

    List<TimeEntry> findByTenantIdAndEmployeeIdAndWorkDateBetween(
            UUID tenantId, UUID employeeId, LocalDate startDate, LocalDate endDate);

    List<TimeEntry> findByTenantIdAndProjectIdAndWorkDateBetween(
            UUID tenantId, UUID projectId, LocalDate startDate, LocalDate endDate);

    List<TimeEntry> findByTenantIdAndIsBillable(UUID tenantId, Boolean isBillable);

    @Query("SELECT te FROM HrmsTimeEntry te WHERE te.tenantId = :tenantId AND te.projectId = :projectId AND te.status = :status")
    List<TimeEntry> findByProjectAndStatus(@Param("tenantId") UUID tenantId,
                                          @Param("projectId") UUID projectId,
                                          @Param("status") TimeEntry.TimeEntryStatus status);

    @Query("SELECT te FROM HrmsTimeEntry te WHERE te.tenantId = :tenantId AND te.employeeId = :employeeId AND te.workDate = :date")
    List<TimeEntry> findByEmployeeAndDate(@Param("tenantId") UUID tenantId,
                                         @Param("employeeId") UUID employeeId,
                                         @Param("date") LocalDate date);
}
