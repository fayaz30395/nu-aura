package com.nulogic.api.admin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * Request DTO for SuperAdmin updates to a tenant's IANA timezone.
 *
 * <p>The regex mirrors the V165 DB CHECK constraint
 * ({@code ^[A-Za-z_]+(/[A-Za-z_]+){0,2}$}) so a malformed string is rejected at the
 * controller boundary rather than at the database. Semantic validity (i.e. "is this a
 * known IANA zone-id?") is enforced downstream by the service via {@link java.time.ZoneId#of}.</p>
 */
@Data
public class UpdateTenantTimezoneRequest {

    /**
     * IANA timezone identifier (e.g. {@code Asia/Kolkata}, {@code UTC},
     * {@code America/Argentina/Buenos_Aires}).
     */
    @NotBlank(message = "Timezone is required")
    @Size(max = 40, message = "Timezone must be at most 40 characters")
    @Pattern(regexp = "^[A-Za-z_]+(/[A-Za-z_]+){0,2}$",
            message = "Timezone must be an IANA zone-id (e.g. Asia/Kolkata, UTC)")
    private String timezone;
}
