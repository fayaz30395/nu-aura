package com.nulogic.integration;

import com.nulogic.config.AbstractPostgresIntegrationTest;
import com.nulogic.config.TestSecurityConfig;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.Properties;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Proves the RLS-under-non-BYPASSRLS behavior of V331/V334 (immutable, production-applied,
 * proven broken by design) and their forward-only corrections V337 and V340 (which must
 * actually work under the same role).
 *
 * <h2>Why this test exists</h2>
 * Every tenant table carries a RESTRICTIVE {@code rls_ctx_required_*} policy (V254/V262) plus
 * FORCE ROW LEVEL SECURITY (V306). A migration that touches {@code users}, {@code roles} or
 * {@code role_permissions} without first setting {@code app.current_tenant_id} therefore matches
 * zero rows — and Flyway still records {@code success = true}. That failure mode is invisible:
 * the deploy is green and the data is simply not there. It is the same class of defect as V316,
 * whose EXISTS guard never matched in production.
 *
 * <h2>V331/V334 are immutable — do not expect them to pass</h2>
 * V331 and V334 are already applied in production. {@code MigrationRlsGuardTest} pins their
 * checksums; this class must never be "fixed" by editing them in place — that is the exact V316
 * mistake repeated. Instead the defect they carry is corrected forward-only: V337 re-asserts
 * V334's LMS grants across every tenant, RLS-safely; V340 re-asserts V331's password-expiry
 * refresh across every tenant, RLS-safely. This test pins BOTH halves: the old migrations stay
 * broken as shipped, and the new ones actually work.
 *
 * <h2>Why it cannot be tested through the normal harness</h2>
 * {@link AbstractPostgresIntegrationTest} runs Flyway as the container's {@code POSTGRES_USER},
 * which is a SUPERUSER and therefore BYPASSRLS. Under that role the bug is unreproducible and a
 * test asserting only the post-chain data state would pass against a broken migration. So this
 * test creates a dedicated NOSUPERUSER / NOBYPASSRLS role and re-executes the real migration
 * files through it — the assertion is about the artifact that ships, not a copy of its SQL.
 */
@SpringBootTest
@ActiveProfiles("test")
@Import(TestSecurityConfig.class)
@DisplayName("V331/V334 (immutable, broken-as-shipped) vs V337/V340 (forward-only corrections) under a non-BYPASSRLS migration role")
class MigrationTenantContextTest extends AbstractPostgresIntegrationTest {

    /** The demo tenant V332/V333/V334 all target. */
    private static final String DEMO_TENANT = "660e8400-e29b-41d4-a716-446655440001";
    private static final String PROBE_ROLE = "rls_migration_probe";
    private static final String PROBE_PASSWORD = "probe_pw";

    private static final String EMPLOYEE_ROLE_ID = "550e8400-e29b-41d4-a716-446655440023";
    private static final String MANAGER_ROLE_ID = "550e8400-e29b-41d4-a716-446655440022";
    private static final String TEAM_LEAD_ROLE_ID = "48000000-0e01-0000-0000-000000000001";

    private static final String COUNT_LMS_GRANTS = """
            SELECT count(*) FROM role_permissions rp
              JOIN permissions p ON p.id = rp.permission_id
             WHERE p.code IN ('LMS:ENROLL', 'LMS:CERTIFICATE_VIEW')
               AND rp.role_id IN ('%s', '%s', '%s')
               AND (rp.is_deleted = false OR rp.is_deleted IS NULL)
            """.formatted(EMPLOYEE_ROLE_ID, MANAGER_ROLE_ID, TEAM_LEAD_ROLE_ID);

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void createNonBypassProbeRole() {
        // Idempotent: the container is shared (and reusable) across test classes.
        jdbcTemplate.execute("""
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '%s') THEN
                        CREATE ROLE %s LOGIN PASSWORD '%s' NOSUPERUSER NOBYPASSRLS;
                    END IF;
                END $$;
                """.formatted(PROBE_ROLE, PROBE_ROLE, PROBE_PASSWORD));
        jdbcTemplate.execute("GRANT USAGE ON SCHEMA public TO " + PROBE_ROLE);
        jdbcTemplate.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO " + PROBE_ROLE);
        jdbcTemplate.execute("GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO " + PROBE_ROLE);
    }

