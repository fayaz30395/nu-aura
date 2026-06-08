package com.nulogic.common.security;

import com.nulogic.application.auth.service.SamlAuthenticationHandler;
import com.nulogic.application.auth.service.SamlAuthenticationHandler.SamlUserAttributes;
import com.nulogic.common.config.CookieConfig;
import com.nulogic.domain.auth.SamlIdentityProvider;
import com.nulogic.domain.user.User;
import com.nulogic.infrastructure.auth.repository.SamlIdentityProviderRepository;
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
import java.util.UUID;

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
    @Value("${app.frontend.url:http://localhost:3000}")
    private String frontendUrl;

    public SamlAuthenticationSuccessHandler(SamlAuthenticationHandler samlAuthHandler,
                                            SamlIdentityProviderRepository samlIdpRepository,
                                            JwtTokenProvider tokenProvider,
                                            CookieConfig cookieConfig) {
        this.samlAuthHandler = samlAuthHandler;
        this.samlIdpRepository = samlIdpRepository;
        this.tokenProvider = tokenProvider;
        this.cookieConfig = cookieConfig;
    }

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
            String refreshToken = tokenProvider.generateRefreshToken(user.getEmail(), tenantId, user.getId());

            // Set secure cookies
            setAuthCookies(response, accessToken, refreshToken);

            // SEC L-1: log stable user id, not email (PII), to keep aggregated logs PII-free.
            log.info("SAML authentication successful for user {} in tenant {}", user.getId(), tenantId);

            // Redirect to frontend dashboard
            response.sendRedirect(frontendUrl + "/dashboard?saml=success");

        } catch (Exception e) { // Intentional broad catch — security filter error boundary
            // Don't reflect raw exception text into the redirect URL (open-redirect/reflected-XSS
            // surface, leaks internal stack details to the user agent). Log server-side and emit
            // an opaque, allow-listed error code instead.
            log.warn("SAML authentication failed for registration {}", registrationId, e);
            response.sendRedirect(frontendUrl + "/auth/login?error=saml_auth_failed&code=" + classifyError(e));
        } finally {
            TenantContext.clear();
        }
    }

    /**
     * Maps a SAML processing exception to a stable, opaque error code that is safe to
     * surface in a redirect URL. The mapping is intentionally coarse: it lets the
     * frontend display a localised, generic message without leaking exception strings
     * back into the URL.
     */
    private String classifyError(Exception e) {
        if (e == null) {
            return "unknown";
        }
        // Most-specific causes first
        Throwable cause = e;
        for (int i = 0; i < 5 && cause != null; i++) {
            String className = cause.getClass().getName();
            if (className.contains("Saml2AuthenticationException")
                    || className.contains("Saml2Exception")) {
                return "invalid_token";
            }
            cause = cause.getCause();
        }
        if (e instanceof IllegalArgumentException) {
            // UUID.fromString(...) throws on a malformed registrationId.
            return "tenant_mismatch";
        }
        if (e instanceof IllegalStateException) {
            // Thrown when no active SAML config exists for the tenant.
            return "config_error";
        }
        return "unknown";
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

    /**
     * Plant the post-SAML auth cookies.
     *
     * <p>SEC (S11-I): Dual-emit pattern. Sends BOTH the active default-named
     * variant (legacy or hardened, controlled by {@code app.cookie.use-host-prefix})
     * and the explicitly hardened {@code __Host-} variant so that a production
     * flag-flip is non-breaking — every reader has been migrated to accept either
     * name. Delegates attribute construction to {@link CookieConfig} so the
     * SameSite / Secure / Path attributes cannot drift from the password-login
     * path served by {@link com.nulogic.api.auth.controller.AuthController}.</p>
     */
    private void setAuthCookies(HttpServletResponse response, String accessToken, String refreshToken) {
        // Default-named variant (legacy unless app.cookie.use-host-prefix=true).
        response.addHeader(HttpHeaders.SET_COOKIE, cookieConfig.createAccessTokenCookie(accessToken).toString());
        response.addHeader(HttpHeaders.SET_COOKIE, cookieConfig.createRefreshTokenCookie(refreshToken).toString());
        // Hardened __Host- variant — safe to emit unconditionally because all
        // readers accept either name after S10-J + S11-I.
        ResponseCookie hardenedAccess = cookieConfig.createHardenedAccessTokenCookie(accessToken);
        if (hardenedAccess != null) {
            response.addHeader(HttpHeaders.SET_COOKIE, hardenedAccess.toString());
        }
        ResponseCookie hardenedRefresh = cookieConfig.createHardenedRefreshTokenCookie(refreshToken);
        if (hardenedRefresh != null) {
            response.addHeader(HttpHeaders.SET_COOKIE, hardenedRefresh.toString());
        }
    }
}
