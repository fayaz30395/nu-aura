package com.nulogic.integration.isolation;

import com.nulogic.config.AbstractTenantIsolationIntegrationTest;
import com.nulogic.integration.isolation.TwoTenantFixture.Actor;
import com.nulogic.integration.isolation.TwoTenantFixture.Tenant;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MvcResult;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;
import java.util.stream.Stream;

import static com.nulogic.integration.isolation.TwoTenantFixture.ANNOUNCEMENT;
import static com.nulogic.integration.isolation.TwoTenantFixture.WEBHOOK;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

/**
 * Phase 3 #1: the 12 tables that have neither tenant_id nor RLS.
 *
 * <p>Verdict: NOT exploitable through the application. Eleven are JPA {@code @ElementCollection} /
 * {@code @JoinTable} rows that Hibernate only loads by the owning parent's id after loading the
 * parent, and every parent is under FORCE RLS; no repository, JPQL, native query or JdbcTemplate
 * names them. The twelfth pair is infrastructure: {@code shedlock} (job locks, no tenant data)
 * and {@code failed_kafka_events} (platform DLQ, SYSTEM_ADMIN-only API). The rows ARE readable at
 * the database level by a nu_app_rls session that writes raw SQL, which no code path does; the
 * source scan below fails the build the moment one starts to.</p>
 */
@DisplayName("Tenant isolation: child tables without tenant_id/RLS (Phase 3 #1)")
class TenantIsolationChildTableTest extends AbstractTenantIsolationIntegrationTest {

    /** table -> the only main-source files allowed to name it (owning mapping / infra / javadoc). */
    private static final Map<String, Set<String>> ALLOWED_REFERENCES = Map.ofEntries(
            Map.entry("announcement_target_departments", Set.of("Announcement.java")),
            Map.entry("announcement_target_employees", Set.of("Announcement.java")),
            Map.entry("api_key_scopes", Set.of("ApiKey.java")),
            Map.entry("benefit_claim_documents", Set.of("BenefitClaim.java")),
            Map.entry("notification_template_channels", Set.of("NotificationTemplate.java")),
            Map.entry("user_app_direct_permissions", Set.of("UserAppAccess.java")),
            Map.entry("user_app_roles", Set.of("UserAppAccess.java")),
            Map.entry("user_notification_quiet_days", Set.of("UserNotificationPreference.java")),
            Map.entry("webhook_events", Set.of("Webhook.java")),
            Map.entry("failed_kafka_events", Set.of("FailedKafkaEvent.java", "DeadLetterHandler.java",
                    "IntegrationEventRouter.java")));

    @Test
    @DisplayName("PROOF: child tables are named only by their owning JPA mapping (no native/JPQL/JDBC access path)")
    void childTablesHaveNoDirectAccessPath() throws IOException {
        Map<String, Set<String>> found = new TreeMap<>();
        try (Stream<Path> files = Files.walk(Path.of("src/main/java"))) {
            for (Path p : files.filter(f -> f.toString().endsWith(".java")).toList()) {
                String src = Files.readString(p, StandardCharsets.UTF_8);
                for (String table : ALLOWED_REFERENCES.keySet()) {
                    if (java.util.regex.Pattern.compile("\\b" + table + "\\b").matcher(src).find()) {
                        found.computeIfAbsent(table, k -> new TreeSet<>()).add(p.getFileName().toString());
                    }
                }
            }
        }
        for (Map.Entry<String, Set<String>> e : ALLOWED_REFERENCES.entrySet()) {
            assertThat(found.getOrDefault(e.getKey(), Set.of()))
                    .as("%s is referenced outside its owning mapping; a direct query bypasses the parent's RLS", e.getKey())
                    .isSubsetOf(e.getValue());
        }
        // The collection mappings must hang off entities whose tables are tenant-scoped (RLS forced).
        for (String parent : List.of("announcements", "api_keys", "benefit_claims", "notification_templates",
                "user_app_access", "user_notification_preferences", "webhooks")) {
            Map<String, Object> rls = superuserJdbc().queryForMap(
                    "SELECT relrowsecurity AS e, relforcerowsecurity AS f FROM pg_class WHERE relname = ?", parent);
            assertThat(rls).as("parent %s must be under FORCE RLS", parent).containsEntry("e", true).containsEntry("f", true);
        }
    }