    @Test
    @DisplayName("the probe role really is NOSUPERUSER and NOBYPASSRLS")
    void probeRoleHasNoBypass() {
        Boolean superuser = jdbcTemplate.queryForObject(
                "SELECT rolsuper FROM pg_roles WHERE rolname = ?", Boolean.class, PROBE_ROLE);
        Boolean bypass = jdbcTemplate.queryForObject(
                "SELECT rolbypassrls FROM pg_roles WHERE rolname = ?", Boolean.class, PROBE_ROLE);

        assertThat(superuser).as("a superuser would bypass RLS and make this whole test vacuous").isFalse();
        assertThat(bypass).as("BYPASSRLS would make this whole test vacuous").isFalse();
    }

    @Test
    @DisplayName("without the tenant GUC a tenant-scoped role row is invisible to the migration role")
    void roleRowsAreInvisibleWithoutTenantContext() throws SQLException {
        try (Connection c = probeConnection()) {
            assertThat(scalar(c, "SELECT count(*) FROM roles WHERE id = '" + EMPLOYEE_ROLE_ID + "'"))
                    .as("this is why V334's EXISTS guard silently matched nothing")
                    .isZero();

            exec(c, "SELECT set_config('app.current_tenant_id', '" + DEMO_TENANT + "', false)");

            assertThat(scalar(c, "SELECT count(*) FROM roles WHERE id = '" + EMPLOYEE_ROLE_ID + "'"))
                    .isEqualTo(1);
        }
    }

    @Test
    @DisplayName("V334 as shipped (immutable, production-applied) grants NOTHING under a NOBYPASSRLS role")
    void v334AsShippedGrantsNothingUnderNonBypassRole() throws Exception {
        String v334 = migrationSql("V334__restore_employee_lms_enroll_and_certificate_grants.sql");

        try (Connection c = probeConnection()) {
            c.setAutoCommit(false);
            clearLmsGrants(c);
            assertThat(scalar(c, COUNT_LMS_GRANTS)).isZero();

            // clearLmsGrants sets the tenant GUC (is_local=true) to do its own DELETE, and that
            // setting stays in effect for the rest of THIS transaction/connection. Clear it before
            // running V334, or V334 unintentionally inherits an ambient tenant context it never
            // set itself, defeating the point of this test.
            exec(c, "SELECT set_config('app.current_tenant_id', '', true)");
            exec(c, v334);

            exec(c, "SELECT set_config('app.current_tenant_id', '" + DEMO_TENANT + "', true)");
            assertThat(scalar(c, COUNT_LMS_GRANTS))
                    .as("V334 carries no per-tenant GUC — this is the documented, immutable defect "
                            + "that V337 corrects forward-only. Do not fix by editing V334.")
                    .isZero();

            c.rollback();
        }
    }

    @Test
    @DisplayName("V337 (forward-only correction) grants LMS:ENROLL + LMS:CERTIFICATE_VIEW under a NOBYPASSRLS role")
    void v337GrantsUnderNonBypassRole() throws Exception {
        String v337 = migrationSql("V337__lms_grants_all_tenants_rls_safe.sql");

        try (Connection c = probeConnection()) {
            c.setAutoCommit(false);
            clearLmsGrants(c);
            assertThat(scalar(c, COUNT_LMS_GRANTS)).isZero();

            exec(c, v337);

            exec(c, "SELECT set_config('app.current_tenant_id', '" + DEMO_TENANT + "', true)");
            assertThat(scalar(c, COUNT_LMS_GRANTS))
                    .as("2 permissions x 3 roles (EMPLOYEE/SELF, MANAGER/TEAM, TEAM_LEAD/TEAM) "
                            + "for the demo tenant alone; V337 iterates every tenant")
                    .isEqualTo(6);

            c.rollback();
        }
    }

