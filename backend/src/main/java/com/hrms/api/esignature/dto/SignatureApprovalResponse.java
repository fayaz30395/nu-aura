package com.hrms.api.esignature.dto;

import com.hrms.domain.esignature.SignatureApproval;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SignatureApprovalResponse {
    private UUID id;
    private UUID tenantId;
    private UUID signatureRequestId;
    private UUID signerId;
    private String signerName;
    private String signerEmail;
    private SignatureApproval.SignerRole signerRole;
    private Integer signingOrder;
    private SignatureApproval.ApprovalStatus status;
    private Boolean isRequired;
    private LocalDateTime signedAt;
    private String signatureIp;
    private String signatureDevice;
    private SignatureApproval.SignatureMethod signatureMethod;
    private LocalDateTime declinedAt;
    private String declineReason;
    private LocalDateTime sentAt;
    private LocalDateTime viewedAt;
    private Integer reminderCount;
    private LocalDateTime lastRemindedAt;
    private String comments;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
