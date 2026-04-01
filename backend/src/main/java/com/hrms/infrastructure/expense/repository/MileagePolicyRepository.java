package com.hrms.infrastructure.expense.repository;

import com.hrms.domain.expense.MileagePolicy;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MileagePolicyRepository extends JpaRepository<MileagePolicy, UUID> {

    List<MileagePolicy> findByTenantIdAndIsActiveTrue(UUID tenantId);

    Optional<MileagePolicy> findByIdAndTenantId(UUID id, UUID tenantId);

    boolean existsByTenantIdAndNameAndIdNot(UUID tenantId, String name, UUID id);

    boolean existsByTenantIdAndName(UUID tenantId, String name);
}
