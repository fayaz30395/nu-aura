package com.hrms.common.security;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link JwtTokenProvider}.
 *
 * <p>Covers token generation, validation, and the CRIT-2 issuer/audience
 * enforcement introduced when the legacy "fallback" parser was removed.
 * All tests build tokens directly with the JJWT builder so they are
 * independent of higher-level service layers.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("JwtTokenProvider Tests")
class JwtTokenProviderTest {

    // 48-char secret → 48 bytes → well above the 32-byte HMAC-SHA256 minimum
    private static final String VALID_SECRET =
            "nu-aura-test-secret-key-minimum-48-bytes-xxxxxxxxxxx";
    private static final long EXPIRATION_MS = 3_600_000L; // 1 hour
    private static final long REFRESH_EXPIRATION_MS = 86_400_000L;
    private static final String ISSUER = "nu-aura";
    private static final String AUDIENCE = "nu-aura-api";

    @Mock
    private TokenBlacklistService tokenBlacklistService;

    private JwtTokenProvider tokenProvider;

    @BeforeEach
    void setUp() {
        tokenProvider = new JwtTokenProvider(tokenBlacklistService);
        ReflectionTestUtils.setField(tokenProvider, "jwtSecret", VALID_SECRET);
        ReflectionTestUtils.setField(tokenProvider, "jwtExpiration", EXPIRATION_MS);
        ReflectionTestUtils.setField(tokenProvider, "refreshTokenExpiration", REFRESH_EXPIRATION_MS);

        // Default: nothing blacklisted
        lenient().when(tokenBlacklistService.isBlacklisted(anyString())).thenReturn(false);
        lenient().when(tokenBlacklistService.isTokenRevokedByTimestamp(anyString(), any(Date.class)))
                .thenReturn(false);
    }

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    private SecretKey signingKey() {
        return Keys.hmacShaKeyFor(VALID_SECRET.getBytes(StandardCharsets.UTF_8));
    }

    /**
     * Build a minimal valid access token with correct issuer + audience.
     */
    private String buildValidToken(UUID userId, UUID tenantId) {
        Date now = new Date();
        return Jwts.builder()
                .id(UUID.randomUUID().toString())
                .issuer(ISSUER)
                .audience().add(AUDIENCE).and()
                .subject("user@example.com")
                .claim("userId", userId.toString())
                .claim("tenantId", tenantId.toString())
                .claim("roles", List.of("EMPLOYEE"))
                .claim("type", "access")
                .issuedAt(now)
                .expiration(new Date(now.getTime() + EXPIRATION_MS))
                .signWith(signingKey())
                .compact();
    }

    /**
     * Build a token without any issuer claim.
     */
    private String buildTokenWithoutIssuer(UUID userId, UUID tenantId) {
        Date now = new Date();
        return Jwts.builder()
                .id(UUID.randomUUID().toString())
                // ← no .issuer(...)
                .audience().add(AUDIENCE).and()
                .subject("user@example.com")
                .claim("userId", userId.toString())
                .claim("tenantId", tenantId.toString())
                .claim("type", "access")
                .issuedAt(now)
                .expiration(new Date(now.getTime() + EXPIRATION_MS))
                .signWith(signingKey())
                .compact();
    }

    /**
     * Build a token with a wrong issuer.
     */
    private String buildTokenWithWrongIssuer(UUID userId, UUID tenantId) {
        Date now = new Date();
        return Jwts.builder()
                .id(UUID.randomUUID().toString())
                .issuer("evil-issuer")
                .audience().add(AUDIENCE).and()
                .subject("user@example.com")
                .claim("userId", userId.toString())
                .claim("tenantId", tenantId.toString())
                .claim("type", "access")
                .issuedAt(now)
                .expiration(new Date(now.getTime() + EXPIRATION_MS))
                .signWith(signingKey())
                .compact();
    }

    /**
     * Build a token with the correct issuer but wrong audience.
     */
    private String buildTokenWithWrongAudience(UUID userId, UUID tenantId) {
        Date now = new Date();
        return Jwts.builder()
                .id(UUID.randomUUID().toString())
                .issuer(ISSUER)
                .audience().add("wrong-api").and()
                .subject("user@example.com")
                .claim("userId", userId.toString())
                .claim("tenantId", tenantId.toString())
                .claim("type", "access")
                .issuedAt(now)
                .expiration(new Date(now.getTime() + EXPIRATION_MS))
                .signWith(signingKey())
                .compact();
    }

    /**
     * Build an already-expired token.
     */
    private String buildExpiredToken(UUID userId, UUID tenantId) {
        Date past = new Date(System.currentTimeMillis() - 10_000);
        return Jwts.builder()
                .id(UUID.randomUUID().toString())
                .issuer(ISSUER)
                .audience().add(AUDIENCE).and()
                .subject("user@example.com")
                .claim("userId", userId.toString())
                .claim("tenantId", tenantId.toString())
                .claim("type", "access")
                .issuedAt(new Date(past.getTime() - EXPIRATION_MS))
                .expiration(past)
                .signWith(signingKey())
                .compact();
    }

