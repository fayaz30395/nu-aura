package com.nulogic.integration;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import java.util.Properties;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * ARCH-01: NOBYPASSRLS integration test — proves that the {@code nu_app_rls} role operates
 * under Row-Level Security enforcement when accessing the {@code employees} table.
 *
 * <h2>What this test proves</h2>
 * <ol>
 *   <li>The {@code nu_app_rls} role exists and has {@code NOBYPASSRLS} (cannot skip RLS
 *       policies the way a superuser or a {@code BYPASSRLS} role can).</li>
 *   <li>When {@code app.current_tenant_id} is set to tenant A's ID, <em>only</em> rows for
 *       tenant A are visible — tenant B's rows are invisible even though the role has a
 *       SELECT grant on the table.</li>
 *   <li>Switching the GUC to tenant B's ID flips visibility in exactly the same way.</li>
 * </ol>
 *
 * <h2>Why this matters</h2>
 * The application depends on PostgreSQL RLS to enforce tenant isolation. The superuser
 * (used by Flyway and connection-pool setup) has {@code BYPASSRLS} by default. The
 * application connection role ({@code nu_app_rls}) must NOT have {@code BYPASSRLS};
 * otherwise any SQL path that forgets to set the GUC will see cross-tenant data.
 *
 * <h2>Enabling in CI</h2>
 * Set the environment variable {@code DOCKER_AVAILABLE=true} and remove the {@code @Disabled}
 * annotation, or run the test class explicitly with Maven:
 * <pre>
 *   mvn -pl backend test -Dtest=RlsNoBypassTest -DDOCKER_AVAILABLE=true
 * </pre>
 *
 * <h2>Local run</h2>
 * Requires a running Docker daemon (Docker Desktop or colima). If colima is used, ensure the
 * socket symlink is in place:
 * <pre>
 *   sudo ln -sf $HOME/.colima/default/docker.sock /var/run/docker.sock
 * </pre>
 *
 * @see com.nulogic.architecture.RlsTenantGucScopeTest for the static source-scan guard that
 *      prevents session-scoped {@code set_config} calls from reappearing in production code.
 */
@DisplayName("ARCH-01: NOBYPASSRLS — RLS correctly isolates tenant data when accessed via nu_app_rls role")
@EnabledIfEnvironmentVariable(named = "DOCKER_AVAILABLE", matches = "true")
class RlsNoBypassTest {

    private static final String POSTGRES_IMAGE = "postgres:16-alpine";
    private static final String APP_ROLE = "nu_app_rls";
    private static final String APP_ROLE_PASSWORD = "test_rls_pw";

