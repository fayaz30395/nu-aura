package com.hrms.infrastructure.psa.repository;
import com.hrms.domain.psa.PSATimesheet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PSATimesheetRepository extends JpaRepository<PSATimesheet, UUID> {
    List<PSATimesheet> findByTenantIdAndEmployeeIdOrderByWeekStartDateDesc(UUID tenantId, UUID employeeId);
    Optional<PSATimesheet> findByTenantIdAndEmployeeIdAndWeekStartDate(UUID tenantId, UUID employeeId, LocalDate weekStartDate);
    List<PSATimesheet> findByTenantIdAndStatus(UUID tenantId, PSATimesheet.TimesheetStatus status);
}
