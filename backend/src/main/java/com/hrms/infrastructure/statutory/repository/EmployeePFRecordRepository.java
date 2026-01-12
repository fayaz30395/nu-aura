package com.hrms.infrastructure.statutory.repository;
import com.hrms.domain.statutory.EmployeePFRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.*;

@Repository
public interface EmployeePFRecordRepository extends JpaRepository<EmployeePFRecord, UUID> {
    Optional<EmployeePFRecord> findByTenantIdAndEmployeeId(UUID tenantId, UUID employeeId);
    Optional<EmployeePFRecord> findByUanNumber(String uanNumber);
    List<EmployeePFRecord> findByTenantIdAndStatus(UUID tenantId, EmployeePFRecord.PFStatus status);
}