    // -----------------------------------------------------------------------
    // Token validation tests
    // -----------------------------------------------------------------------

    @Nested
    @DisplayName("validateToken — issuer/audience enforcement (CRIT-2)")
    class IssuerAudienceTests {

        @Test
        @DisplayName("Token with correct issuer and audience is accepted")
        void tokenWithValidIssuerAndAudienceIsAccepted() {
            UUID userId = UUID.randomUUID();
            String token = buildValidToken(userId, UUID.randomUUID());

            assertThat(tokenProvider.validateToken(token)).isTrue();
        }

        @Test
        @DisplayName("Token with missing issuer is REJECTED — no legacy fallback (CRIT-2)")
        void tokenWithMissingIssuerIsRejected() {
            String token = buildTokenWithoutIssuer(UUID.randomUUID(), UUID.randomUUID());

            // CRIT-2: the fallback that previously accepted issuer-less tokens was removed.
            // validateToken must return false for any token without the expected issuer.
            assertThat(tokenProvider.validateToken(token)).isFalse();
        }

        @Test
        @DisplayName("Token with wrong issuer is rejected")
        void tokenWithWrongIssuerIsRejected() {
            String token = buildTokenWithWrongIssuer(UUID.randomUUID(), UUID.randomUUID());

            assertThat(tokenProvider.validateToken(token)).isFalse();
        }

        @Test
        @DisplayName("Token with wrong audience is rejected")
        void tokenWithWrongAudienceIsRejected() {
            String token = buildTokenWithWrongAudience(UUID.randomUUID(), UUID.randomUUID());

            assertThat(tokenProvider.validateToken(token)).isFalse();
        }

        @Test
        @DisplayName("Completely malformed token string is rejected")
        void malformedTokenIsRejected() {
            assertThat(tokenProvider.validateToken("not.a.token")).isFalse();
        }

        @Test
        @DisplayName("Empty token string is rejected")
        void emptyTokenIsRejected() {
            assertThat(tokenProvider.validateToken("")).isFalse();
        }
    }

    @Nested
    @DisplayName("validateToken — expiry checks")
    class ExpiryTests {

        @Test
        @DisplayName("Expired token is rejected")
        void expiredTokenIsRejected() {
            String token = buildExpiredToken(UUID.randomUUID(), UUID.randomUUID());

            assertThat(tokenProvider.validateToken(token)).isFalse();
        }

        @Test
        @DisplayName("Non-expired token with valid claims is accepted")
        void nonExpiredTokenIsAccepted() {
            String token = buildValidToken(UUID.randomUUID(), UUID.randomUUID());

            assertThat(tokenProvider.validateToken(token)).isTrue();
        }
    }

    @Nested
    @DisplayName("validateToken — refresh token type rejection (BUG-010)")
    class RefreshTokenRejectionTests {

        @Test
        @DisplayName("Refresh token submitted as access token is rejected")
        void refreshTokenUsedAsAccessTokenIsRejected() {
            Date now = new Date();
            String refreshToken = Jwts.builder()
                    .id(UUID.randomUUID().toString())
                    .issuer(ISSUER)
                    .audience().add(AUDIENCE).and()
                    .subject("user@example.com")
                    .claim("tenantId", UUID.randomUUID().toString())
                    .claim("type", "refresh")  // ← refresh token
                    .issuedAt(now)
                    .expiration(new Date(now.getTime() + REFRESH_EXPIRATION_MS))
                    .signWith(signingKey())
                    .compact();

            assertThat(tokenProvider.validateToken(refreshToken)).isFalse();
        }
    }

    @Nested
    @DisplayName("validateToken — blacklist integration")
    class BlacklistTests {

        @Test
        @DisplayName("Blacklisted JTI causes token rejection")
        void blacklistedTokenIsRejected() {
            String token = buildValidToken(UUID.randomUUID(), UUID.randomUUID());
            String jti = tokenProvider.getJtiFromToken(token);

            when(tokenBlacklistService.isBlacklisted(jti)).thenReturn(true);

            assertThat(tokenProvider.validateToken(token)).isFalse();
        }

        @Test
        @DisplayName("Token revoked by timestamp (user password change) is rejected")
        void timestampRevokedTokenIsRejected() {
            UUID userId = UUID.randomUUID();
            String token = buildValidToken(userId, UUID.randomUUID());

            when(tokenBlacklistService.isTokenRevokedByTimestamp(eq(userId.toString()), any(Date.class)))
                    .thenReturn(true);

            assertThat(tokenProvider.validateToken(token)).isFalse();
        }
    }

    // -----------------------------------------------------------------------
    // validateJwtSecret startup guard tests
    // -----------------------------------------------------------------------

    @Nested
    @DisplayName("validateJwtSecret — startup entropy guard (SEC-001)")
    class SecretValidationTests {

        @Test
        @DisplayName("Null secret throws IllegalStateException at startup")
        void nullSecretThrowsOnStartup() {
            JwtTokenProvider provider = new JwtTokenProvider(tokenBlacklistService);
            ReflectionTestUtils.setField(provider, "jwtSecret", null);

            assertThatThrownBy(provider::validateJwtSecret)
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("JWT_SECRET");
        }

