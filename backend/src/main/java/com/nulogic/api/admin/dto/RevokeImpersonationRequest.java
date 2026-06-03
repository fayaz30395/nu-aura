package com.nulogic.api.admin.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * Request payload for SuperAdmin-initiated impersonation-session revocation (H-3).
 *
 * <p>Carries the previously-issued impersonation token whose dedicated
 * {@code impersonationJti} is blacklisted so the session is rejected immediately
 * rather than living out its natural 15-minute TTL.</p>
 */
@Data
public class RevokeImpersonationRequest {

    /**
     * The impersonation JWT to revoke.
     */
    @NotBlank
    private String token;
}