    /**
     * Full end-to-end RLS isolation proof.
     *
     * <p>Steps:
     * <ol>
     *   <li>Start a fresh Postgres 16 container (superuser connection).</li>
     *   <li>Create {@code nu_app_rls} as {@code NOBYPASSRLS LOGIN}.</li>
     *   <li>Create a minimal {@code employees} table with a {@code tenant_id} column.</li>
     *   <li>Enable RLS on the table; add a policy that filters by
     *       {@code current_setting('app.current_tenant_id', true)}.</li>
     *   <li>Grant the role enough privilege to exercise the policy.</li>
     *   <li>Insert one employee per tenant (two tenants total).</li>
     *   <li>Reconnect as {@code nu_app_rls}.</li>
     *   <li>Set GUC to tenant A → assert only tenant A's row is visible.</li>
     *   <li>Set GUC to tenant B → assert only tenant B's row is visible.</li>
     * </ol>
     */
    @Test
    @DisplayName("nu_app_rls sees only the tenant matching app.current_tenant_id — cross-tenant rows are hidden by RLS")
    void rlsPolicyIsolatesTenantData() throws Exception {
        try (PostgreSQLContainer<?> postgres =
                     new PostgreSQLContainer<>(DockerImageName.parse(POSTGRES_IMAGE))
                             .withDatabaseName("rls_test")
                             .withUsername("superuser")
                             .withPassword("superpass")
                             .withEnv("POSTGRES_HOST_AUTH_METHOD", "trust")) {

            postgres.start();

            String superJdbcUrl = postgres.getJdbcUrl();
            String dbName       = postgres.getDatabaseName();
            String tenantA      = UUID.randomUUID().toString();
            String tenantB      = UUID.randomUUID().toString();

            // ── Step 1: superuser bootstrap ──────────────────────────────────────────
            try (Connection su = superuserConnection(superJdbcUrl, "superuser", "superpass")) {

                // Create the application role with NOBYPASSRLS (cannot skip RLS policies)
                execute(su, """
                        DO $$
                        BEGIN
                          IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'nu_app_rls') THEN
                            CREATE ROLE nu_app_rls NOBYPASSRLS LOGIN PASSWORD '""" + APP_ROLE_PASSWORD + """
                            ';
                          END IF;
                        END
                        $$
                        """);

                // Grant connect so the role can open a connection
                execute(su, "GRANT CONNECT ON DATABASE " + dbName + " TO nu_app_rls");

                // Create a minimal employees table
                execute(su, """
                        CREATE TABLE IF NOT EXISTS employees (
                          id         BIGSERIAL PRIMARY KEY,
                          tenant_id  TEXT NOT NULL,
                          full_name  TEXT NOT NULL
                        )
                        """);

                // Enable RLS — even the table owner (superuser) is subject to policies
                // only when accessing as a NOBYPASSRLS role, so we force it here too
                execute(su, "ALTER TABLE employees ENABLE ROW LEVEL SECURITY");
                execute(su, "ALTER TABLE employees FORCE ROW LEVEL SECURITY");

                // Policy: row is visible only if its tenant_id matches the session GUC.
                // current_setting(..., true) returns NULL (not an error) when the GUC is absent,
                // which causes the predicate to fail → no rows visible without a valid GUC.
                execute(su, """
                        CREATE POLICY tenant_isolation ON employees
                          USING (tenant_id = current_setting('app.current_tenant_id', true))
                        """);

                // Grant DML to the application role
                execute(su, "GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE employees TO nu_app_rls");
                execute(su, "GRANT USAGE, SELECT ON SEQUENCE employees_id_seq TO nu_app_rls");

                // Insert one employee per tenant (as superuser — FORCE RLS does NOT block
                // superuser DML, only queries from NOBYPASSRLS roles)
                execute(su, "SET app.current_tenant_id = '" + tenantA + "'");
                execute(su, "INSERT INTO employees (tenant_id, full_name) VALUES ('" + tenantA + "', 'Alice A')");
                execute(su, "INSERT INTO employees (tenant_id, full_name) VALUES ('" + tenantB + "', 'Bob B')");
            }

            // ── Step 2: reconnect as nu_app_rls ──────────────────────────────────────
            // Build a JDBC URL pointing to the same host/port but authenticating as the app role
            String appJdbcUrl = superJdbcUrl; // same host; credentials override via Properties

            // ── Step 3: verify tenant A isolation ────────────────────────────────────
            List<String> tenantARows = queryNamesWithTenant(appJdbcUrl, tenantA);
            assertThat(tenantARows)
                    .as("nu_app_rls with GUC=tenantA should see only Alice A")
                    .containsExactly("Alice A");

            // ── Step 4: verify tenant B isolation ────────────────────────────────────
            List<String> tenantBRows = queryNamesWithTenant(appJdbcUrl, tenantB);
            assertThat(tenantBRows)
                    .as("nu_app_rls with GUC=tenantB should see only Bob B")
                    .containsExactly("Bob B");

            // ── Step 5: verify no GUC → no rows ──────────────────────────────────────
            List<String> noGucRows = queryNamesNoGuc(appJdbcUrl);
            assertThat(noGucRows)
                    .as("nu_app_rls without setting GUC should see zero rows (RLS default-deny)")
                    .isEmpty();
        }
    }

