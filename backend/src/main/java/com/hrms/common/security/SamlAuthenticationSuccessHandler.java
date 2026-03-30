package com.hrms.common.security;

import com.hrms.application.auth.service.SamlAuthenticationHandler;
import com.hrms.application.auth.service.SamlAuthenticationHandler.SamlUserAttributes;
import com.hrms.common.config.CookieConfig;
import com.hrms.domain.auth.SamlIdentityProvider;
import com.hrms.domain.user.User;
import com.hrms.infrastructure.auth.repository.SamlIdentityProviderRepository;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.security.core.Authentication;
import org.springframework.security.saml2.provider.service.authentication.Saml2AuthenticatedPrincipal;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Handles successful SAML 2.0 authentication.
 *
 * <p>After Spring Security validates the SAML assertion and creates an
 * {@link Authentication} with a {@link Saml2AuthenticatedPrincipal}, this handler:
 * <ol>
 *   <li>Extracts SAML attributes from the principal</li>
 *   <li>Maps them to NU-AURA user fields via the tenant's attribute mapping</li>
 *   <li>Provisions or links the user</li>
 *   <li>Issues a JWT and sets it in httpOnly cookies</li>
 *   <li>Redirects to the frontend dashboard</li>
 * </ol></p>
 */
@Component
@Slf4j
public class SamlAuthenticationSuccessHandler implements AuthenticationSuccessHandler {

    private final SamlAuthenticationHandler samlAuthHandler;
    private final SamlIdentityProviderRepository samlIdpRepository;
    private final JwtTokenProvider tokenProvider;
    private final CookieConfig cookieConfig;

    public SamlAuthenticationSuccessHandler(SamlAuthenticationHandler samlAuthHandler,
                                            SamlIdentityProviderRepository samlIdpRepository,
                                            JwtTokenProvider tokenProvider,
                                            CookieConfig cookieConfig) {
        this.samlAuthHandler = samlAuthHandler;
        this.samlIdpRepository = samlIdpRepository;
        this.tokenProvider = tokenProvider;
        this.cookieConfig = cookieConfig;
    }

    @Value("${app.frontend.url:http://localhost:3000}")
    private String frontendUrl;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                       Authentication authentication) throws IOException, ServletException {

        if (!(authentication.getPrincipal() instanceof Saml2AuthenticatedPrincipal)) {
            log.error("SAML authentication principal is not Saml2AuthenticatedPrincipal: {}",
                    authentication.getPrincipal().getClass());
            response.sendRedirect(frontendUrl + "/auth/login?error=saml_invalid_principal");
            return;
        }

        Saml2AuthenticatedPrincipal principal = (Saml2AuthenticatedPrincipal) authentication.getPrincipal();
        String registrationId = extractRegistrationId(request);

        try {
            // Determine tenant from registrationId (registrationId == tenantId)
            UUID tenantId = UUID.fromString(registrationId);

            // Load the tenant's SAML config for attribute mapping
            SamlIdentityProvider idp = samlIdpRepository.findActiveByTenantId(tenantId)
                    .orElseThrow(() -> new IllegalStateException("No active SAML config for tenant " + tenantId));

            // Extract SAML attributes
            Map<String, String> attributes = extractAttributes(principal);
            log.debug("SAML attributes for tenant {}: {}", tenantId, attributes.keySet());

            // Map attributes using tenant's configured mapping
            SamlUserAttributes userAttributes = samlAuthHandler.mapSamlAttributesToUser(
                    attributes, idp.getAttributeMapping());

            // Provision or link user
            TenantContext.setCurrentTenant(tenantId);
            User user = samlAuthHandler.provisionOrLinkUser(tenantId, userAttributes);

            // Generate JWT
            String accessToken = samlAuthHandler.generateJwtFromSamlAuth(user);
            String refreshToken = tokenProvider.generateRefreshToken(user.getEmail(), tenantId);

            // Set secure cookies
            setAuthCookies(response, accessToken, refreshToken);

            log.info("SAML authentication successful for user {} in tenant {}", user.getEmail(), tenantId);

            // Redirect to frontend dashboard
            response.sendRedirect(frontendUrl + "/dashboard?saml=success");

        } catch (Exception e) { // Intentional broad catch — security filter error boundary
            log.error("SAML authentication processing failed for registration {}: {}",
                    registrationId, e.getMessage(), e);
            response.sendRedirect(frontendUrl + "/auth/login?error=saml_auth_failed&message=" +
                    java.net.URLEncoder.encode(e.getMessage(), "UTF-8"));
        } finally {
            TenantContext.clear();
        }
    }

    /**
     * Extract flat attribute map from the SAML principal.
     * Takes the first value for multi-valued attributes.
     */
    private Map<String, String> extractAttributes(Saml2AuthenticatedPrincipal principal) {
        Map<String, String> result = new HashMap<>();

        // Add the NameID as email fallback
        if (principal.getName() != null) {
            result.put("nameId", principal.getName());
            // If the NameID looks like an email, also set it as the email attribute
            if (principal.getName().contains("@")) {
                result.put("email", principal.getName());
            }
        }

        // Extract all SAML attributes
        Map<String, List<Object>> allAttributes = principal.getAttributes();
        for (Map.Entry<String, List<Object>> entry : allAttributes.entrySet()) {
            List<Object> values = entry.getValue();
            if (values != null && !values.isEmpty()) {
                result.put(entry.getKey(), values.get(0).toString());
            }
        }

        return result;
    }

    /**
     * Extract the registration ID from the request URI.
     * Expected URI pattern: /login/saml2/sso/{registrationId}
     */
    private String extractRegistrationId(HttpServletRequest request) {
        String uri = request.getRequestURI();
        String[] parts = uri.split("/");
        // Last segment is the registrationId
        return parts[parts.length - 1];
    }

    private void setAuthCookies(HttpServletResponse response, String accessToken, String refreshToken) {
        ResponseCookie accessCookie = ResponseCookie.from(CookieConfig.ACCESS_TOKEN_COOKIE, accessToken)
                .httpOnly(true)
                .secure(cookieConfig.isSecureCookie())
                .path("/")
                .maxAge(3600)
                .sameSite("Lax") // Lax required for SAML redirect flow (cross-origin POST)
                .build();

        ResponseCookie refreshCookie = ResponseCookie.from(CookieConfig.REFRESH_TOKEN_COOKIE, refreshToken)
                .httpOnly(true)
                .secure(cookieConfig.isSecureCookie())
                .path("/api/v1/auth")
                .maxAge(86400)
                .sameSite("Lax")
                .build();

        response.addHeader(HttpHeaders.SET_COOKIE, accessCookie.toString());
        response.addHeader(HttpHeaders.SET_COOKIE, refreshCookie.toString());
    }
}
