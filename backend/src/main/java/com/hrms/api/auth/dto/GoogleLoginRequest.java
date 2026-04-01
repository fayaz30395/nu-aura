package com.hrms.api.auth.dto;

import com.hrms.common.validation.SkipSanitization;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.UUID;

@Data
public class GoogleLoginRequest {
    @NotBlank(message = "Google credential is required")
    @SkipSanitization
    private String credential;

    private UUID tenantId;

    /**
     * If true, the credential is a Google OAuth access token (from implicit flow).
     * If false (default), the credential is a Google ID token (from sign-in button).
     */
    private boolean isAccessToken = false;
}
