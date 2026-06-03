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
     * Preferred binding: it resolves server-side to the user that completed first-factor,
     * so the second factor cannot be submitted for an arbitrary caller-supplied user.
     * Optional only for backward compatibility with clients still sending {@link #userId}.
     */
    private String mfaToken;

    /**
     * User ID from the initial login response.
     *
     * <p>M-2: now optional. When {@link #mfaToken} is supplied it takes precedence and this
     * field is ignored. Retained for backward compatibility with older clients.</p>
     */
    private UUID userId;

    /**
     * TOTP code (6 digits) or backup code from authenticator app.
     */
    @NotBlank(message = "MFA code is required")
    private String code;
}
