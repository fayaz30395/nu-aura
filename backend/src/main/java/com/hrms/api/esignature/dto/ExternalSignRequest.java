package com.hrms.api.esignature.dto;

import com.hrms.domain.esignature.SignatureApproval.SignatureMethod;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO for external (token-based) document signing.
 * Used by candidates and external parties to sign documents via email link.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExternalSignRequest {

    @NotBlank(message = "Email is required for verification")
    @Email(message = "Invalid email format")
    private String signerEmail;

    private SignatureMethod signatureMethod;

    private String signatureData; // Base64 encoded signature image or typed name

    private String comments;
}
