package com.hrms.infrastructure.esignature.repository;

import com.hrms.domain.esignature.SignatureRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SignatureRequestRepository extends JpaRepository<SignatureRequest, UUID>, JpaSpecificationExecutor<SignatureRequest> {

    Optional<SignatureRequest> findByIdAndTenantId(UUID id, UUID tenantId);

    List<SignatureRequest> findByTenantIdAndCreatedBy(UUID tenantId, UUID createdBy);

    List<SignatureRequest> findByTenantIdAndStatus(UUID tenantId, SignatureRequest.SignatureStatus status);

    List<SignatureRequest> findByTenantIdAndDocumentType(UUID tenantId, SignatureRequest.DocumentType documentType);

    List<SignatureRequest> findByTenantIdAndIsTemplate(UUID tenantId, Boolean isTemplate);

    List<SignatureRequest> findByTenantIdAndExpiresAtBefore(UUID tenantId, LocalDateTime expiryDate);

    List<SignatureRequest> findByTenantIdAndStatusAndExpiresAtBefore(
            UUID tenantId,
            SignatureRequest.SignatureStatus status,
            LocalDateTime expiryDate
    );

    List<SignatureRequest> findByTenantIdAndCreatedByOrderByCreatedAtDesc(UUID tenantId, UUID createdBy);

    List<SignatureRequest> findByTenantIdOrderByCreatedAtDesc(UUID tenantId);
}
