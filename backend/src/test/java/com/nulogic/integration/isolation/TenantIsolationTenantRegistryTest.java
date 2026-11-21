package com.nulogic.integration.isolation;

import com.nulogic.config.AbstractTenantIsolationIntegrationTest;
import com.nulogic.integration.isolation.TwoTenantFixture.Actor;
import com.nulogic.integration.isolation.TwoTenantFixture.Tenant;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request;

/**
 * Phase 3 #2: the {@code tenants} registry. Rows carry {@code tenant_id IS NULL}, so the V179
 * policies ({@code tenant_id IS NULL OR ...}) make every tenant row visible to every session.
 *
 * <p>Verdict: database-level exposure is real (proved below), but NOT exploitable through the API:
 * every endpoint that returns other tenants' rows is SYSTEM_ADMIN (platform operator) only, and all
 * remaining code paths read the caller's own row or run pre-auth / in schedulers. Restricting the
 * policy needs a platform-scope design decision (see report): SystemAdminService, TenantProvisioning
 * and the JWT filter's TenantStatusCache all legitimately read other tenants' rows.</p>
 */
@DisplayName("Tenant isolation: tenants registry exposure (Phase 3 #2)")
class TenantIsolationTenantRegistryTest extends AbstractTenantIsolationIntegrationTest {

    private static final String B_CONTACT = "tenant-b-contact@iso.test";

    @Test
    @DisplayName("DOCUMENTED: nu_app_rls with GUC=A can read tenant B's registry row incl. contact email")
    void registryRowIsVisibleAtDatabaseLevel() throws SQLException {
        try (Connection c = appRoleConnection();
             PreparedStatement guc = c.prepareStatement("SELECT set_config('app.current_tenant_id', ?, false)")) {
            guc.setString(1, Tenant.A.id().toString());
            guc.execute();
            try (PreparedStatement ps = c.prepareStatement("SELECT contact_email FROM tenants WHERE id = ?")) {
                ps.setObject(1, Tenant.B.id());
                try (ResultSet rs = ps.executeQuery()) {
                    assertThat(rs.next()).as("tenant B row visible to tenant A session").isTrue();
                    assertThat(rs.getString(1)).isEqualTo(B_CONTACT);
                }
            }
        }
    }

    /** Every endpoint that reads or mutates tenant registry rows. */
    private static List<String[]> registryEndpoints() {
        String b = Tenant.B.id().toString();
        return List.of(
                new String[]{"GET", "/api/v1/admin/system/tenants", ""},
                new String[]{"GET", "/api/v1/admin/system/overview", ""},
                new String[]{"GET", "/api/v1/admin/system/tenants/" + b + "/metrics", ""},
                new String[]{"GET", "/api/v1/admin/system/growth-metrics", ""},
                new String[]{"POST", "/api/v1/admin/system/tenants/" + b + "/suspend", ""},
                new String[]{"POST", "/api/v1/admin/system/tenants/" + b + "/activate", ""},
                new String[]{"PATCH", "/api/v1/admin/system/tenants/" + b + "/timezone", "{\"timezone\":\"UTC\"}"},
                new String[]{"POST", "/api/v1/admin/system/tenants/" + b + "/impersonate", ""},
                new String[]{"GET", "/api/v1/admin/settings", ""},
                new String[]{"GET", "/api/v1/admin/stats", ""},
                new String[]{"GET", "/api/v1/admin/users", ""},
                new String[]{"POST", "/api/v1/platform/migrate/" + b, ""},
                new String[]{"POST", "/api/v1/tenants/register", "{\"name\":\"ISO-X\",\"code\":\"iso-x\"}"});
    }

    @Test
    @DisplayName("PROOF: no tenant-level role (admin, employee) can read or change another tenant's registry row")
    void registryEndpointsAreSystemAdminOnly() throws Exception {
        String before = TenantIsolationWriteApiTest.rowHash("tenants", Tenant.B.id());
        for (Actor actor : List.of(Actor.admin(Tenant.A), Actor.employee(Tenant.A))) {
            for (String[] e : registryEndpoints()) {
                var req = request(HttpMethod.valueOf(e[0]), e[1]);
                if (!e[2].isEmpty()) {
                    req = req.contentType(MediaType.APPLICATION_JSON).content(e[2]);
                }
                MvcResult res = perform(as(actor, req));
                // 403 from @RequiresPermission; body-validated endpoints may answer 400 first. Never 2xx.
                assertThat(status(res)).as("%s %s as %s -> %s", e[0], e[1], actor.email(), body(res)).isIn(400, 403);
                assertThat(body(res)).doesNotContain(B_CONTACT).doesNotContain("ISO-B Tenant");
            }
        }
        assertThat(TenantIsolationWriteApiTest.rowHash("tenants", Tenant.B.id())).as("tenant B row changed").isEqualTo(before);

        // Tenant-scoped self-service context only ever describes the caller's own tenant.
        MvcResult ctx = perform(as(Actor.admin(Tenant.A), get("/api/v1/platform/my-context")));
        assertThat(body(ctx)).doesNotContain(B_CONTACT).doesNotContain("ISO-B Tenant");
    }

    @Test
    @DisplayName("OWNER DECISION (documented): a SUPER_ADMIN is a platform operator and lists every tenant")
    void superAdminIsPlatformWide() throws Exception {
        MvcResult res = perform(as(Actor.superAdmin(Tenant.A), get("/api/v1/admin/system/tenants")));
        assertThat(status(res)).as(body(res)).isEqualTo(200);
        assertThat(body(res)).contains("ISO-B Tenant");
    }
}
