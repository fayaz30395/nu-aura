package com.hrms.infrastructure.esignature.repository;

import com.hrms.domain.esignature.SignatureApproval;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SignatureApprovalRepository extends JpaRepository<SignatureApproval, UUID>, JpaSpecificationExecutor<SignatureApproval> {

    Optional<SignatureApproval> findByIdAndTenantId(UUID id, UUID tenantId);

    List<SignatureApproval> findByTenantIdAndSignatureRequestId(UUID tenantId, UUID signatureRequestId);

    List<SignatureApproval> findByTenantIdAndSignerId(UUID tenantId, UUID signerId);

    List<SignatureApproval> findByTenantIdAndStatus(UUID tenantId, SignatureApproval.ApprovalStatus status);

    List<SignatureApproval> findByTenantIdAndSignerIdAndStatus(
            UUID tenantId,
            UUID signerId,
            SignatureApproval.ApprovalStatus status
    );

    List<SignatureApproval> findByTenantIdAndSignatureRequestIdOrderBySigningOrderAsc(
            UUID tenantId,
            UUID signatureRequestId
    );

    Optional<SignatureApproval> findByTenantIdAndSignatureRequestIdAndSignerId(
            UUID tenantId,
            UUID signatureRequestId,
            UUID signerId
    );

    long countByTenantIdAndSignatureRequestIdAndStatus(
            UUID tenantId,
            UUID signatureRequestId,
            SignatureApproval.ApprovalStatus status
    );

    /**
     * Find signature approval by authentication token (for external signing).
     */
    Optional<SignatureApproval> findByAuthenticationToken(String token);

    /**
     * Find signature approval by email and signature request (for external signing verification).
     */
    Optional<SignatureApproval> findBySignatureRequestIdAndSignerEmail(UUID signatureRequestId, String signerEmail);
}
