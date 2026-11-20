package com.nulogic.integration.isolation;

import com.nulogic.config.AbstractTenantIsolationIntegrationTest;
import com.nulogic.integration.isolation.TwoTenantFixture.Actor;
import com.nulogic.integration.isolation.TwoTenantFixture.Tenant;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.test.web.servlet.MvcResult;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static com.nulogic.integration.isolation.TwoTenantFixture.DEPARTMENT;
import static com.nulogic.integration.isolation.TwoTenantFixture.EMPLOYEE;
import static com.nulogic.integration.isolation.TwoTenantFixture.USER;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

/**
 * Tenant resolution at the edge: the signed JWT is the only source of tenant identity for
 * authenticated calls. Forged headers, tampered/foreign/expired/revoked tokens and missing
 * credentials must never yield another tenant's data.
 */
@DisplayName("Tenant isolation: tenant resolution, forged headers and token tampering")
class TenantIsolationAuthTokenTest extends AbstractTenantIsolationIntegrationTest {

    private static final String DEPARTMENTS = "/api/v1/departments";
    private static final List<String> PROBES = List.of(DEPARTMENTS, "/api/v1/employees",
            "/api/v1/departments/" + Tenant.B.id(DEPARTMENT), "/api/v1/employees/" + Tenant.B.id(EMPLOYEE, 2));

    @Value("${app.jwt.secret}")
    private String jwtSecret;

    @Test
    @DisplayName("forged X-Tenant-ID: B with tenant-A's JWT -> JWT wins, only A data")
    void forgedTenantHeaderIsIgnoredForAuthenticatedRequests() throws Exception {
        MvcResult list = perform(as(Actor.admin(Tenant.A), get(DEPARTMENTS)).header("X-Tenant-ID", Tenant.B.id().toString()));
        assertThat(status(list)).isEqualTo(200);
        assertThat(body(list)).contains(Tenant.A.id(DEPARTMENT).toString()).doesNotContain(Tenant.B.marker());

        MvcResult byId = perform(as(Actor.admin(Tenant.A), get("/api/v1/departments/" + Tenant.B.id(DEPARTMENT)))
                .header("X-Tenant-ID", Tenant.B.id().toString()));
        assertThat(status(byId)).isIn(400, 403, 404);
        assertThat(body(byId)).doesNotContain(Tenant.B.marker());
    }

    @Test
    @DisplayName("X-Tenant-ID without a token -> 401 on every tenant-scoped endpoint, nothing leaked")
    void headerAloneDoesNotAuthenticate() throws Exception {
        for (String path : PROBES) {
            MvcResult res = perform(get(path).header("X-Tenant-ID", Tenant.B.id().toString()));
            assertUnauthenticated(res, path + " header-only");
            assertUnauthenticated(perform(get(path)), path + " no credentials");
        }
    }

    @Test
    @DisplayName("tenantId claim edited without re-signing -> rejected")
    void tamperedTenantClaimIsRejected() throws Exception {
        String[] parts = token(Actor.admin(Tenant.A)).split("\\.");
        String payload = new String(Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8)
                .replace(Tenant.A.id().toString(), Tenant.B.id().toString());
        String forged = parts[0] + "." + Base64.getUrlEncoder().withoutPadding()
                .encodeToString(payload.getBytes(StandardCharsets.UTF_8)) + "." + parts[2];
        for (String path : PROBES) {
            assertUnauthenticated(perform(withToken(forged, get(path))), path + " tampered claim");
        }
    }

    @Test
    @DisplayName("token for tenant B signed with a different key -> rejected")
    void wrongSigningKeyIsRejected() throws Exception {
        String forged = signed(Map.of("tenantId", Tenant.B.id().toString(), "userId", Tenant.B.id(USER, 1).toString(),
                "roles", List.of("SUPER_ADMIN"), "type", "access"), "tenant-b-admin@iso.test",
                "an-entirely-different-32-byte-signing-key!!", 600_000);
        for (String path : PROBES) {
            assertUnauthenticated(perform(withToken(forged, get(path))), path + " wrong key");
        }
    }

    @Test
    @DisplayName("expired token (valid signature) -> rejected")
    void expiredTokenIsRejected() throws Exception {
        String expired = signed(Map.of("tenantId", Tenant.A.id().toString(), "userId", Tenant.A.id(USER, 1).toString(),
                "roles", List.of("TENANT_ADMIN"), "type", "access"), "tenant-a-admin@iso.test", jwtSecret, -120_000);
        assertUnauthenticated(perform(withToken(expired, get(DEPARTMENTS))), "expired");
    }

