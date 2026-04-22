package com.hrms.common.security;

import com.hrms.domain.auth.SamlIdentityProvider;
import com.hrms.infrastructure.auth.repository.SamlIdentityProviderRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.saml2.core.Saml2X509Credential;
import org.springframework.security.saml2.provider.service.registration.InMemoryRelyingPartyRegistrationRepository;
import org.springframework.security.saml2.provider.service.registration.RelyingPartyRegistration;
import org.springframework.security.saml2.provider.service.registration.RelyingPartyRegistrationRepository;
import org.springframework.security.saml2.provider.service.registration.RelyingPartyRegistrations;
import org.springframework.security.saml2.provider.service.registration.Saml2MessageBinding;

import java.io.ByteArrayInputStream;
import java.security.cert.CertificateFactory;
import java.security.cert.X509Certificate;
import java.util.Base64;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Dynamic SAML 2.0 RelyingPartyRegistration repository that loads IdP configurations
 * from the database per tenant.
 *
 * <p>Each tenant's SAML config is registered as a separate relying party with
 * registrationId = tenantId. Registrations are cached and refreshed when configs change.</p>
 *
 * <p>This replaces the static application.yml-based SAML config to support
 * multi-tenant dynamic SAML SSO.</p>
 */
@Slf4j
public class DynamicSamlRelyingPartyRegistrationRepository implements RelyingPartyRegistrationRepository {

    private final SamlIdentityProviderRepository samlIdpRepository;
    private final EncryptionService encryptionService;
    private final String appBaseUrl;

    /**
     * Cache of registrations by registrationId (tenantId)
     */
    private final ConcurrentHashMap<String, RelyingPartyRegistration> registrationCache = new ConcurrentHashMap<>();

    public DynamicSamlRelyingPartyRegistrationRepository(
            SamlIdentityProviderRepository samlIdpRepository,
            EncryptionService encryptionService,
            String appBaseUrl) {
        this.samlIdpRepository = samlIdpRepository;
        this.encryptionService = encryptionService;
        this.appBaseUrl = appBaseUrl;
    }

    @Override
    public RelyingPartyRegistration findByRegistrationId(String registrationId) {
        // Try cache first
        RelyingPartyRegistration cached = registrationCache.get(registrationId);
        if (cached != null) {
            return cached;
        }

        // Load from database
        try {
            UUID tenantId = UUID.fromString(registrationId);
            Optional<SamlIdentityProvider> idpOpt = samlIdpRepository.findActiveByTenantId(tenantId);

            if (idpOpt.isEmpty()) {
                log.debug("No active SAML config found for registrationId/tenantId: {}", registrationId);
                return null;
            }

            SamlIdentityProvider idp = idpOpt.get();
            RelyingPartyRegistration registration = buildRegistration(registrationId, idp);
            registrationCache.put(registrationId, registration);
            return registration;

        } catch (IllegalArgumentException e) {
            log.debug("Invalid registrationId (not a UUID): {}", registrationId);
            return null;
        } catch (Exception e) { // Intentional broad catch — security filter error boundary
            log.error("Failed to build SAML registration for {}: {}", registrationId, e.getMessage(), e);
            return null;
        }
    }

    /**
     * Refresh the registration cache for a specific tenant.
     * Called after SAML config create/update/delete operations.
     */
    public void refreshRegistration(String tenantId) {
        registrationCache.remove(tenantId);
        log.info("SAML registration cache cleared for tenant {}", tenantId);
    }

    /**
     * Clear the entire registration cache.
     */
    public void clearCache() {
        registrationCache.clear();
        log.info("SAML registration cache cleared entirely");
    }

    private RelyingPartyRegistration buildRegistration(String registrationId, SamlIdentityProvider idp) {
        // If metadata URL is available, try to build from metadata first
        if (idp.getMetadataUrl() != null && !idp.getMetadataUrl().isBlank()) {
            try {
                return RelyingPartyRegistrations
                        .fromMetadataLocation(idp.getMetadataUrl())
                        .registrationId(registrationId)
                        .entityId(buildSpEntityId(registrationId, idp))
                        .assertionConsumerServiceLocation(appBaseUrl + "/login/saml2/sso/" + registrationId)
                        .build();
            } catch (Exception e) { // Intentional broad catch — security filter error boundary
                log.warn("Failed to build from metadata URL {}, falling back to manual config: {}",
                        idp.getMetadataUrl(), e.getMessage());
            }
        }

        // Manual configuration
        RelyingPartyRegistration.Builder builder = RelyingPartyRegistration.withRegistrationId(registrationId)
                .entityId(buildSpEntityId(registrationId, idp))
                .assertionConsumerServiceLocation(appBaseUrl + "/login/saml2/sso/" + registrationId)
                .assertionConsumerServiceBinding(Saml2MessageBinding.POST)
                .assertingPartyMetadata(party -> {
                    party.entityId(idp.getEntityId());
                    party.singleSignOnServiceLocation(idp.getSsoUrl());
                    party.singleSignOnServiceBinding(Saml2MessageBinding.REDIRECT);
                    party.wantAuthnRequestsSigned(false);

                    // Add IdP signing certificate
                    if (idp.getCertificate() != null && !idp.getCertificate().isBlank()) {
                        try {
                            String decryptedCert = encryptionService.decrypt(idp.getCertificate());
                            X509Certificate x509 = parseCertificate(decryptedCert);
                            party.verificationX509Credentials(c ->
                                    c.add(Saml2X509Credential.verification(x509)));
                        } catch (Exception e) { // Intentional broad catch — security filter error boundary
                            log.error("Failed to parse IdP certificate for tenant {}: {}",
                                    registrationId, e.getMessage());
                            throw new RuntimeException("Invalid IdP certificate", e);
                        }
                    }

                    // Single Logout
                    if (idp.getSloUrl() != null && !idp.getSloUrl().isBlank()) {
                        party.singleLogoutServiceLocation(idp.getSloUrl());
                        party.singleLogoutServiceBinding(Saml2MessageBinding.POST);
                    }
                });

        return builder.build();
    }

    private String buildSpEntityId(String registrationId, SamlIdentityProvider idp) {
        if (idp.getSpEntityId() != null && !idp.getSpEntityId().isBlank()) {
            return idp.getSpEntityId();
        }
        return appBaseUrl + "/saml2/service-provider-metadata/" + registrationId;
    }

    private X509Certificate parseCertificate(String pemCertificate) throws Exception {
        String cleaned = pemCertificate
                .replace("-----BEGIN CERTIFICATE-----", "")
                .replace("-----END CERTIFICATE-----", "")
                .replaceAll("\\s+", "");

        byte[] decoded = Base64.getDecoder().decode(cleaned);
        CertificateFactory cf = CertificateFactory.getInstance("X.509");
        return (X509Certificate) cf.generateCertificate(new ByteArrayInputStream(decoded));
    }
}
