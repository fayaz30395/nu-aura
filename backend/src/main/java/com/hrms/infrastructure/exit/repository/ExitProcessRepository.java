package com.hrms.infrastructure.exit.repository;

import com.hrms.domain.exit.ExitProcess;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ExitProcessRepository extends JpaRepository<ExitProcess, UUID>, JpaSpecificationExecutor<ExitProcess> {

    Optional<ExitProcess> findByIdAndTenantId(UUID id, UUID tenantId);

    Optional<ExitProcess> findByTenantIdAndEmployeeId(UUID tenantId, UUID employeeId);

    List<ExitProcess> findByTenantIdAndStatus(UUID tenantId, ExitProcess.ExitStatus status);

    List<ExitProcess> findByTenantIdAndExitType(UUID tenantId, ExitProcess.ExitType exitType);
}
