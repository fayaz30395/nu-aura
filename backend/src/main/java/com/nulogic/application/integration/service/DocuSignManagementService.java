package com.nulogic.application.integration.service;

import com.nulogic.domain.integration.docusign.DocuSignEnvelope;
import com.nulogic.domain.integration.docusign.DocuSignTemplateMapping;
import com.nulogic.infrastructure.integration.repository.DocuSignEnvelopeRepository;
import com.nulogic.infrastructure.integration.repository.DocuSignTemplateMappingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Service that owns persistence for DocuSign envelopes and template mappings.
 *
 * <p>Encapsulates the {@link DocuSignEnvelopeRepository} and
 * {@link DocuSignTemplateMappingRepository} so the API layer
 * ({@code DocuSignController}) depends on this service rather than the
 * repositories directly. Methods are intentionally thin passthroughs that
 * preserve the exact query semantics (including tenant-scoped and the
 * deliberately tenant-agnostic webhook lookup) the controller relied on.</p>
 *
 * <p><strong>Security:</strong> tenant isolation is enforced by the underlying
 * repository query methods (each tenant-scoped query takes a {@code tenantId}).
 * {@link #findEnvelopeByEnvelopeId(String)} is intentionally tenant-agnostic and
 * is used only by the public webhook callback, which sets the tenant context
 * immediately after resolving the envelope.</p>
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class DocuSignManagementService {

    private final DocuSignEnvelopeRepository envelopeRepository;
    private final DocuSignTemplateMappingRepository templateMappingRepository;

    // ===================== Envelope operations =====================

    /**
     * Resolves an envelope by its DocuSign envelope ID without tenant filtering.
     *
     * <p><strong>Security Note:</strong> bypasses tenant isolation — used only for
     * webhook callback processing where the tenant is unknown until the envelope is
     * found. Callers must set the tenant context immediately after retrieval.</p>
     *
     * @param envelopeId the DocuSign envelope ID
     * @return the envelope if found
     */
    @Transactional(readOnly = true)
    public Optional<DocuSignEnvelope> findEnvelopeByEnvelopeId(String envelopeId) {
        return envelopeRepository.findByEnvelopeId(envelopeId);
    }

    /**
     * Finds an envelope by its primary key (UUID).
     *
     * @param id the envelope UUID
     * @return the envelope if found
     */
    @Transactional(readOnly = true)
    public Optional<DocuSignEnvelope> findEnvelopeById(UUID id) {
        return envelopeRepository.findById(id);
    }

    /**
     * Lists non-deleted envelopes for a tenant filtered by status.
     *
     * @param tenantId the tenant ID (required for isolation)
     * @param status   the envelope status to filter by
     * @param pageable pagination information
     * @return a page of matching envelopes
     */
    @Transactional(readOnly = true)
    public Page<DocuSignEnvelope> findEnvelopesByStatus(UUID tenantId, String status, Pageable pageable) {
        return envelopeRepository.findByTenantIdAndStatusAndIsDeletedFalse(tenantId, status, pageable);
    }

    /**
     * Lists all non-deleted envelopes for a tenant.
     *
     * @param tenantId the tenant ID (required for isolation)
     * @param pageable pagination information
     * @return a page of envelopes
     */
    @Transactional(readOnly = true)
    public Page<DocuSignEnvelope> findEnvelopes(UUID tenantId, Pageable pageable) {
        return envelopeRepository.findByTenantIdAndIsDeletedFalse(tenantId, pageable);
    }

    /**
     * Persists an envelope.
     *
     * @param envelope the envelope to save
     * @return the saved envelope
     */
    @Transactional
    public DocuSignEnvelope saveEnvelope(DocuSignEnvelope envelope) {
        return envelopeRepository.save(envelope);
    }

    // ===================== Template-mapping operations =====================

    /**
     * Lists all non-deleted template mappings for a tenant.
     *
     * @param tenantId the tenant ID (required for isolation)
     * @return the template mappings
     */
    @Transactional(readOnly = true)
    public List<DocuSignTemplateMapping> findTemplateMappings(UUID tenantId) {
        return templateMappingRepository.findByTenantIdAndIsDeletedFalse(tenantId);
    }

    /**
     * Finds the active template mapping for a document type within a tenant.
     *
     * @param tenantId     the tenant ID (required for isolation)
     * @param documentType the document type
     * @return the active mapping if found
     */
    @Transactional(readOnly = true)
    public Optional<DocuSignTemplateMapping> findActiveTemplateMapping(UUID tenantId, String documentType) {
        return templateMappingRepository.findByTenantIdAndDocumentTypeAndIsActiveTrue(tenantId, documentType);
    }

    /**
     * Persists a template mapping.
     *
     * @param mapping the mapping to save
     * @return the saved mapping
     */
    @Transactional
    public DocuSignTemplateMapping saveTemplateMapping(DocuSignTemplateMapping mapping) {
        return templateMappingRepository.save(mapping);
    }
}
