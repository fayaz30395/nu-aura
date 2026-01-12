package com.hrms.infrastructure.tax.repository;

import com.hrms.domain.tax.TaxProof;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TaxProofRepository extends JpaRepository<TaxProof, UUID>, JpaSpecificationExecutor<TaxProof> {

    Optional<TaxProof> findByIdAndTenantId(UUID id, UUID tenantId);

    List<TaxProof> findByTenantIdAndTaxDeclarationId(UUID tenantId, UUID taxDeclarationId);

    List<TaxProof> findByTenantIdAndEmployeeId(UUID tenantId, UUID employeeId);

    List<TaxProof> findByTenantIdAndStatus(UUID tenantId, TaxProof.ProofStatus status);

    List<TaxProof> findByTenantIdAndTaxDeclarationIdAndInvestmentSection(
            UUID tenantId, UUID taxDeclarationId, TaxProof.InvestmentSection section);
}
