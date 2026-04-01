package com.hrms.api.integration.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DTO representing a DocuSign template mapping for API responses.
 *
 * <p>Contains all template mapping details except the tenant ID, which is
 * derived from the request context.</p>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocuSignTemplateMappingResponse {

    /**
     * The unique identifier for this mapping.
     */
    private UUID id;

    /**
     * The document type that this mapping applies to.
     */
    private String documentType;

    /**
     * The DocuSign template ID for this document type.
     */
    private String docusignTemplateId;

    /**
     * Optional description of this mapping.
     */
    private String description;

    /**
     * Whether this mapping is currently active.
     */
    private boolean isActive;

    /**
     * Timestamp when the mapping was created.
     */
    private LocalDateTime createdAt;

    /**
     * Timestamp when the mapping was last modified.
     */
    private LocalDateTime updatedAt;
}
