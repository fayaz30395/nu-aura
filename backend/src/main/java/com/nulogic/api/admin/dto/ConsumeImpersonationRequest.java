package com.nulogic.api.admin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * Phase-2 request for the two-phase impersonation flow.
 *
 * <p>The frontend immediately POSTs the exchange token obtained from
 * {@code POST /tenants/{id}/impersonate} to {@code POST /impersonate/consume}.
 * The server atomically consumes the exchange token from Redis, mints the
 * impersonation JWT, and places it in an httpOnly cookie — the JWT is never
 * visible to JavaScript.</p>
 */
@Data
public class ConsumeImpersonationRequest {

    /**
     * Opaque exchange token returned by the generate endpoint.
     * Must be presented exactly once within its 60-second TTL.
     */
    @NotBlank(message = "exchangeToken is required")
    @Size(max = 128, message = "exchangeToken exceeds maximum length")
    private String exchangeToken;
}
