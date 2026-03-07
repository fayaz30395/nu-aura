package com.hrms.api.auth.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * Request to complete MFA second-factor authentication during login.
 * Used after initial password authentication returns a pre-auth token.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MfaLoginRequest {

    /**
     * User ID from the initial login response.
     */
    @NotBlank(message = "User ID is required")
    private UUID userId;

    /**
     * TOTP code (6 digits) or backup code from authenticator app.
     */
    @NotBlank(message = "MFA code is required")
    private String code;
}
