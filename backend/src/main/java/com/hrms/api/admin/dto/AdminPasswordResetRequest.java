package com.hrms.api.admin.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.UUID;

/**
 * Request payload for SuperAdmin-initiated user password reset.
 *
 * <p>Flagged by wave-3 multi-tenant audit ("no admin password reset path"). All three
 * fields are required: the target {@link #userId}, an audit-trail {@link #reason},
 * and explicit {@link #confirmReset} acknowledgement to guard against accidental
 * resets via API client misuse.</p>
 */
@Data
public class AdminPasswordResetRequest {

    /**
     * Target user whose password will be rotated.
     */
    @NotNull
    private UUID userId;

    /**
     * Human-readable justification recorded in the audit log (5–200 chars).
     */
    @NotBlank
    @Size(min = 5, max = 200)
    private String reason;

    /**
     * Explicit confirmation; must be {@code true} for the request to validate.
     */
    @AssertTrue(message = "must confirm")
    private Boolean confirmReset;
}
