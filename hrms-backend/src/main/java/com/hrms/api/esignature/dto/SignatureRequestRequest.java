package com.hrms.api.esignature.dto;

import com.hrms.domain.esignature.SignatureRequest;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SignatureRequestRequest {
    private String title;
    private String description;
    private SignatureRequest.DocumentType documentType;
    private String documentUrl;
    private String documentName;
    private Long documentSize;
    private String mimeType;
    private Boolean signatureOrder; // Sequential vs parallel signing
    private LocalDateTime expiresAt;
    private Integer reminderFrequencyDays;
    private Boolean isTemplate;
    private String templateName;
    private String metadata;
    private List<SignatureApprovalRequest> signers;
}
