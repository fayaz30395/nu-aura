package com.hrms.api.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Response containing MFA setup information including QR code and backup codes.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MfaSetupResponse {

    /**
     * QR code URL for scanning with authenticator apps.
     * Format: otpauth://totp/...
     */
    private String qrCodeUrl;

    /**
     * TOTP secret key (Base32 encoded).
     * Can be manually entered if QR code scanning fails.
     */
    private String secret;

    /**
     * List of backup codes for account recovery.
     * Each code can be used once to authenticate without the authenticator app.
     */
    private List<String> backupCodes;
}
