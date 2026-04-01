package com.hrms.api.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Response DTO for SAML Identity Provider configuration.
 * Certificate is NOT included in responses for security — only a fingerprint.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SamlConfigResponse {

    private UUID id;
    private UUID tenantId;
    private String name;
    private String entityId;
    private String ssoUrl;
    private String sloUrl;
    private boolean hasCertificate;
    private String certificateFingerprint;
    private String metadataUrl;
    private Boolean isActive;
    private Boolean autoProvisionUsers;
    private UUID defaultRoleId;
    private String defaultRoleName;
    private String attributeMapping;
    private String spEntityId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
