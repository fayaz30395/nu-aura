package com.nulogic.api.contract.dto;

import com.nulogic.domain.contract.SignerRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * DTO for sending contract for signature
 */
@Data
public class SendForSigningRequest {

    @NotBlank(message = "Signer name is required")
    private String signerName;

    @NotBlank(message = "Signer email is required")
    @Email(message = "Invalid email format")
    private String signerEmail;

    private SignerRole signerRole;
}
