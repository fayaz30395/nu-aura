package com.hrms.infrastructure.overtime.repository;

import com.hrms.domain.overtime.OvertimePolicy;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface OvertimePolicyRepository extends JpaRepository<OvertimePolicy, UUID> {

    Optional<OvertimePolicy> findByIdAndTenantId(UUID id, UUID tenantId);

    Page<OvertimePolicy> findAllByTenantId(UUID tenantId, Pageable pageable);

    List<OvertimePolicy> findAllByTenantIdAndIsActive(UUID tenantId, Boolean isActive);

    Optional<OvertimePolicy> findByTenantIdAndPolicyCode(UUID tenantId, String policyCode);

    @Query("SELECT op FROM OvertimePolicy op WHERE op.tenantId = :tenantId " +
            "AND op.isDefault = true AND op.isActive = true")
    Optional<OvertimePolicy> findDefaultPolicy(@Param("tenantId") UUID tenantId);

    @Query("SELECT op FROM OvertimePolicy op WHERE op.tenantId = :tenantId " +
            "AND op.departmentId = :departmentId " +
            "AND op.isActive = true")
    Optional<OvertimePolicy> findPolicyForDepartment(@Param("tenantId") UUID tenantId,
                                                     @Param("departmentId") UUID departmentId);

    boolean existsByTenantIdAndPolicyCode(UUID tenantId, String policyCode);
}