    @Test
    @DisplayName("V331 as shipped (immutable, production-applied) refreshes NOTHING under a NOBYPASSRLS role")
    void v331AsShippedRefreshesNothingUnderNonBypassRole() throws Exception {
        String v331 = migrationSql("V331__refresh_demo_password_expiry.sql")
                .replace("${demoCredentialsEnabled}", "true");

        try (Connection c = probeConnection()) {
            c.setAutoCommit(false);
            exec(c, "SELECT set_config('app.current_tenant_id', '" + DEMO_TENANT + "', true)");
            exec(c, "UPDATE users SET password_changed_at = NOW() - interval '200 days' "
                    + "WHERE tenant_id = '" + DEMO_TENANT + "' AND email LIKE '%@nulogic.io'");

            int demoUsers = scalar(c, "SELECT count(*) FROM users WHERE email LIKE '%@nulogic.io'");
            assertThat(demoUsers).as("the chain must seed demo accounts for this to mean anything")
                    .isPositive();
            int expiredBefore = expiredDemoAccounts(c);
            assertThat(expiredBefore).isEqualTo(demoUsers);

            exec(c, "SELECT set_config('app.current_tenant_id', '', true)");
            exec(c, v331);

            exec(c, "SELECT set_config('app.current_tenant_id', '" + DEMO_TENANT + "', true)");
            assertThat(expiredDemoAccounts(c))
                    .as("V331 carries no per-tenant GUC — this is the documented, immutable defect "
                            + "that V340 corrects forward-only. Do not fix by editing V331.")
                    .isEqualTo(expiredBefore);

            c.rollback();
        }
    }

    @Test
    @DisplayName("V340 (forward-only correction) refreshes the demo password expiry under a NOBYPASSRLS role")
    void v340RefreshesExpiryUnderNonBypassRole() throws Exception {
        String v340 = migrationSql("V340__refresh_demo_password_expiry_all_tenants_rls_safe.sql")
                .replace("${demoCredentialsEnabled}", "true");

        try (Connection c = probeConnection()) {
            c.setAutoCommit(false);
            exec(c, "SELECT set_config('app.current_tenant_id', '" + DEMO_TENANT + "', true)");
            exec(c, "UPDATE users SET password_changed_at = NOW() - interval '200 days' "
                    + "WHERE tenant_id = '" + DEMO_TENANT + "' AND email LIKE '%@nulogic.io'");

            int demoUsers = scalar(c, "SELECT count(*) FROM users WHERE email LIKE '%@nulogic.io'");
            assertThat(demoUsers).as("the chain must seed demo accounts for this to mean anything")
                    .isPositive();
            assertThat(expiredDemoAccounts(c)).isEqualTo(demoUsers);

            exec(c, "SELECT set_config('app.current_tenant_id', '', true)");
            exec(c, v340);

            exec(c, "SELECT set_config('app.current_tenant_id', '" + DEMO_TENANT + "', true)");
            assertThat(expiredDemoAccounts(c))
                    .as("PasswordPolicyConfig.maxAgeDays = 90; every demo account must be inside it")
                    .isZero();

            c.rollback();
        }
    }

    // ── helpers ───────────────────────────────────────────────────────────────────

    private int expiredDemoAccounts(Connection c) throws SQLException {
        return scalar(c, "SELECT count(*) FROM users WHERE email LIKE '%@nulogic.io' "
                + "AND password_changed_at < NOW() - interval '90 days'");
    }

    private void clearLmsGrants(Connection c) throws SQLException {
        exec(c, "SELECT set_config('app.current_tenant_id', '" + DEMO_TENANT + "', true)");
        exec(c, """
                DELETE FROM role_permissions rp
                 USING permissions p
                 WHERE rp.permission_id = p.id
                   AND p.code IN ('LMS:ENROLL', 'LMS:CERTIFICATE_VIEW')
                   AND rp.role_id IN ('%s', '%s', '%s')
                """.formatted(EMPLOYEE_ROLE_ID, MANAGER_ROLE_ID, TEAM_LEAD_ROLE_ID));
    }

    private static String migrationSql(String fileName) throws Exception {
        try (var in = new ClassPathResource("db/migration/" + fileName).getInputStream()) {
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    private Connection probeConnection() throws SQLException {
        Properties props = new Properties();
        props.setProperty("user", PROBE_ROLE);
        props.setProperty("password", PROBE_PASSWORD);
        return DriverManager.getConnection(POSTGRES.getJdbcUrl(), props);
    }

    private static void exec(Connection c, String sql) throws SQLException {
        try (Statement st = c.createStatement()) {
            st.execute(sql);
        }
    }

    private static int scalar(Connection c, String sql) throws SQLException {
        try (Statement st = c.createStatement(); ResultSet rs = st.executeQuery(sql)) {
            rs.next();
            return rs.getInt(1);
        }
    }
}