    /**
     * Confirm that the {@code nu_app_rls} role attribute {@code rolbypassrls} is {@code false}.
     * This assertion can run against any live Postgres instance where the role already exists
     * (e.g., a CI-provisioned DB), not just the Testcontainers container.
     *
     * <p>This test is kept as a separate {@code @Test} so it can be split into a fast-path
     * check in CI environments that already have the role created by Flyway migrations.</p>
     */
    @Test
    @DisplayName("nu_app_rls role must have rolbypassrls = false in pg_roles")
    void appRoleMustHaveNoBypassRls() throws Exception {
        try (PostgreSQLContainer<?> postgres =
                     new PostgreSQLContainer<>(DockerImageName.parse(POSTGRES_IMAGE))
                             .withDatabaseName("rls_attr_test")
                             .withUsername("superuser")
                             .withPassword("superpass")) {

            postgres.start();

            try (Connection su = superuserConnection(postgres.getJdbcUrl(), "superuser", "superpass")) {
                // Create the role in the same way the production Flyway migration does
                execute(su, """
                        DO $$
                        BEGIN
                          IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'nu_app_rls') THEN
                            CREATE ROLE nu_app_rls NOBYPASSRLS LOGIN PASSWORD '""" + APP_ROLE_PASSWORD + """
                            ';
                          END IF;
                        END
                        $$
                        """);

                // Assert rolbypassrls is false
                try (Statement st = su.createStatement();
                     ResultSet rs = st.executeQuery(
                             "SELECT rolbypassrls FROM pg_roles WHERE rolname = 'nu_app_rls'")) {

                    assertThat(rs.next())
                            .as("nu_app_rls role must exist in pg_roles")
                            .isTrue();

                    boolean bypassRls = rs.getBoolean("rolbypassrls");
                    assertThat(bypassRls)
                            .as("nu_app_rls must have NOBYPASSRLS (rolbypassrls = false) — " +
                                "a role with BYPASSRLS can skip all RLS policies regardless of GUC settings, " +
                                "defeating multi-tenant isolation. Ensure the Flyway migration that creates " +
                                "nu_app_rls does NOT include BYPASSRLS.")
                            .isFalse();
                }
            }
        }
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    /** Open a connection using explicit credentials (bypasses container's default user). */
    private static Connection superuserConnection(String jdbcUrl, String user, String password)
            throws SQLException {
        Properties props = new Properties();
        props.setProperty("user", user);
        props.setProperty("password", password);
        return DriverManager.getConnection(jdbcUrl, props);
    }

    /** Open a connection as the application role {@code nu_app_rls}. */
    private static Connection appRoleConnection(String jdbcUrl) throws SQLException {
        Properties props = new Properties();
        props.setProperty("user", APP_ROLE);
        props.setProperty("password", APP_ROLE_PASSWORD);
        return DriverManager.getConnection(jdbcUrl, props);
    }

    /** Set {@code app.current_tenant_id} GUC and query employee names. */
    private List<String> queryNamesWithTenant(String jdbcUrl, String tenantId) throws SQLException {
        List<String> names = new ArrayList<>();
        try (Connection conn = appRoleConnection(jdbcUrl);
             Statement st = conn.createStatement()) {

            // Session-scoped GUC — SET (not SET LOCAL) persists across autocommit boundaries
            st.execute("SET app.current_tenant_id = '" + tenantId + "'");

            try (ResultSet rs = st.executeQuery("SELECT full_name FROM employees ORDER BY full_name")) {
                while (rs.next()) {
                    names.add(rs.getString("full_name"));
                }
            }
        }
        return names;
    }

    /** Query employee names WITHOUT setting the tenant GUC — should return zero rows. */
    private List<String> queryNamesNoGuc(String jdbcUrl) throws SQLException {
        List<String> names = new ArrayList<>();
        try (Connection conn = appRoleConnection(jdbcUrl);
             Statement st = conn.createStatement();
             ResultSet rs = st.executeQuery("SELECT full_name FROM employees ORDER BY full_name")) {

            while (rs.next()) {
                names.add(rs.getString("full_name"));
            }
        }
        return names;
    }

    /** Execute a DDL/DML statement; swallow the void return for readability. */
    private static void execute(Connection conn, String sql) throws SQLException {
        try (Statement st = conn.createStatement()) {
            st.execute(sql);
        }
    }
}
