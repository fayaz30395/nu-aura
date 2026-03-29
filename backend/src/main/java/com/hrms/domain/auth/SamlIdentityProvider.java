package com.hrms.domain.auth;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

/**
 * Entity representing a SAML 2.0 Identity Provider configuration per tenant.
 *
 * <p>Each tenant can have one active SAML IdP (Okta, Azure AD, OneLogin, etc.).
 * The certificate is stored encrypted at rest via {@link com.hrms.common.security.EncryptionService}.
 * Attribute mapping is stored as JSON to allow flexible IdP-specific SAML attribute names.</p>
 */
@Entity
@Table(name = "saml_identity_providers", indexes = {
    @Index(name = "idx_saml_idp_tenant", columnList = "tenantId"),
    @Index(name = "idx_saml_idp_entity_id", columnList = "entityId"),
    @Index(name = "idx_saml_idp_active", columnList = "tenantId,isActive")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class SamlIdentityProvider extends TenantAware {

    /** Human-readable name for this IdP (e.g., "Okta Production", "Azure AD") */
    @Column(nullable = false, length = 200)
    private String name;

    /** SAML Entity ID of the IdP (e.g., "http://www.okta.com/exk123abc") */
    @Column(nullable = false, length = 500)
    private String entityId;

    /** IdP Single Sign-On URL (HTTP-Redirect or HTTP-POST binding) */
    @Column(nullable = false, length = 1000)
    private String ssoUrl;

    /** IdP Single Logout URL (optional) */
    @Column(length = 1000)
    private String sloUrl;

    /**
     * IdP X.509 signing certificate (PEM-encoded, stored encrypted).
     * Used to verify SAML assertion signatures.
     */
    @Column(columnDefinition = "TEXT")
    private String certificate;

    /** URL to the IdP's SAML metadata XML (optional, for auto-configuration) */
    @Column(length = 1000)
    private String metadataUrl;

    /** Whether this SAML configuration is active for the tenant */
    @Builder.Default
    @Column(nullable = false)
    private Boolean isActive = false;

    /**
     * Whether to auto-provision new users on first SAML login.
     * If false, users must be pre-created in NU-AURA before SAML login works.
     */
    @Builder.Default
    @Column(nullable = false)
    private Boolean autoProvisionUsers = false;

    /** Default role ID assigned to auto-provisioned users */
    @Column
    private java.util.UUID defaultRoleId;

    /**
     * JSON mapping of SAML assertion attributes to user fields.
     * Example: {"email":"urn:oid:0.9.2342.19200300.100.1.3","firstName":"urn:oid:2.5.4.42",
     *           "lastName":"urn:oid:2.5.4.4","employeeId":"customAttr1","department":"customAttr2"}
     */
    @Column(columnDefinition = "TEXT")
    private String attributeMapping;

    /**
     * SP Entity ID override for this tenant. If null, defaults to
     * "{baseUrl}/saml2/service-provider-metadata/{registrationId}".
     */
    @Column(length = 500)
    private String spEntityId;
}
