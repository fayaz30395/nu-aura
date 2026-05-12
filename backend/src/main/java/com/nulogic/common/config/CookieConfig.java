package com.nulogic.common.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.ResponseCookie;

/**
 * Configuration for secure cookie handling using {@link ResponseCookie}
 * (supports {@code SameSite} natively).
 *
 * <h3>Security properties</h3>
 * <ul>
 *   <li><b>HttpOnly</b>: Prevents JavaScript access (XSS protection).</li>
 *   <li><b>Secure</b>: Only transmitted over HTTPS. Required for the
 *       {@code __Host-} cookie name prefix.</li>
 *   <li><b>SameSite=Lax</b> on auth tokens: blocks cross-site sub-request
 *       inclusion while still allowing top-level cross-site redirects — needed
 *       by SSO redirect flows (SAML / Google). The CSRF double-submit filter
 *       remains the second defence on state-changing requests, and its cookie
 *       stays at {@code SameSite=Strict}.</li>
 *   <li><b>Path=/</b>: Required by the {@code __Host-} prefix.</li>
 * </ul>
 *
 * <h3>{@code __Host-} cookie name prefix (S10-J)</h3>
 * Per
 * <a href="https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-cookie-prefixes-00">
 * draft-ietf-httpbis-cookie-prefixes</a> a cookie whose name starts with
 * {@code __Host-} is rejected by the browser unless:
 * <ol>
 *   <li>The {@code Secure} attribute is set,</li>
 *   <li>The {@code Path} attribute is exactly {@code /},</li>
 *   <li>No {@code Domain} attribute is sent (so the cookie is host-locked
 *       to the exact origin that set it; no subdomain leakage).</li>
 * </ol>
 * This makes cookie-fixation and subdomain-takeover attacks materially harder.
 *
 * <h3>Rollover strategy</h3>
 * <p>The default-returned cookie from {@link #createAccessTokenCookie(String)}
 * keeps the legacy {@code access_token} name so all existing callers
 * (AuthController, SamlAuthenticationSuccessHandler, etc.) continue to work
 * without modification. New / migrated callers should additionally emit the
 * hardened {@code __Host-} cookie via
 * {@link #createHardenedAccessTokenCookie(String)} /
 * {@link #createHardenedRefreshTokenCookie(String)}. The
 * {@link com.nulogic.common.security.JwtAuthenticationFilter} already accepts
 * either cookie name as input, so dual-emission is safe.</p>
 *
 * <p>Switch the default to the hardened cookie globally by setting
 * {@code app.cookie.use-host-prefix=true}; in that mode
 * {@link #createAccessTokenCookie(String)} returns the {@code __Host-} variant
 * and existing callers must be audited to also emit the legacy cookie via
 * {@link #createLegacyAccessTokenCookie(String)} during the rollover window.</p>
 */
@Configuration
public class CookieConfig {

    // ---------------------------------------------------------------------
    // Legacy cookie names (kept for backward compatibility during rollover).
    // AuthControllerSecurityTest pins these to exact string values so they
    // must remain unchanged.
    // ---------------------------------------------------------------------

    /**
     * Legacy access-token cookie name. Kept for one-deploy backward compat.
     */
    public static final String ACCESS_TOKEN_COOKIE = "access_token";

    /**
     * Legacy refresh-token cookie name. Kept for one-deploy backward compat.
     */
    public static final String REFRESH_TOKEN_COOKIE = "refresh_token";

    /**
     * CSRF double-submit cookie name. Frontend reads this by name.
     */
    public static final String CSRF_TOKEN_COOKIE = "XSRF-TOKEN";

    // ---------------------------------------------------------------------
    // Hardened cookie names with __Host- prefix (S10-J).
    // ---------------------------------------------------------------------

    /**
     * Hardened access-token cookie name. Browser enforces Path=/, Secure, no Domain.
     */
    public static final String ACCESS_TOKEN_COOKIE_HOST = "__Host-hrms-access";

    /**
     * Hardened refresh-token cookie name. Browser enforces Path=/, Secure, no Domain.
     */
    public static final String REFRESH_TOKEN_COOKIE_HOST = "__Host-hrms-refresh";

    @Value("${app.cookie.secure:true}")
    private boolean secureCookie;

    /**
     * Optional legacy {@code Domain} attribute. A {@code Domain} attribute is
     * incompatible with the {@code __Host-} prefix and is only honoured for
     * the legacy cookie names.
     */
    @Value("${app.cookie.domain:}")
    private String cookieDomain;

    /**
     * When {@code true} (default {@code false} during rollover), the default
     * cookie returned by {@link #createAccessTokenCookie(String)} switches to
     * the hardened {@code __Host-hrms-access} name. Operators flip this in a
     * follow-up deploy once all call sites have been audited.
     */
    @Value("${app.cookie.use-host-prefix:false}")
    private boolean useHostPrefix;

