package com.hrms.api.esignature.dto;

import com.hrms.domain.esignature.SignatureApproval;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SignDocumentRequest {
    @NotNull(message = "Signature method is required")
    private SignatureApproval.SignatureMethod signatureMethod;

    @NotNull(message = "Signature data is required")
    @Size(max = 500000, message = "Signature data must not exceed 500000 characters")
    private String signatureData; // Base64 encoded signature

    @Size(max = 45, message = "Signature IP must not exceed 45 characters")
    private String signatureIp;

    @Size(max = 500, message = "Signature device must not exceed 500 characters")
    private String signatureDevice;

    @Size(max = 2000, message = "Comments must not exceed 2000 characters")
    private String comments;
}
