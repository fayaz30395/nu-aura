package com.hrms.api.esignature.dto;

import com.hrms.domain.esignature.SignatureApproval;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SignDocumentRequest {
    private SignatureApproval.SignatureMethod signatureMethod;
    private String signatureData; // Base64 encoded signature
    private String signatureIp;
    private String signatureDevice;
    private String comments;
}
