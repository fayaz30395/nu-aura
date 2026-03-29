package com.hrms.common.config;

import com.hrms.common.security.DynamicSamlRelyingPartyRegistrationRepository;
import com.hrms.common.security.EncryptionService;
import com.hrms.infrastructure.auth.repository.SamlIdentityProviderRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.saml2.provider.service.registration.RelyingPartyRegistrationRepository;

/**
 * Configuration for SAML 2.0 SSO support.
 *
 * <p>Provides the dynamic {@link RelyingPartyRegistrationRepository} bean that
 * loads per-tenant SAML IdP configurations from the database at runtime.</p>
 *
 * <p>This configuration works alongside the existing JWT-based auth in
 * {@link SecurityConfig}. The SAML login flow is additive — it does NOT
 * replace password or Google OAuth login.</p>
 */
@Configuration
public class SamlSecurityConfig {

    @Value("${app.base-url:http://localhost:8080}")
    private String appBaseUrl;

    @Bean
    public RelyingPartyRegistrationRepository relyingPartyRegistrationRepository(
            SamlIdentityProviderRepository samlIdpRepository,
            EncryptionService encryptionService) {
        return new DynamicSamlRelyingPartyRegistrationRepository(
                samlIdpRepository, encryptionService, appBaseUrl);
    }
}
