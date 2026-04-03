package com.hrms.api.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * Request DTO for creating or updating a SAML Identity Provider configuration.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SamlConfigRequest {

    @NotBlank(message = "IdP name is required")
    @Size(max = 200, message = "IdP name must be at most 200 characters")
    private String name;

    @NotBlank(message = "Entity ID is required")
    @Size(max = 500, message = "Entity ID must be at most 500 characters")
    private String entityId;

    @NotBlank(message = "SSO URL is required")
    @Size(max = 1000, message = "SSO URL must be at most 1000 characters")
    private String ssoUrl;

    @Size(max = 1000, message = "SLO URL must be at most 1000 characters")
    private String sloUrl;

    /**
     * PEM-encoded X.509 certificate for verifying SAML assertion signatures
     */
    private String certificate;

    /**
     * IdP metadata URL for auto-configuration (alternative to manual config)
     */
    @Size(max = 1000, message = "Metadata URL must be at most 1000 characters")
    private String metadataUrl;

    /**
     * Whether this SAML config is active
     */
    @Builder.Default
    private Boolean isActive = false;

    /**
     * Whether to auto-create users on first SAML login
     */
    @Builder.Default
    private Boolean autoProvisionUsers = false;

    /**
     * Default role assigned to auto-provisioned users
     */
    private UUID defaultRoleId;

    /**
     * JSON string mapping SAML attributes to user fields.
     * Keys: email, firstName, lastName, employeeId, department
     * Values: SAML attribute names from the IdP
     */
    private String attributeMapping;

    /**
     * SP Entity ID override for this tenant
     */
    @Size(max = 500, message = "SP Entity ID must be at most 500 characters")
    private String spEntityId;
}
