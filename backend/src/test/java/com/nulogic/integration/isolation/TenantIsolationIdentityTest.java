package com.nulogic.integration.isolation;

import com.nulogic.common.config.CookieConfig;
import com.nulogic.config.AbstractTenantIsolationIntegrationTest;
import com.nulogic.integration.isolation.TwoTenantFixture.Actor;
import com.nulogic.integration.isolation.TwoTenantFixture.Tenant;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import java.util.Set;
import java.util.UUID;

import static com.nulogic.integration.isolation.TwoTenantFixture.JOB_OPENING;
import static com.nulogic.integration.isolation.TwoTenantFixture.USER;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/**
 * Phase 3 #3: identity-to-tenant binding. The JWT tenant claim must keep matching the principal's
 * real tenant in the database (user moved, refresh token for another tenant), impersonation is
 * platform-only, public endpoints honour X-Tenant-ID only when unauthenticated, and opaque
 * client ids cannot reference another tenant's data.
 */
@DisplayName("Tenant isolation: identity binding, refresh, impersonation, public header, client ids (Phase 3 #3)")
class TenantIsolationIdentityTest extends AbstractTenantIsolationIntegrationTest {

    @Test
    @DisplayName("PROOF: a token issued while the user was in tenant A stops working once the user belongs to tenant B")
    void tokenOfMovedUserIsRejected() throws Exception {
        UUID userId = UUID.randomUUID();
        superuserJdbc().update("INSERT INTO users (id, tenant_id, email, first_name, password_hash, status) "
                + "VALUES (?, ?, ?, 'ISO-A', 'x', 'ACTIVE')", userId, Tenant.A.id(), "mover-" + userId + "@iso.test");
        Actor mover = new Actor(Tenant.A, userId, null, "mover-" + userId + "@iso.test", Set.of("TENANT_ADMIN"));
        String jwt = token(mover);
        assertThat(status(perform(withToken(jwt, get("/api/v1/departments"))))).as("positive control").isEqualTo(200);

        superuserJdbc().update("UPDATE users SET tenant_id = ? WHERE id = ?", Tenant.B.id(), userId);
        MvcResult res = perform(withToken(jwt, get("/api/v1/departments")));
        assertThat(status(res)).as("stale tenant claim -> %s", body(res)).isEqualTo(401);
        assertThat(body(res)).doesNotContain("ISO-");
    }

    @Test
    @DisplayName("PROOF: a refresh token whose tenant claim is not the user's tenant mints nothing")
    void refreshTokenForForeignTenantIsRejected() throws Exception {
        String email = "tenant-a-admin@iso.test";
        String genuine = tokenProvider.generateRefreshToken(email, Tenant.A.id(), Tenant.A.id(USER, 1));
        MvcResult ok = perform(refresh(genuine));
        assertThat(status(ok)).as("positive control: genuine refresh -> %s", body(ok)).isEqualTo(200);

        String foreign = tokenProvider.generateRefreshToken(email, Tenant.B.id(), Tenant.A.id(USER, 1));
        MvcResult res = perform(refresh(foreign));
        assertThat(status(res)).as("refresh with tenant B claim for a tenant-A user -> %s", body(res)).isBetween(400, 499);
        assertThat(res.getResponse().getCookie(CookieConfig.ACCESS_TOKEN_COOKIE)).as("access cookie issued").isNull();
        assertThat(body(res)).doesNotContain("accessToken").doesNotContain("ISO-B");
    }

    private static org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder refresh(String token) {
        return post("/api/v1/auth/refresh").cookie(new Cookie(CookieConfig.REFRESH_TOKEN_COOKIE, token),
                        new Cookie(CookieConfig.CSRF_TOKEN_COOKIE, CSRF_VALUE))
                .header("X-XSRF-TOKEN", CSRF_VALUE);
    }

    @Test
    @DisplayName("PROOF: impersonation of tenant B is refused for tenant-level roles; forged exchange tokens are refused")
    void impersonationIsPlatformOnly() throws Exception {
        for (Actor actor : new Actor[]{Actor.admin(Tenant.A), Actor.employee(Tenant.A)}) {
            MvcResult res = perform(as(actor, post("/api/v1/admin/system/tenants/" + Tenant.B.id() + "/impersonate")));
            assertThat(status(res)).as("%s -> %s", actor.email(), body(res)).isEqualTo(403);
            assertThat(body(res)).doesNotContain("exchangeToken");
        }
        MvcResult forged = perform(as(Actor.admin(Tenant.A), post("/api/v1/admin/system/impersonate/consume")
                .contentType(MediaType.APPLICATION_JSON).content("{\"exchangeToken\":\"" + UUID.randomUUID() + "\"}")));
        assertThat(status(forged)).as(body(forged)).isBetween(400, 499);
        assertThat(forged.getResponse().getCookie(CookieConfig.ACCESS_TOKEN_COOKIE)).isNull();
    }

    @Test
    @DisplayName("PROOF: public careers honour X-Tenant-ID only for anonymous callers; JWT wins otherwise")
    void publicEndpointTenantResolution() throws Exception {
        MvcResult asB = perform(get("/api/v1/public/careers/jobs").header("X-Tenant-ID", Tenant.B.id().toString()));
        assertThat(status(asB)).as(body(asB)).isEqualTo(200);
        assertThat(body(asB)).contains(Tenant.B.id(JOB_OPENING).toString()).doesNotContain(Tenant.A.marker());

        MvcResult crossDetail = perform(get("/api/v1/public/careers/jobs/" + Tenant.B.id(JOB_OPENING))
                .header("X-Tenant-ID", Tenant.A.id().toString()));
        assertThat(status(crossDetail)).as(body(crossDetail)).isBetween(400, 499);
        assertThat(body(crossDetail)).doesNotContain(Tenant.B.marker());

        MvcResult unknown = perform(get("/api/v1/public/careers/jobs").header("X-Tenant-ID", UUID.randomUUID().toString()));
        assertThat(status(unknown)).isEqualTo(403);

        // Authenticated as A while claiming B in the header: the JWT tenant is used, not the header.
        MvcResult mixed = perform(as(Actor.admin(Tenant.A), get("/api/v1/public/careers/jobs"))
                .header("X-Tenant-ID", Tenant.B.id().toString()));
        assertThat(body(mixed)).doesNotContain(Tenant.B.marker());
    }

    @Test
    @DisplayName("NOT EXPLOITABLE: project/time-entry clientId is an opaque id with no table or FK behind it")
    void clientIdReferencesNothing() {
        Long fk = superuserJdbc().queryForObject("""
                SELECT count(*) FROM information_schema.key_column_usage k
                JOIN information_schema.table_constraints t ON t.constraint_name = k.constraint_name
                WHERE t.constraint_type = 'FOREIGN KEY' AND k.column_name = 'client_id'""", Long.class);
        Long clientTables = superuserJdbc().queryForObject("""
                SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'
                AND table_name IN ('clients', 'psa_clients', 'project_clients', 'customers')""", Long.class);
        assertThat(fk).as("a client_id FK would turn clientId into a cross-tenant reference").isZero();
        assertThat(clientTables).as("a client table would need tenant validation of clientId").isZero();
    }
}
