package com.nulogic.api.esignature.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request body for external (token-based) document decline.
 * signerEmail must be in the body — NOT a query parameter — to prevent PII leaking into
 * access logs, proxy logs, and browser history.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExternalDeclineRequest {

    @NotBlank(message = "Email is required for verification")
    @Email(message = "Invalid email format")
    private String signerEmail;

    @Size(max = 1000)
    private String reason;
}