    @Value("${app.jwt.expiration:3600000}")
    private long accessTokenExpiration;

    @Value("${app.jwt.refresh-expiration:86400000}")
    private long refreshTokenExpiration;

    /**
     * Resolve the active access-token cookie name. {@code __Host-} prefix is only
     * usable when {@code Secure} is enabled — browsers silently drop a
     * {@code __Host-} cookie without it.
     */
    public String getAccessTokenCookieName() {
        return (useHostPrefix && secureCookie) ? ACCESS_TOKEN_COOKIE_HOST : ACCESS_TOKEN_COOKIE;
    }

    /**
     * Resolve the active refresh-token cookie name. See {@link #getAccessTokenCookieName()}.
     */
    public String getRefreshTokenCookieName() {
        return (useHostPrefix && secureCookie) ? REFRESH_TOKEN_COOKIE_HOST : REFRESH_TOKEN_COOKIE;
    }

    /**
     * Create the access-token cookie under the currently configured active name.
     * <p>Default (during rollover) is the legacy {@code access_token} name so
     * untouched cookie readers keep working. Flip
     * {@code app.cookie.use-host-prefix=true} to return the hardened variant.</p>
     */
    public ResponseCookie createAccessTokenCookie(String token) {
        return buildAccessTokenCookie(token, getAccessTokenCookieName(), accessTokenExpiration / 1000);
    }

    /**
     * Create the refresh-token cookie under the currently configured active name.
     * <p>Default (during rollover) is the legacy {@code refresh_token} with its
     * narrower {@code /api/v1/auth} path. The hardened variant uses {@code Path=/}
     * (mandated by {@code __Host-}) but stays HttpOnly + rotated-on-use, so the
     * wider path does not increase blast radius.</p>
     */
    public ResponseCookie createRefreshTokenCookie(String token) {
        if (useHostPrefix && secureCookie) {
            return buildHostRefreshTokenCookie(token, refreshTokenExpiration / 1000);
        }
        return buildLegacyRefreshTokenCookie(token, refreshTokenExpiration / 1000);
    }

    /**
     * Cookie to clear the active access-token cookie (logout).
     */
    public ResponseCookie createClearAccessTokenCookie() {
        return buildAccessTokenCookie("", getAccessTokenCookieName(), 0);
    }

    /**
     * Cookie to clear the active refresh-token cookie (logout).
     */
    public ResponseCookie createClearRefreshTokenCookie() {
        if (useHostPrefix && secureCookie) {
            return buildHostRefreshTokenCookie("", 0);
        }
        return buildLegacyRefreshTokenCookie("", 0);
    }

    // ---------------------------------------------------------------------
    // Hardened variants (S10-J). Exposed for new / migrated call sites.
    // Existing call sites continue to use createAccessTokenCookie / createRefreshTokenCookie.
    // ---------------------------------------------------------------------

    /**
     * Hardened {@code __Host-hrms-access} cookie. {@code Secure} is forced on.
     */
    public ResponseCookie createHardenedAccessTokenCookie(String token) {
        return buildAccessTokenCookie(token, ACCESS_TOKEN_COOKIE_HOST, accessTokenExpiration / 1000);
    }

    /**
     * Hardened {@code __Host-hrms-refresh} cookie at {@code Path=/}.
     */
    public ResponseCookie createHardenedRefreshTokenCookie(String token) {
        return buildHostRefreshTokenCookie(token, refreshTokenExpiration / 1000);
    }

    /**
     * Clear cookie for the hardened {@code __Host-hrms-access} name.
     */
    public ResponseCookie createClearHardenedAccessTokenCookie() {
        return buildAccessTokenCookie("", ACCESS_TOKEN_COOKIE_HOST, 0);
    }

    /**
     * Clear cookie for the hardened {@code __Host-hrms-refresh} name.
     */
    public ResponseCookie createClearHardenedRefreshTokenCookie() {
        return buildHostRefreshTokenCookie("", 0);
    }

    // ---------------------------------------------------------------------
    // Legacy variants. Exposed for the rollover dual-write window when the
    // host-prefix mode is enabled but legacy clients still need the old cookie.
    // ---------------------------------------------------------------------

    /**
     * Legacy unprefixed access-token cookie.
     */
    public ResponseCookie createLegacyAccessTokenCookie(String token) {
        return buildAccessTokenCookie(token, ACCESS_TOKEN_COOKIE, accessTokenExpiration / 1000);
    }

