package com.hrms.infrastructure.contract.repository;

import com.hrms.domain.contract.ContractSignature;
import com.hrms.domain.contract.SignatureStatus;
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

    Optional<ContractSignature> findByContractIdAndSignerEmail(UUID contractId, String signerEmail);

    List<ContractSignature> findByContractIdAndStatus(UUID contractId, SignatureStatus status);

    @Query("SELECT cs FROM ContractSignature cs WHERE cs.contractId = :contractId AND cs.status = 'PENDING'")
    List<ContractSignature> findPendingSignatures(@Param("contractId") UUID contractId);

    @Query("SELECT COUNT(cs) FROM ContractSignature cs WHERE cs.contractId = :contractId AND cs.status = 'SIGNED'")
    int countSignedSignatures(@Param("contractId") UUID contractId);

    @Query("SELECT COUNT(cs) FROM ContractSignature cs WHERE cs.contractId = :contractId")
    int countTotalSignatures(@Param("contractId") UUID contractId);

    @Query("SELECT CASE WHEN COUNT(cs) = 0 THEN true ELSE false END FROM ContractSignature cs " +
            "WHERE cs.contractId = :contractId AND cs.status != 'SIGNED'")
    boolean allSignaturesCompleted(@Param("contractId") UUID contractId);
}
