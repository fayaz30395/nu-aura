package com.hrms.api.integration.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for creating or updating a DocuSign template mapping.
 *
 * <p>Used by administrators to configure which DocuSign template should
 * be used for specific document types.</p>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocuSignTemplateMappingRequest {

    /**
     * The document type to map (e.g., "OfferLetter", "LeaveRequest", "TerminationLetter").
     */
    private String documentType;

    /**
     * The DocuSign template ID to use for this document type.
     * Obtained from the DocuSign admin console.
     */
    private String docusignTemplateId;

    /**
     * Optional description of this mapping.
     */
    private String description;
}