    @Test
    @DisplayName("DOCUMENTED: raw SQL as nu_app_rls can see other tenants' child rows (defense-in-depth gap, no app path)")
    void childRowsAreVisibleToRawSql() throws SQLException {
        try (Connection c = appRoleConnection();
             PreparedStatement guc = c.prepareStatement("SELECT set_config('app.current_tenant_id', ?, false)")) {
            guc.setString(1, Tenant.A.id().toString());
            guc.execute();
            assertThat(count(c, "SELECT count(*) FROM announcement_target_departments WHERE announcement_id = '"
                    + Tenant.B.id(ANNOUNCEMENT) + "'")).isEqualTo(1);
            assertThat(count(c, "SELECT count(*) FROM webhook_events WHERE webhook_id = '" + Tenant.B.id(WEBHOOK) + "'"))
                    .isEqualTo(1);
            // ...while the parents themselves are hidden, so JPA can never reach the children.
            assertThat(count(c, "SELECT count(*) FROM announcements WHERE id = '" + Tenant.B.id(ANNOUNCEMENT) + "'")).isZero();
            assertThat(count(c, "SELECT count(*) FROM webhooks WHERE id = '" + Tenant.B.id(WEBHOOK) + "'")).isZero();
        }
    }

    @Test
    @DisplayName("PROOF: no endpoint returns another tenant's child rows (announcement targets, webhook events)")
    void childRowsAreNotReachableThroughTheApi() throws Exception {
        Actor superAdmin = Actor.superAdmin(Tenant.A);
        for (String path : List.of("/api/v1/announcements/" + Tenant.B.id(ANNOUNCEMENT), "/api/v1/announcements",
                "/api/webhooks/" + Tenant.B.id(WEBHOOK), "/api/webhooks", "/api/webhooks/" + Tenant.B.id(WEBHOOK) + "/deliveries")) {
            for (Actor actor : List.of(Actor.admin(Tenant.A), superAdmin)) {
                MvcResult res = perform(as(actor, get(path)));
                assertThat(body(res)).as("%s as %s", path, actor.email())
                        .doesNotContain(Tenant.B.marker())
                        .doesNotContain("iso-b-synthetic-webhook-secret");
            }
        }
        // The webhook API additionally requires a literal SYSTEM:ADMIN authority or webhook scopes
        // (WebhookScopeAspect); the cloned SUPER_ADMIN does not carry it, so the API is closed to every
        // tenant-A principal here. Isolation of the parent row itself is proven by the RLS tests.
    }

    @Test
    @DisplayName("platform DLQ (failed_kafka_events, all tenants' payloads) is SYSTEM_ADMIN-only")
    void platformDlqIsNotTenantReadable() throws Exception {
        for (Actor actor : List.of(Actor.admin(Tenant.A), Actor.employee(Tenant.A))) {
            MvcResult res = perform(as(actor, get("/api/v1/admin/kafka/failed-events")));
            assertThat(status(res)).as("%s -> %s", actor.email(), body(res)).isEqualTo(403);
            assertThat(body(res)).doesNotContain(Tenant.B.marker());
        }
        // OWNER DECISION (documented, not a bug in tenant scoping): a SUPER_ADMIN is a platform operator
        // and sees every tenant's DLQ payloads. SUPER_ADMIN is a per-tenant role row; only NuLogic's own
        // tenant holds it and RoleManagementService refuses to grant it from a non-super-admin.
        MvcResult platform = perform(as(Actor.superAdmin(Tenant.A), get("/api/v1/admin/kafka/failed-events")));
        assertThat(status(platform)).isEqualTo(200);
        assertThat(body(platform)).contains(Tenant.B.marker());
    }

    private static long count(Connection c, String sql) throws SQLException {
        try (PreparedStatement ps = c.prepareStatement(sql); ResultSet rs = ps.executeQuery()) {
            rs.next();
            return rs.getLong(1);
        }
    }
}
