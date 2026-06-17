package com.nulogic.infrastructure.contract.repository;

import com.nulogic.domain.contract.ContractSignature;
import com.nulogic.domain.contract.SignatureStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for ContractSignature entity
 */
@Repository
public interface ContractSignatureRepository extends JpaRepository<ContractSignature, UUID> {

    List<ContractSignature> findByContractId(UUID contractId);

    // Tenant-isolated variants — prefer these in service layer
    List<ContractSignature> findByContractIdAndTenantId(UUID contractId, UUID tenantId);

    Optional<ContractSignature> findByIdAndTenantId(UUID id, UUID tenantId);

    Optional<ContractSignature> findByContractIdAndSignerEmail(UUID contractId, String signerEmail);

    Optional<ContractSignature> findByContractIdAndSignerEmailAndTenantId(UUID contractId, String signerEmail, UUID tenantId);

    List<ContractSignature> findByContractIdAndStatus(UUID contractId, SignatureStatus status);

    @Query("SELECT cs FROM ContractSignature cs WHERE cs.contractId = :contractId AND cs.status = 'PENDING'")
    List<ContractSignature> findPendingSignatures(@Param("contractId") UUID contractId);

    /**
     * Batch pending-signature counts for multiple contracts in one query,
     * eliminating the per-contract findPendingSignatures N+1 in list/page mappers.
     * Returns: [contractId, count].
     */
    @Query("SELECT cs.contractId, COUNT(cs) FROM ContractSignature cs " +
            "WHERE cs.contractId IN :contractIds AND cs.status = 'PENDING' " +
            "GROUP BY cs.contractId")
    List<Object[]> countPendingByContractIds(@Param("contractIds") List<UUID> contractIds);

    @Query("SELECT COUNT(cs) FROM ContractSignature cs WHERE cs.contractId = :contractId AND cs.status = 'SIGNED'")
    int countSignedSignatures(@Param("contractId") UUID contractId);

    @Query("SELECT COUNT(cs) FROM ContractSignature cs WHERE cs.contractId = :contractId")
    int countTotalSignatures(@Param("contractId") UUID contractId);

    @Query("SELECT CASE WHEN COUNT(cs) = 0 THEN true ELSE false END FROM ContractSignature cs " +
            "WHERE cs.contractId = :contractId AND cs.status != 'SIGNED'")
    boolean allSignaturesCompleted(@Param("contractId") UUID contractId);
}
