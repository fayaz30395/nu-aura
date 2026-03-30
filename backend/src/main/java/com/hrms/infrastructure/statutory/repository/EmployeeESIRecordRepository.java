package com.hrms.infrastructure.statutory.repository;
import com.hrms.domain.statutory.EmployeeESIRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface EmployeeESIRecordRepository extends JpaRepository<EmployeeESIRecord, UUID> {
    Optional<EmployeeESIRecord> findByTenantIdAndEmployeeId(UUID tenantId, UUID employeeId);
    Optional<EmployeeESIRecord> findByEsiNumber(String esiNumber);
    List<EmployeeESIRecord> findByTenantIdAndStatus(UUID tenantId, EmployeeESIRecord.ESIStatus status);
}
