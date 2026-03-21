package com.hrms.api.integration.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DTO representing a DocuSign envelope for API responses.
 *
 * <p>Contains all publicly accessible envelope details except the tenant ID,
 * which is derived from the request context.</p>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocuSignEnvelopeResponse {

    /**
     * The unique identifier for this envelope in the NU-AURA database.
     */
    private UUID id;

    /**
     * The DocuSign envelope ID returned by the DocuSign API.
     */
    private String envelopeId;

    /**
     * The type of entity this envelope is associated with
     * (e.g., "LeaveRequest", "OfferLetter").
     */
    private String entityType;

    /**
     * The UUID of the entity this envelope is associated with.
     */
    private UUID entityId;

    /**
     * The current status of the envelope
     * (e.g., "SENT", "COMPLETED", "DECLINED", "ERROR").
     */
    private String status;

    /**
     * JSON array of recipient details (names, emails, signing status).
     */
    private String recipientsJson;

    /**
     * URL to the signed document after completion.
     * Null if envelope is not yet completed.
     */
    private String signedDocumentUrl;

    /**
     * Error message if the envelope processing encountered an error.
     */
    private String errorMessage;

    /**
     * Timestamp when the envelope was sent to DocuSign.
     */
    private Instant sentAt;

    /**
     * Timestamp when all recipients completed signing.
     */
    private Instant completedAt;

    /**
     * Timestamp when the envelope was created in the NU-AURA database.
     */
    private LocalDateTime createdAt;

    /**
     * Timestamp when the envelope was last modified.
     */
    private LocalDateTime updatedAt;
}
