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
public class SignatureRequestResponse {
    private UUID id;
    private UUID tenantId;
    private String title;
    private String description;
    private SignatureRequest.DocumentType documentType;
    private String documentUrl;
    private String documentName;
    private Long documentSize;
    private String mimeType;
    private UUID createdBy;
    private String createdByName;
    private SignatureRequest.SignatureStatus status;
    private Integer requiredSignatures;
    private Integer receivedSignatures;
    private Boolean signatureOrder;
    private LocalDateTime expiresAt;
    private LocalDateTime completedAt;
    private LocalDateTime cancelledAt;
    private UUID cancelledBy;
    private String cancelledByName;
    private String cancellationReason;
    private Integer reminderFrequencyDays;
    private LocalDateTime lastReminderSentAt;
    private Boolean isTemplate;
    private String templateName;
    private String metadata;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<SignatureApprovalResponse> approvals;
}
