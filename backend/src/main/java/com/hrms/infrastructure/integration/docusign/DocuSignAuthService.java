package com.hrms.infrastructure.integration.docusign;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.domain.integration.ConnectorConfig;
import io.jsonwebtoken.Jwts;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.time.Duration;
import java.util.Base64;
import java.util.Date;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Service for generating and caching OAuth 2.0 JWT Grant tokens for DocuSign
 * API access.
 *
 * <p>
 * <strong>Architecture:</strong>
 * DocuSign uses a server-to-server OAuth flow with RSA-signed JWT assertions:
 * <ol>
 * <li>Generate a JWT assertion signed with the private key</li>
 * <li>POST the JWT to the token endpoint with
 * grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer</li>
 * <li>Receive an access_token valid for 1 hour</li>
 * <li>Cache the token and reuse it until 5 minutes before expiry</li>
 * </ol>
 *
 * <p>
 * <strong>Thread Safety:</strong> Uses ConcurrentHashMap to cache tokens per
 * tenant.
 * All public methods are thread-safe.
 * </p>
 *
 * <p>
 * <strong>Token Lifecycle:</strong>
 * Tokens are cached with a calculated expiry time. When
 * {@link #getAccessToken(ConnectorConfig)}
 * is called, it checks if the cached token is still valid (5 minutes buffer).
 * If expired or
 * missing, it generates a new token.
 * </p>
 */
@Service
@Slf4j
public class DocuSignAuthService {

    // 5-minute buffer before expiry to refresh proactively
    private static final long REFRESH_BUFFER_MS = 5 * 60 * 1000;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    // Cache: tenantId -> {accessToken, expiresAt}
    private final ConcurrentHashMap<UUID, TokenCache> tokenCache = new ConcurrentHashMap<>();

    public DocuSignAuthService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    /**
     * Extract a string value from the connector config settings.
     *
     * @param config the connector configuration
     * @param key    the settings key
     * @return the string value
     * @throws IllegalArgumentException if the key is missing or not a string
     */
    private static String getString(ConnectorConfig config, String key) {
        Object value = config.settings().get(key);
        if (value == null) {
            throw new IllegalArgumentException("Missing required config: " + key);
        }
        return value.toString();
    }

    /**
     * Get a valid access token for DocuSign API access, using the cache when
     * possible.
     *
     * <p>
     * If a cached token exists and is still valid (with 5-minute buffer), it is
     * returned.
     * Otherwise, a new token is generated via OAuth 2.0 JWT Grant flow.
     * </p>
     *
     * @param config the connector configuration containing OAuth credentials
     * @return a valid DocuSign access token
     * @throws RuntimeException if token generation fails
     */
    public String getAccessToken(ConnectorConfig config) {
        UUID tenantId = config.tenantId();

        // Check cache first
        TokenCache cached = tokenCache.get(tenantId);
        if (cached != null && cached.isValid()) {
            log.debug("Using cached DocuSign access token for tenant: {}", tenantId);
            return cached.accessToken;
        }

        // Generate new token
        log.debug("Generating new DocuSign access token for tenant: {}", tenantId);
        String newToken = generateNewAccessToken(config);

        // Cache with 1-hour expiry (DocuSign tokens expire after 1 hour)
        long expiresAtMs = System.currentTimeMillis() + (60 * 60 * 1000);
        tokenCache.put(tenantId, new TokenCache(newToken, expiresAtMs));

        return newToken;
    }

    /**
     * Generate a new access token by performing the OAuth 2.0 JWT Grant flow.
     *
     * <p>
     * Steps:
     * <ol>
     * <li>Create a JWT assertion signed with the RSA private key</li>
     * <li>POST to DocuSign's token endpoint with the assertion</li>
     * <li>Extract access_token from response</li>
     * </ol>
     *
     * @param config the connector configuration
     * @return the access token from DocuSign
     * @throws RuntimeException if any step fails
     */
    private String generateNewAccessToken(ConnectorConfig config) {
        try {
            // Extract configuration values
            String integrationKey = getString(config, "integrationKey");
            String userId = getString(config, "userId");
            String rsaPrivateKeyPem = getString(config, "rsaPrivateKey");
            String baseUrl = getString(config, "baseUrl");

            // Generate JWT assertion
            String jwtAssertion = createJwtAssertion(integrationKey, userId, rsaPrivateKeyPem, baseUrl);

            // Exchange JWT for access token
            return exchangeJwtForToken(jwtAssertion, baseUrl);
        } catch (Exception e) { // Intentional broad catch — DocuSign API integration
            log.error("Failed to generate DocuSign access token", e);
            throw new RuntimeException("Failed to generate DocuSign access token: " + e.getMessage(), e);
        }
    }

    /**
     * Create a JWT assertion signed with the DocuSign RSA private key.
     *
     * <p>
     * The assertion includes:
     * <ul>
     * <li>iss (issuer): integrationKey</li>
     * <li>sub (subject): userId</li>
     * <li>aud (audience): {baseUrl}/oauth/token</li>
     * <li>iat (issued at): current time</li>
     * <li>exp (expiration): iat + 10 minutes</li>
     * <li>scope: "signature impersonation"</li>
     * </ul>
     *
     * @param integrationKey   the OAuth integration key
     * @param userId           the DocuSign user ID
     * @param rsaPrivateKeyPem the RSA private key in PEM format
     * @param baseUrl          the DocuSign base URL
     * @return the signed JWT assertion
     */
    private String createJwtAssertion(String integrationKey, String userId, String rsaPrivateKeyPem, String baseUrl) {
        try {
            PrivateKey privateKey = parsePrivateKey(rsaPrivateKeyPem);

            Date now = new Date();
            Date expiration = new Date(now.getTime() + (10 * 60 * 1000)); // 10 minutes

            String tokenEndpoint = baseUrl.replaceAll("/+$", "") + "/oauth/token";

            return Jwts.builder()
                    .issuer(integrationKey)
                    .subject(userId)
                    .audience().add(tokenEndpoint).and()
                    .issuedAt(now)
                    .expiration(expiration)
                    .claim("scope", "signature impersonation")
                    .signWith(privateKey, Jwts.SIG.RS256)
                    .compact();
        } catch (Exception e) { // Intentional broad catch — DocuSign API integration
            log.error("Failed to create JWT assertion", e);
            throw new RuntimeException("Failed to create JWT assertion: " + e.getMessage(), e);
        }
    }

    /**
     * Parse an RSA private key from PEM format.
     *
     * <p>
     * Handles both PKCS#8 format with and without the PEM header/footer:
     *
     * <pre>
     * -----BEGIN PRIVATE KEY-----
     * base64-encoded-key
     * -----END PRIVATE KEY-----
     * </pre>
     *
     * @param pemKey the private key in PEM format
     * @return a PrivateKey object
     */
    private PrivateKey parsePrivateKey(String pemKey) throws Exception {
        // Remove PEM headers and newlines
        String cleanKey = pemKey
                .replaceAll("-----BEGIN.*?-----", "")
                .replaceAll("-----END.*?-----", "")
                .replaceAll("\\s+", "");

        // Decode base64
        byte[] decodedKey = Base64.getDecoder().decode(cleanKey);

        // Parse PKCS#8 format
        PKCS8EncodedKeySpec spec = new PKCS8EncodedKeySpec(decodedKey);
        KeyFactory factory = KeyFactory.getInstance("RSA");
        return factory.generatePrivate(spec);
    }

    /**
     * Exchange a JWT assertion for an access token via DocuSign OAuth endpoint.
     *
     * <p>
     * POSTs to {baseUrl}/oauth/token with
     * grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer
     * and assertion={jwt}.
     * </p>
     *
     * @param jwtAssertion the signed JWT assertion
     * @param baseUrl      the DocuSign base URL
     * @return the access token
     * @throws RuntimeException if the HTTP request fails or response is invalid
     */
    private String exchangeJwtForToken(String jwtAssertion, String baseUrl) {
        try {
            String tokenEndpoint = baseUrl.replaceAll("/+$", "") + "/oauth/token";
            String requestBody = String.format(
                    "grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=%s",
                    jwtAssertion);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(tokenEndpoint))
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                log.error("DocuSign token endpoint returned status {}: {}", response.statusCode(), response.body());
                throw new RuntimeException("DocuSign token endpoint returned " + response.statusCode());
            }

            // Parse response to extract access_token
            JsonNode responseJson = objectMapper.readTree(response.body());
            String accessToken = responseJson.path("access_token").asText();
            if (accessToken.isBlank()) {
                throw new RuntimeException("DocuSign token endpoint response missing access_token");
            }

            log.debug("Successfully obtained DocuSign access token");
            return accessToken;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("Interrupted while exchanging JWT for access token", e);
            throw new RuntimeException("Interrupted while exchanging JWT for access token", e);
        } catch (IOException e) {
            log.error("Failed to exchange JWT for access token", e);
            throw new RuntimeException("Failed to exchange JWT for access token: " + e.getMessage(), e);
        }
    }

    /**
     * Clear the cached token for a specific tenant, forcing a refresh on next
     * request.
     *
     * @param tenantId the tenant ID
     */
    public void clearTokenCache(UUID tenantId) {
        tokenCache.remove(tenantId);
        log.debug("Cleared cached DocuSign token for tenant: {}", tenantId);
    }

    /**
     * Clear all cached tokens across all tenants.
     */
    public void clearAllTokenCache() {
        tokenCache.clear();
        log.debug("Cleared all cached DocuSign tokens");
    }

    /**
     * Token cache entry containing the access token and its expiry timestamp.
     */
    private static class TokenCache {
        final String accessToken;
        final long expiresAtMs;

        TokenCache(String accessToken, long expiresAtMs) {
            this.accessToken = accessToken;
            this.expiresAtMs = expiresAtMs;
        }

        /**
         * Check if this cached token is still valid (not expired, with buffer).
         */
        boolean isValid() {
            long now = System.currentTimeMillis();
            return now < (expiresAtMs - REFRESH_BUFFER_MS);
        }
    }
}
