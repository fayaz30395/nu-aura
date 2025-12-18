package com.hrms.infrastructure.psa.repository;
import com.hrms.domain.psa.PSAProjectAllocation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.*;

@Repository
public interface PSAProjectAllocationRepository extends JpaRepository<PSAProjectAllocation, UUID> {
    List<PSAProjectAllocation> findByProjectIdAndIsActiveTrue(UUID projectId);
    List<PSAProjectAllocation> findByEmployeeIdAndIsActiveTrue(UUID employeeId);
    List<PSAProjectAllocation> findByTenantIdAndEmployeeIdAndIsActiveTrue(UUID tenantId, UUID employeeId);
}
