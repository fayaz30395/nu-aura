package com.hrms.infrastructure.integration.repository;

import com.hrms.domain.integration.docusign.DocuSignEnvelope;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

/**
 * Spring Data JPA repository for DocuSignEnvelope entities.
 *
 * <p>Provides query methods for retrieving envelopes by tenant, DocuSign ID,
 * entity reference, and status. Includes a tenant-agnostic lookup method for
 * webhook callback processing.</p>
 */
@Repository
public interface DocuSignEnvelopeRepository extends JpaRepository<DocuSignEnvelope, UUID> {

    /**
     * Finds an envelope by DocuSign envelope ID within a specific tenant.
     *
     * @param tenantId the tenant ID (required for isolation)
     * @param envelopeId the DocuSign envelope ID
     * @return an Optional containing the envelope, or empty if not found
     */
    Optional<DocuSignEnvelope> findByTenantIdAndEnvelopeId(UUID tenantId, String envelopeId);

    /**
     * Finds envelopes for a specific entity (e.g., leave request, offer letter) within a tenant.
     *
     * @param tenantId the tenant ID (required for isolation)
     * @param entityType the entity type (e.g., "LeaveRequest", "OfferLetter")
     * @param entityId the UUID of the entity
     * @return an Optional containing the envelope, or empty if not found
     */
    Optional<DocuSignEnvelope> findByTenantIdAndEntityTypeAndEntityId(
            UUID tenantId, String entityType, UUID entityId);

    /**
     * Finds all envelopes with a specific status within a tenant, excluding soft-deleted envelopes.
     *
     * @param tenantId the tenant ID (required for isolation)
     * @param status the envelope status (e.g., "SENT", "COMPLETED", "FAILED")
     * @param pageable pagination information
     * @return a page of envelopes with the specified status
     */
    Page<DocuSignEnvelope> findByTenantIdAndStatusAndIsDeletedFalse(
            UUID tenantId, String status, Pageable pageable);

    /**
     * Finds an envelope by DocuSign envelope ID without tenant filtering.
     *
     * <p><strong>Security Note:</strong> This method bypasses tenant isolation
     * and should only be used for webhook callback processing where the tenant
     * is unknown at the time of lookup. The tenant must be verified and set in
     * TenantContext immediately after retrieval.</p>
     *
     * @param envelopeId the DocuSign envelope ID
     * @return an Optional containing the envelope, or empty if not found
     */
    Optional<DocuSignEnvelope> findByEnvelopeId(String envelopeId);

    /**
     * Finds all non-deleted envelopes for a tenant, excluding soft-deleted envelopes.
     *
     * @param tenantId the tenant ID (required for isolation)
     * @param pageable pagination information
     * @return a page of all non-deleted envelopes for the tenant
     */
    Page<DocuSignEnvelope> findByTenantIdAndIsDeletedFalse(UUID tenantId, Pageable pageable);
}