        @Test
        @DisplayName("Blank secret throws IllegalStateException at startup")
        void blankSecretThrowsOnStartup() {
            JwtTokenProvider provider = new JwtTokenProvider(tokenBlacklistService);
            ReflectionTestUtils.setField(provider, "jwtSecret", "   ");

            assertThatThrownBy(provider::validateJwtSecret)
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("JWT_SECRET");
        }

        @Test
        @DisplayName("Secret shorter than 32 bytes throws IllegalStateException at startup")
        void shortSecretThrowsOnStartup() {
            JwtTokenProvider provider = new JwtTokenProvider(tokenBlacklistService);
            ReflectionTestUtils.setField(provider, "jwtSecret", "tooshort");

            assertThatThrownBy(provider::validateJwtSecret)
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("32 bytes");
        }

        @Test
        @DisplayName("Known weak/placeholder secret throws IllegalStateException at startup")
        void weakSecretThrowsOnStartup() {
            JwtTokenProvider provider = new JwtTokenProvider(tokenBlacklistService);
            // "your-secret-key" is in the known-weak list
            ReflectionTestUtils.setField(provider, "jwtSecret", "your-secret-key");

            assertThatThrownBy(provider::validateJwtSecret)
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("weak");
        }

        @Test
        @DisplayName("Strong secret passes startup validation without exception")
        void strongSecretPassesValidation() {
            JwtTokenProvider provider = new JwtTokenProvider(tokenBlacklistService);
            ReflectionTestUtils.setField(provider, "jwtSecret", VALID_SECRET);

            assertThatCode(provider::validateJwtSecret).doesNotThrowAnyException();
        }
    }

    // -----------------------------------------------------------------------
    // Token claims extraction
    // -----------------------------------------------------------------------

    @Nested
    @DisplayName("Claims extraction")
    class ClaimsExtractionTests {

        @Test
        @DisplayName("getUsernameFromToken returns subject")
        void getUsernameFromTokenReturnsSubject() {
            UUID userId = UUID.randomUUID();
            UUID tenantId = UUID.randomUUID();
            Date now = new Date();
            String token = Jwts.builder()
                    .id(UUID.randomUUID().toString())
                    .issuer(ISSUER)
                    .audience().add(AUDIENCE).and()
                    .subject("alice@example.com")
                    .claim("userId", userId.toString())
                    .claim("tenantId", tenantId.toString())
                    .claim("type", "access")
                    .issuedAt(now)
                    .expiration(new Date(now.getTime() + EXPIRATION_MS))
                    .signWith(signingKey())
                    .compact();

            assertThat(tokenProvider.getUsernameFromToken(token)).isEqualTo("alice@example.com");
        }

        @Test
        @DisplayName("getTenantIdFromToken returns the embedded tenant UUID")
        void getTenantIdFromTokenReturnsTenantId() {
            UUID tenantId = UUID.randomUUID();
            String token = buildValidToken(UUID.randomUUID(), tenantId);

            assertThat(tokenProvider.getTenantIdFromToken(token)).isEqualTo(tenantId);
        }

        @Test
        @DisplayName("getUserIdFromToken returns the embedded user UUID")
        void getUserIdFromTokenReturnsUserId() {
            UUID userId = UUID.randomUUID();
            String token = buildValidToken(userId, UUID.randomUUID());

            assertThat(tokenProvider.getUserIdFromToken(token)).isEqualTo(userId);
        }
    }

    // -----------------------------------------------------------------------
    // Impersonation token
    // -----------------------------------------------------------------------

    @Nested
    @DisplayName("Impersonation token (CRIT-005)")
    class ImpersonationTests {

        @Test
        @DisplayName("generateImpersonationToken produces a valid, accepted token")
        void impersonationTokenIsValid() {
            UUID adminId = UUID.randomUUID();
            UUID targetTenant = UUID.randomUUID();
            Set<String> roles = Set.of("SUPER_ADMIN");

            String token = tokenProvider.generateImpersonationToken(
                    adminId, "admin@example.com", targetTenant, roles);

            assertThat(tokenProvider.validateToken(token)).isTrue();
        }

        @Test
        @DisplayName("isImpersonationToken correctly identifies impersonation tokens")
        void isImpersonationTokenReturnsTrueForImpersonationTokens() {
            UUID adminId = UUID.randomUUID();
            UUID targetTenant = UUID.randomUUID();

            String token = tokenProvider.generateImpersonationToken(
                    adminId, "admin@example.com", targetTenant, Set.of("SUPER_ADMIN"));

            assertThat(tokenProvider.isImpersonationToken(token)).isTrue();
        }

        @Test
        @DisplayName("isImpersonationToken returns false for a regular access token")
        void isImpersonationTokenReturnsFalseForRegularToken() {
            String token = buildValidToken(UUID.randomUUID(), UUID.randomUUID());

            assertThat(tokenProvider.isImpersonationToken(token)).isFalse();
        }
    }
}
