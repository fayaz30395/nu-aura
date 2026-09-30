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
 * Proves that V341 does what its header claims when the migration connection is NOT a BYPASSRLS
 * role — the case that made V331 and V334 silently do nothing.
 *
 * <h2>Why this test exists</h2>
 * Every tenant table carries a RESTRICTIVE {@code rls_ctx_required_*} policy (V254/V262) plus
 * FORCE ROW LEVEL SECURITY (V306). A migration that touches {@code users}, {@code roles} or
 * {@code role_permissions} without first setting {@code app.current_tenant_id} therefore matches
 * zero rows — and Flyway still records {@code success = true}. That failure mode is invisible:
 * the deploy is green and the data is simply not there. It is the same class of defect as V316,
 * whose EXISTS guard never matched in production.
 *
 * <h2>Why V341 and not V331/V334</h2>
 * V331 and V334 are applied migrations and are immutable — they are byte-identical to release
 * 3bcb7f31 and must stay that way. Editing them in place could not have delivered the fix in any
 * case: the prod profile ({@code validate-on-migrate=true}, {@code repair-on-migrate=false}) fails
 * validation on a database that already recorded them, and the base/render profile
 * ({@code repair-on-migrate=true}) realigns the checksum without re-running the file. So the
 * correction ships forward-only as V341, and these tests assert V341.
 *
 * <h2>Why it cannot be tested through the normal harness</h2>
 * {@link AbstractPostgresIntegrationTest} runs Flyway as the container's {@code POSTGRES_USER},
 * which is a SUPERUSER and therefore BYPASSRLS. Under that role the bug is unreproducible and a
 * test asserting only the post-chain data state would pass against a broken migration. So this
 * test creates a dedicated NOSUPERUSER / NOBYPASSRLS role and re-executes the real migration
 * files through it — the assertion is about the artifact that ships, not a copy of its SQL.
 *
 * <p>Findings this pins (measured on postgres:16, non-BYPASSRLS role, transaction rolled back):
 * the grant statement without the GUC inserts nothing; with it, 6 rows (2 permissions x 3 roles).
 * The demo-expiry update without the GUC touches nothing; with it, every seeded demo account.
 */
@SpringBootTest
@ActiveProfiles("test")
@Import(TestSecurityConfig.class)
@DisplayName("V341 forward-only correction under a non-BYPASSRLS migration role")
class MigrationTenantContextTest extends AbstractPostgresIntegrationTest {

    /** The demo tenant V332/V333/V334 all target. */
    private static final String DEMO_TENANT = "660e8400-e29b-41d4-a716-446655440001";
    private static final String V341_FILE =
            "V341__forward_only_rls_correction_for_v331_and_v334.sql";
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
    @DisplayName("V341 grants LMS:ENROLL + LMS:CERTIFICATE_VIEW under a NOBYPASSRLS role")
    void v341GrantsUnderNonBypassRole() throws Exception {
        String v341 = v341Sql();

        try (Connection c = probeConnection()) {
            c.setAutoCommit(false);
            clearLmsGrants(c);
            assertThat(scalar(c, COUNT_LMS_GRANTS)).isZero();

            exec(c, v341);

            exec(c, "SELECT set_config('app.current_tenant_id', '" + DEMO_TENANT + "', true)");
            assertThat(scalar(c, COUNT_LMS_GRANTS))
                    .as("2 permissions x 3 roles (EMPLOYEE/SELF, MANAGER/TEAM, TEAM_LEAD/TEAM)")
                    .isEqualTo(6);

            c.rollback();
        }
    }

    /**
     * The grant set must be V66's, not a widened one. The candidate lineage's V337 substitutes
     * HR_MANAGER at ALL scope for MANAGER at TEAM; V66 (:505/:570 MANAGER TEAM, :589 EMPLOYEE SELF,
     * :650 TEAM_LEAD TEAM) grants no such thing, so this pins each (role, scope) pair explicitly.
     */
    @Test
    @DisplayName("V341 grants exactly V66's (role, scope) pairs — no scope is widened")
    void v341GrantsExactlyTheV66Pairs() throws Exception {
        try (Connection c = probeConnection()) {
            c.setAutoCommit(false);
            clearLmsGrants(c);
            exec(c, v341Sql());
            exec(c, "SELECT set_config('app.current_tenant_id', '" + DEMO_TENANT + "', true)");

            assertThat(lmsGrantsFor(c, EMPLOYEE_ROLE_ID, "SELF")).isEqualTo(2);
            assertThat(lmsGrantsFor(c, MANAGER_ROLE_ID, "TEAM")).isEqualTo(2);
            assertThat(lmsGrantsFor(c, TEAM_LEAD_ROLE_ID, "TEAM")).isEqualTo(2);
            assertThat(lmsGrantsFor(c, MANAGER_ROLE_ID, "ALL"))
                    .as("MANAGER must not receive the LMS grants at ALL scope")
                    .isZero();
            assertThat(scalar(c, COUNT_LMS_GRANTS + " AND rp.scope = 'ALL'"))
                    .as("no LMS grant to these three roles may be at ALL scope")
                    .isZero();

            c.rollback();
        }
    }

