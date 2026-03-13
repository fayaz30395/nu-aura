package com.hrms.api.contract.dto;

import com.hrms.domain.contract.SignatureStatus;
import com.hrms.domain.contract.SignerRole;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DTO for contract signature
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ContractSignatureDto {

    private UUID id;
    private UUID contractId;
    private UUID signerId;
    private String signerName;
    private String signerEmail;
    private SignerRole signerRole;
    private SignatureStatus status;
    private LocalDateTime signedAt;
    private String signatureImageUrl;
    private LocalDateTime createdAt;
}