    @Test
    @DisplayName("revoked token -> rejected; a fresh token for the same user still works")
    void revokedTokenIsRejected() throws Exception {
        String jwt = token(Actor.admin(Tenant.A));
        assertThat(status(perform(withToken(jwt, get(DEPARTMENTS))))).isEqualTo(200);
        tokenProvider.revokeToken(jwt);
        assertUnauthenticated(perform(withToken(jwt, get(DEPARTMENTS))), "revoked");
        assertThat(status(perform(as(Actor.admin(Tenant.A), get(DEPARTMENTS))))).isEqualTo(200);
    }

    @Test
    @DisplayName("refresh token presented as access token -> rejected")
    void refreshTokenIsNotAnAccessToken() throws Exception {
        String refresh = tokenProvider.generateRefreshToken("tenant-a-admin@iso.test", Tenant.A.id(), Tenant.A.id(USER, 1));
        assertUnauthenticated(perform(withToken(refresh, get(DEPARTMENTS))), "refresh as access");
    }

    @Test
    @DisplayName("validly signed token pairing tenant B with a tenant-A user -> rejected (principal not in tenant)")
    void crossTenantPrincipalConfusionIsRejected() throws Exception {
        String confused = signed(Map.of("tenantId", Tenant.B.id().toString(), "userId", Tenant.A.id(USER, 1).toString(),
                        "roles", List.of("TENANT_ADMIN", "HR_ADMIN"), "type", "access", "employeeId", Tenant.A.id(EMPLOYEE, 1).toString()),
                "tenant-a-admin@iso.test", jwtSecret, 600_000);
        for (String path : PROBES) {
            MvcResult res = perform(withToken(confused, get(path)));
            assertUnauthenticated(res, path + " B-tenant claim with A user");
        }
    }

    @Test
    @DisplayName("validly signed token without a tenantId claim -> refused, nothing leaked")
    void tokenWithoutTenantIsRefused() throws Exception {
        String noTenant = signed(Map.of("userId", Tenant.A.id(USER, 1).toString(), "roles", List.of("SUPER_ADMIN"),
                "type", "access"), "tenant-a-super@iso.test", jwtSecret, 600_000);
        for (String path : PROBES) {
            MvcResult res = perform(withToken(noTenant, get(path)));
            assertThat(status(res)).as("%s no-tenant token -> %s", path, body(res)).isIn(401, 403);
            assertThat(body(res)).doesNotContain(Tenant.A.marker()).doesNotContain(Tenant.B.marker());
        }
    }

    @Test
    @DisplayName("token for a SUSPENDED tenant -> 403, no data")
    void suspendedTenantIsRefused() throws Exception {
        UUID suspended = UUID.fromString("cccccccc-0000-4000-8000-000000000000");
        superuserJdbc().update("INSERT INTO tenants (id, code, name, status) VALUES (?, 'iso-c', 'ISO-C Suspended', 'SUSPENDED') "
                + "ON CONFLICT (id) DO NOTHING", suspended);
        String jwt = signed(Map.of("tenantId", suspended.toString(), "userId", UUID.randomUUID().toString(),
                "roles", List.of("SUPER_ADMIN"), "type", "access"), "c@iso.test", jwtSecret, 600_000);
        MvcResult res = perform(withToken(jwt, get(DEPARTMENTS)));
        assertThat(status(res)).isEqualTo(403);
        assertThat(body(res)).doesNotContain("ISO-");
    }

    private static void assertUnauthenticated(MvcResult res, String what) throws Exception {
        assertThat(status(res)).as("%s -> %s", what, body(res)).isEqualTo(401);
        assertThat(body(res)).as(what).doesNotContain(Tenant.A.marker()).doesNotContain(Tenant.B.marker());
    }

    private static String signed(Map<String, Object> claims, String subject, String secret, long ttlMillis) {
        Date now = new Date();
        return Jwts.builder()
                .id(UUID.randomUUID().toString())
                .issuer("nu-aura")
                .audience().add("nu-aura-api").and()
                .subject(subject)
                .claims(claims)
                .issuedAt(new Date(now.getTime() - 300_000))
                .expiration(new Date(now.getTime() + ttlMillis))
                .signWith(Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8)))
                .compact();
    }
}
