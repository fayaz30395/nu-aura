package com.hrms.infrastructure.exit.repository;

import com.hrms.domain.exit.ExitClearance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ExitClearanceRepository extends JpaRepository<ExitClearance, UUID>, JpaSpecificationExecutor<ExitClearance> {
    
    Optional<ExitClearance> findByIdAndTenantId(UUID id, UUID tenantId);
    
    List<ExitClearance> findByTenantIdAndExitProcessId(UUID tenantId, UUID exitProcessId);
    
    List<ExitClearance> findByTenantIdAndApproverId(UUID tenantId, UUID approverId);
    
    List<ExitClearance> findByTenantIdAndStatus(UUID tenantId, ExitClearance.ClearanceStatus status);
}
