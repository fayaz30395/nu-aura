package com.hrms.api.esignature.dto;

import com.hrms.domain.esignature.SignatureApproval.ApprovalStatus;
import com.hrms.domain.esignature.SignatureRequest.DocumentType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Response DTO containing document information for external signers.
 * Returns only the necessary information for the signing portal.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExternalSignatureInfoResponse {

    private UUID approvalId;
    private String documentTitle;
    private String documentDescription;
    private DocumentType documentType;
    private String documentUrl;
    private String documentName;
    private ApprovalStatus status;
    private String signerEmail;
    private LocalDateTime tokenExpiresAt;
    private boolean tokenValid;
    private String errorMessage;

    // Additional context for offer letters
    private String candidateName;
    private String companyName;
}
