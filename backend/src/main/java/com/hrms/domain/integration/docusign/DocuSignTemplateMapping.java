package com.hrms.domain.integration.docusign;

import lombok.extern.slf4j.Slf4j;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.SQLRestriction;
import org.hibernate.annotations.Where;

import java.util.UUID;

/**
 * JPA entity representing a mapping between a document type and a DocuSign template.
 *
 * <p>Allows administrators to configure which DocuSign template should be used
 * for specific document types (e.g., offer letters, leave requests, employment
 * agreements). This enables dynamic template selection at runtime.</p>
 *
 * <p><strong>Example Usage:</strong>
 * <ul>
 *   <li>Document Type: "OfferLetter" → DocuSign Template: "template_123abc"</li>
 *   <li>Document Type: "TerminationLetter" → DocuSign Template: "template_456def"</li>
 * </ul>
 *
 * <p><strong>Soft Delete:</strong> Mappings are soft-deleted using the inherited
 * isDeleted and deletedAt fields from TenantAware. Inactive mappings can be
 * deactivated by setting isActive = false without deletion.</p>
 */
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@Where(clause = "is_deleted = false")
@Entity
@SQLRestriction("is_deleted = false")
@Table(name = "docusign_template_mappings", indexes = {
    @Index(name = "idx_docusign_mapping_tenant_doctype", columnList = "tenant_id, document_type"),
    @Index(name = "idx_docusign_mapping_tenant_active", columnList = "tenant_id, is_active")
})
@Slf4j
public class DocuSignTemplateMapping extends TenantAware {

    /**
     * The document type that this template mapping applies to.
     * Examples: "OfferLetter", "LeaveRequest", "TerminationLetter", "EmploymentAgreement"
     * This value should match the entityType used in DocuSignEnvelope.
     */
    @Column(nullable = false, length = 100)
    private String documentType;

    /**
     * The DocuSign template ID for this document type.
     * This ID is obtained from the DocuSign admin console.
     */
    @Column(nullable = false)
    private String docusignTemplateId;

    /**
     * Optional description of this mapping, for administrative reference.
     */
    @Column(columnDefinition = "TEXT")
    private String description;

    /**
     * Whether this mapping is currently active.
     * Inactive mappings are not used for new envelope creation, but existing
     * envelopes referencing this mapping remain unchanged.
     */
    @Column(nullable = false)
    @Builder.Default
    private boolean isActive = true;

    /**
     * Whether this mapping has been soft-deleted.
     * Inherited from TenantAware/BaseEntity.
     * Soft-deleted mappings should not be used for new envelope creation.
     */
    // Inherited from BaseEntity: isDeleted

    /**
     * Timestamp when this mapping was soft-deleted, if applicable.
     * Inherited from TenantAware/BaseEntity.
     */
    // Inherited from BaseEntity: deletedAt

    /**
     * Timestamp when the mapping was created.
     * Inherited from TenantAware/BaseEntity.
     */
    // Inherited from BaseEntity: createdAt

    /**
     * Timestamp when the mapping was last modified.
     * Inherited from TenantAware/BaseEntity.
     */
    // Inherited from BaseEntity: updatedAt
}
