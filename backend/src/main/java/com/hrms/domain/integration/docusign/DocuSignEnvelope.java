package com.hrms.domain.integration.docusign;

import lombok.extern.slf4j.Slf4j;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.SQLRestriction;

import java.time.Instant;
import java.util.UUID;

/**
 * JPA entity representing a DocuSign envelope in the NU-AURA system.
 *
 * <p>An envelope is a collection of documents and recipients sent to DocuSign
 * for signing. This entity tracks the envelope's lifecycle, including its status,
 * recipients, signed documents, and error details.</p>
 *
 * <p><strong>Lifecycle States:</strong>
 * <ul>
 *   <li>CREATED — Envelope created locally, not yet sent to DocuSign</li>
 *   <li>SENT — Envelope sent to DocuSign, awaiting signature</li>
 *   <li>DELIVERED — All documents delivered to recipients</li>
 *   <li>COMPLETED — All recipients have signed</li>
 *   <li>DECLINED — One or more recipients declined to sign</li>
 *   <li>VOIDED — Envelope was voided (cancelled)</li>
 *   <li>ERROR — An error occurred during processing</li>
 * </ul>
 *
 * <p><strong>Soft Delete:</strong> Envelopes are soft-deleted using the inherited
 * isDeleted and deletedAt fields from TenantAware. Use {@link #softDelete()} to mark
 * as deleted without removing from the database.</p>
 */
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@SQLRestriction("is_deleted = false")
@Table(name = "docusign_envelopes", indexes = {
        @Index(name = "idx_docusign_envelope_tenant_entity", columnList = "tenant_id, entity_type, entity_id"),
        @Index(name = "idx_docusign_envelope_id", columnList = "envelope_id"),
        @Index(name = "idx_docusign_envelope_status", columnList = "status"),
        @Index(name = "idx_docusign_envelope_created_at", columnList = "created_at")
})
@Slf4j
public class DocuSignEnvelope extends TenantAware {

    /**
     * The DocuSign envelope ID returned by the DocuSign API.
     * Used to correlate with external DocuSign records and webhooks.
     */
    @Column(nullable = false, unique = true)
    private String envelopeId;

    /**
     * The type of entity this envelope is associated with.
     * Examples: "LeaveRequest", "OfferLetter", "Document", "AgreementTemplate"
     */
    @Column(nullable = false, length = 100)
    private String entityType;

    /**
     * The UUID of the entity this envelope is associated with.
     * For example, if entityType is "LeaveRequest", this is the leaveRequestId.
     */
    @Column(nullable = false)
    private UUID entityId;

    /**
     * The current status of the envelope in DocuSign.
     * Allowed values: CREATED, SENT, DELIVERED, COMPLETED, DECLINED, VOIDED, ERROR
     */
    @Column(nullable = false, length = 20)
    private String status; // CREATED, SENT, DELIVERED, COMPLETED, DECLINED, VOIDED, ERROR

    /**
     * JSON array of recipient details, including names, email addresses, and signing status.
     * Example structure:
     * [
     * {"email": "john@example.com", "name": "John Doe", "status": "sent"},
     * {"email": "jane@example.com", "name": "Jane Doe", "status": "completed"}
     * ]
     */
    @Column(columnDefinition = "TEXT")
    private String recipientsJson;

    /**
     * URL to the signed document returned by DocuSign after completion.
     * Null until the envelope is completed.
     */
    @Column(columnDefinition = "TEXT")
    private String signedDocumentUrl;

    /**
     * Error message if the envelope processing encountered an error.
     * Null if status is not ERROR.
     */
    @Column(columnDefinition = "TEXT")
    private String errorMessage;

    /**
     * Timestamp when the envelope was sent to DocuSign.
     * Null if not yet sent.
     */
    @Column(name = "sent_at")
    private Instant sentAt;

    /**
     * Timestamp when all recipients completed signing.
     * Null if envelope is not yet completed.
     */
    @Column(name = "completed_at")
    private Instant completedAt;

    /**
     * Timestamp when the envelope was created in the local database.
     * Automatically set by Spring Data's @CreatedDate annotation.
     * Inherited from TenantAware/BaseEntity.
     */
    // Inherited from BaseEntity: createdAt

    /**
     * Timestamp when the envelope was last modified in the local database.
     * Inherited from TenantAware/BaseEntity.
     */
    // Inherited from BaseEntity: updatedAt
}