    @Test
    @DisplayName("V341 run twice inserts nothing the second time — idempotent")
    void v341IsIdempotent() throws Exception {
        try (Connection c = probeConnection()) {
            c.setAutoCommit(false);
            clearLmsGrants(c);

            exec(c, v341Sql());
            exec(c, "SELECT set_config('app.current_tenant_id', '" + DEMO_TENANT + "', true)");
            int afterFirst = scalar(c, COUNT_LMS_GRANTS);

            exec(c, v341Sql());
            exec(c, "SELECT set_config('app.current_tenant_id', '" + DEMO_TENANT + "', true)");

            assertThat(scalar(c, COUNT_LMS_GRANTS))
                    .as("NOT EXISTS must prevent duplicate (role_id, permission_id, scope) rows")
                    .isEqualTo(afterFirst);

            c.rollback();
        }
    }

    @Test
    @DisplayName("V341 with its set_config removed grants NOTHING — the guard is load-bearing")
    void v341WithoutTenantContextGrantsNothing() throws Exception {
        String stripped = stripSetConfig(v341Sql());

        try (Connection c = probeConnection()) {
            c.setAutoCommit(false);
            clearLmsGrants(c);

            exec(c, "SELECT set_config('app.current_tenant_id', '', true)");
            exec(c, stripped);

            exec(c, "SELECT set_config('app.current_tenant_id', '" + DEMO_TENANT + "', true)");
            assertThat(scalar(c, COUNT_LMS_GRANTS))
                    .as("this is the pre-remediation shape of V334: green migration, zero grants")
                    .isZero();

            c.rollback();
        }
    }

    /**
     * V331 and V334 ship as-is and must never be edited again. Their checksums are recorded in every
     * migrated database; a change means either a validation failure (prod) or a silently skipped
     * correction (repair-on-migrate). This pins the property that made V341 necessary.
     */
    @Test
    @DisplayName("V331 and V334 carry no tenant context — which is why V341 exists, and why they stay untouched")
    void appliedMigrationsRemainWithoutTenantContext() throws Exception {
        String v331 = migrationSql("V331__refresh_demo_password_expiry.sql");
        String v334 = migrationSql("V334__restore_employee_lms_enroll_and_certificate_grants.sql");

        assertThat(v331)
                .as("V331 is applied and immutable — the correction belongs in V341, not here")
                .doesNotContain("app.current_tenant_id");
        assertThat(v334)
                .as("V334 is applied and immutable — the correction belongs in V341, not here")
                .doesNotContain("app.current_tenant_id");
    }

    @Test
    @DisplayName("V341 refreshes the demo password expiry under a NOBYPASSRLS role")
    void v341RefreshesExpiryUnderNonBypassRole() throws Exception {
        String v341 = v341Sql();

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
            exec(c, v341);

            exec(c, "SELECT set_config('app.current_tenant_id', '" + DEMO_TENANT + "', true)");
            assertThat(expiredDemoAccounts(c))
                    .as("PasswordPolicyConfig.maxAgeDays = 90; every demo account must be inside it")
                    .isZero();

            c.rollback();
        }
    }

    @Test
    @DisplayName("V341 with its per-tenant set_config removed refreshes NOTHING")
    void v341WithoutTenantContextRefreshesNothing() throws Exception {
        String stripped = v341Sql()
                .replace("PERFORM set_config('app.current_tenant_id', tt.id::text, true);", "");

        try (Connection c = probeConnection()) {
            c.setAutoCommit(false);
            exec(c, "SELECT set_config('app.current_tenant_id', '" + DEMO_TENANT + "', true)");
            exec(c, "UPDATE users SET password_changed_at = NOW() - interval '200 days' "
                    + "WHERE tenant_id = '" + DEMO_TENANT + "' AND email LIKE '%@nulogic.io'");
            int expiredBefore = expiredDemoAccounts(c);
            assertThat(expiredBefore).isPositive();

            exec(c, "SELECT set_config('app.current_tenant_id', '', true)");
            exec(c, stripped);

            exec(c, "SELECT set_config('app.current_tenant_id', '" + DEMO_TENANT + "', true)");
            assertThat(expiredDemoAccounts(c))
                    .as("the pre-remediation shape of V331: green migration, still-expired accounts, "
                            + "and auth.setup.ts fails for the whole Playwright suite")
                    .isEqualTo(expiredBefore);

            c.rollback();
        }
    }

    // ── helpers ───────────────────────────────────────────────────────────────────

    private int expiredDemoAccounts(Connection c) throws SQLException {
        return scalar(c, "SELECT count(*) FROM users WHERE email LIKE '%@nulogic.io' "
                + "AND password_changed_at < NOW() - interval '90 days'");
    }

    /**
     * V341 as it ships, with its placeholder resolved the way the demo/dev profiles resolve it.
     * Read from the classpath so the assertions are about the artifact that ships, not a copy.
     */
    private static String v341Sql() throws Exception {
        return migrationSql(V341_FILE).replace("${demoCredentialsEnabled}", "true");
    }

    /** Removes the per-tenant context statement, leaving the rest of the migration untouched. */
    private static String stripSetConfig(String sql) {
        return sql.replace("PERFORM set_config('app.current_tenant_id', tt.id::text, true);", "");
    }

    private int lmsGrantsFor(Connection c, String roleId, String scope) throws SQLException {
        return scalar(c, """
                SELECT count(*) FROM role_permissions rp
                  JOIN permissions p ON p.id = rp.permission_id
                 WHERE p.code IN ('LMS:ENROLL', 'LMS:CERTIFICATE_VIEW')
                   AND rp.role_id = '%s'
                   AND rp.scope = '%s'
                   AND (rp.is_deleted = false OR rp.is_deleted IS NULL)
                """.formatted(roleId, scope));
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
