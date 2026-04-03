package com.hrms.infrastructure.integration.repository;

import com.hrms.domain.integration.docusign.DocuSignTemplateMapping;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Spring Data JPA repository for DocuSignTemplateMapping entities.
 *
 * <p>Provides query methods for retrieving template mappings by document type,
 * active status, and tenant. Used for dynamic template selection during envelope
 * creation.</p>
 */
@Repository
public interface DocuSignTemplateMappingRepository extends JpaRepository<DocuSignTemplateMapping, UUID> {

    /**
     * Finds an active template mapping for a specific document type within a tenant.
     *
     * <p>Returns only active mappings (isActive = true) that have not been soft-deleted.
     * This is the primary method used when creating a new envelope and needing to
     * look up the appropriate DocuSign template.</p>
     *
     * @param tenantId     the tenant ID (required for isolation)
     * @param documentType the document type (e.g., "OfferLetter", "LeaveRequest")
     * @return an Optional containing the active mapping, or empty if not found
     */
    Optional<DocuSignTemplateMapping> findByTenantIdAndDocumentTypeAndIsActiveTrue(
            UUID tenantId, String documentType);

    /**
     * Finds all non-deleted template mappings for a tenant, regardless of active status.
     *
     * <p>Used for administrative listing and configuration purposes. Both active
     * and inactive mappings are included.</p>
     *
     * @param tenantId the tenant ID (required for isolation)
     * @return a list of all non-deleted template mappings for the tenant
     */
    List<DocuSignTemplateMapping> findByTenantIdAndIsDeletedFalse(UUID tenantId);
}
