package com.hrms.infrastructure.statutory.repository;

import com.hrms.domain.statutory.ProfessionalTaxSlab;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ProfessionalTaxSlabRepository extends JpaRepository<ProfessionalTaxSlab, UUID> {
    List<ProfessionalTaxSlab> findByTenantIdAndStateCodeAndIsActiveTrue(UUID tenantId, String stateCode);
}