    /**
     * Legacy unprefixed refresh-token cookie at {@code /api/v1/auth}.
     */
    public ResponseCookie createLegacyRefreshTokenCookie(String token) {
        return buildLegacyRefreshTokenCookie(token, refreshTokenExpiration / 1000);
    }

    /**
     * Clear cookie for the legacy access-token name.
     */
    public ResponseCookie createClearLegacyAccessTokenCookie() {
        return buildAccessTokenCookie("", ACCESS_TOKEN_COOKIE, 0);
    }

    /**
     * Clear cookie for the legacy refresh-token name.
     */
    public ResponseCookie createClearLegacyRefreshTokenCookie() {
        return buildLegacyRefreshTokenCookie("", 0);
    }

    /**
     * Create the CSRF double-submit cookie. NOT {@code HttpOnly} (frontend must
     * read it to echo into the {@code X-XSRF-TOKEN} header), but {@code Secure}
     * and {@code SameSite=Strict} — Strict blocks cross-site read of the cookie
     * value on top-level navigations from third-party origins, which keeps the
     * CSRF token from being learned by an attacker-controlled landing page.
     *
     * <p>Not exposed under a {@code __Host-} prefix because the frontend reads
     * the cookie by its conventional {@code XSRF-TOKEN} name (Angular / axios
     * default); renaming would break every API client. Path=/, Secure, no
     * Domain replicates {@code __Host-} hardening minus the prefix.</p>
     */
    public ResponseCookie createCsrfCookie(String token) {
        return ResponseCookie.from(CSRF_TOKEN_COOKIE, token)
                .httpOnly(false)
                .secure(true)
                .sameSite("Strict")
                .path("/")
                .build();
    }

    // ---------------------------------------------------------------------
    // Builders. Centralised so attribute drift across the codebase is impossible.
    // ---------------------------------------------------------------------

    private ResponseCookie buildAccessTokenCookie(String token, String name, long maxAgeSeconds) {
        boolean hostPrefixed = name.startsWith("__Host-");
        ResponseCookie.ResponseCookieBuilder b = ResponseCookie.from(name, token)
                .httpOnly(true)
                // __Host- cookies require Secure even in non-HTTPS dev, otherwise
                // the browser silently drops the Set-Cookie. Force Secure on the
                // prefixed variant; respect the configured flag for the legacy one.
                .secure(hostPrefixed || secureCookie)
                .path("/")
                .maxAge(maxAgeSeconds)
                // SameSite=Lax is the minimum required for SSO redirect flows
                // (Google / SAML) to retain the cookie on the top-level POST
                // back from the IdP. Strict would drop the cookie on that
                // redirect and log the user out at the end of the SSO dance.
                // CSRF defence-in-depth lives in the double-submit filter,
                // which already requires an X-XSRF-TOKEN header matching a
                // SameSite=Strict CSRF cookie on every state-changing request.
                .sameSite("Lax");
        // Domain must NOT be set on a __Host- cookie (browser rejects it).
        if (!hostPrefixed && cookieDomain != null && !cookieDomain.isBlank()) {
            b.domain(cookieDomain);
        }
        return b.build();
    }

    private ResponseCookie buildHostRefreshTokenCookie(String token, long maxAgeSeconds) {
        // __Host- mandates Path=/. We deliberately widen the refresh-token path
        // from the legacy /api/v1/auth to / so the prefix can apply. The cookie
        // remains HttpOnly, and refresh tokens rotate on every use (see
        // AuthController.refresh + tokenProvider.revokeToken), so a wider path
        // does not increase the blast radius of a token leak.
        return ResponseCookie.from(REFRESH_TOKEN_COOKIE_HOST, token)
                .httpOnly(true)
                .secure(true)
                .path("/")
                .maxAge(maxAgeSeconds)
                .sameSite("Lax")
                .build();
    }

    private ResponseCookie buildLegacyRefreshTokenCookie(String token, long maxAgeSeconds) {
        // Legacy cookie kept its narrower /api/v1/auth path. We mirror that
        // here so the rollover dual-write / clear targets the *exact* cookie an
        // older deploy planted.
        ResponseCookie.ResponseCookieBuilder b = ResponseCookie.from(REFRESH_TOKEN_COOKIE, token)
                .httpOnly(true)
                .secure(secureCookie)
                .path("/api/v1/auth")
                .maxAge(maxAgeSeconds)
                // Was Strict in the prior implementation. Relaxed to Lax for
                // parity with the access-token cookie so the SSO redirect-back
                // path can carry the refresh cookie too.
                .sameSite("Lax");
        if (cookieDomain != null && !cookieDomain.isBlank()) {
            b.domain(cookieDomain);
        }
        return b.build();
    }

    public boolean isSecureCookie() {
        return secureCookie;
    }
}
