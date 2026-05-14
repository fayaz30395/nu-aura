package com.nulogic.api.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {
    private String accessToken;
    private String refreshToken;
    @Builder.Default
    private String tokenType = "Bearer";
    private Long expiresIn;
    private UUID userId;
    private UUID employeeId;
    private UUID tenantId;
    private String email;
    private String fullName;
    private String profilePictureUrl;

    // Tenant IANA timezone identifier (e.g. "Asia/Kolkata"). Resolved server-side from
    // Tenant.timezone via TenantTimeService so the frontend can hydrate a single source of
    // truth for tenant-local time formatting without a separate fetch. Part of the
    // frontend tenant-zone propagation design (docs/architecture/frontend-tenant-zone-propagation-design.md).
    private String tenantTimezone;

    // CRIT-001: Permissions moved from JWT to response body to keep cookie under 4KB.
    // Frontend reads these from the response instead of decoding the JWT.
    private List<String> roles;
    private List<String> permissions;
}
