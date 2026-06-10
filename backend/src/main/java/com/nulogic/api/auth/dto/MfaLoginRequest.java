package com.nulogic.api.auth.dto;

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
     * Opaque pre-auth token issued by {@code /login} when MFA is required (M-2).
     * REQUIRED: it resolves server-side to the user that completed first-factor,
     * so the second factor cannot be submitted for an arbitrary caller-supplied user.
     * Requests without it are rejected with 401 (SEC 3c — the legacy userId-only
     * flow allowed minting tokens without password verification).
     */
    private String mfaToken;

    /**
     * User ID from the initial login response.
     *
     * @deprecated SEC (3c): ignored by the server. The userId is always derived from
     * {@link #mfaToken}. Field retained only so legacy clients' request payloads still
     * deserialize (they receive 401 instead of 400).
     */
    @Deprecated
    private UUID userId;

    /**
     * TOTP code (6 digits) or backup code from authenticator app.
     */
    @NotBlank(message = "MFA code is required")
    private String code;
}
