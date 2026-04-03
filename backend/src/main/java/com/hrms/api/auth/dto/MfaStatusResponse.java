package com.hrms.api.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Response indicating MFA status for a user.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MfaStatusResponse {

    /**
     * Whether MFA is enabled for the user.
     */
    private Boolean enabled;

    /**
     * Whether the TOTP code was successfully verified (set to true on verify endpoint).
     */
    private Boolean verified;

    /**
     * Timestamp when MFA was set up.
     */
    private LocalDateTime setupAt;
}
