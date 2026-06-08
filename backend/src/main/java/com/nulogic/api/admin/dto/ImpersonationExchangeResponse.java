package com.nulogic.api.admin.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Phase-1 response for the two-phase impersonation flow.
 *
 * <p>Contains only an opaque short-lived exchange token — never the impersonation
 * JWT itself. The JWT is minted and placed in an httpOnly cookie only when the
 * frontend presents this exchange token to the {@code /impersonate/consume} endpoint.
 * This ensures the impersonation JWT is never exposed to JavaScript.</p>
 *
 * <p>The {@code exchangeToken} has a 60-second TTL and is single-use (atomic Redis
 * delete on consumption). It must not be persisted by the frontend.</p>
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ImpersonationExchangeResponse {

    /**
     * Short-lived (60s), single-use opaque exchange token.
     * Present this to {@code POST /api/v1/admin/system/impersonate/consume}.
     */
    private String exchangeToken;

    /** Human-readable target tenant name (for UI confirmation only). */
    private String tenantName;

    /** Target tenant ID (for UI confirmation only). */
    private String tenantId;

    /** TTL of the exchange token in seconds (60). */
    private long expiresInSeconds;
}
