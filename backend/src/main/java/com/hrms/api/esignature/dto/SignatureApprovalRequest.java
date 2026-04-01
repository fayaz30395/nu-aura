package com.hrms.api.esignature.dto;

import com.hrms.domain.esignature.SignatureApproval;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SignatureApprovalRequest {
    private UUID signerId;
    private String signerEmail;
    private SignatureApproval.SignerRole signerRole;
    private Integer signingOrder;
    private Boolean isRequired;
    private String comments;
}
