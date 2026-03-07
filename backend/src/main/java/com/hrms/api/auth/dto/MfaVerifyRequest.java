package com.hrms.api.auth.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request to verify MFA code during login or for MFA operations.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MfaVerifyRequest {
    
    /**
     * TOTP code (6 digits) or backup code from the authenticator app.
     * Should not be blank.
     */
    @NotBlank(message = "Code is required")
    private String code;
}
