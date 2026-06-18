package com.nulogic.architecture;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import java.util.Properties;
import java.util.UUID;
import java.util.regex.Pattern;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Regression guard for the cross-tenant RLS leak found in the 2026-06-07 completeness sweep.
 *
 * <p><strong>The bug.</strong> {@code EmployeeService}, {@code ExpenseClaimService}, and
 * {@code MileageService} each open a raw JDBC {@code ConnectionCallback} to allocate a
 * monthly sequence number, and set the RLS GUC with
 * {@code set_config('app.current_tenant_id', ?, false)}. The third argument {@code false}
 * makes the setting <em>session-scoped</em>: it is NOT reset when the transaction ends, so the
 * tenant id persists on the HikariCP/pgbouncer connection after the request returns. A later
 * request that reuses that pooled connection before establishing its own tenant context can read
 * another tenant's rows — defeating RLS. The correct path,
 * {@code TenantRlsTransactionManager}, uses {@code set_config(..., true)} (transaction-local,
 * auto-reset on commit/rollback).
 *
 * <p>The 2026-06-04 security audit asserted RLS was uniformly {@code SET LOCAL}; these three
 * services were missed. This test scans production source so the session-scoped form can never be
 * reintroduced for the tenant GUC. It deliberately reads source text (not bytecode) because the
 * offending value lives in a compile-time-inlined {@code String} constant that ArchUnit cannot see.
 */
@DisplayName("RLS tenant GUC must always be transaction-local (set_config ... , true)")
public class RlsTenantGucScopeTest {

    /** Matches a session-scoped set of the tenant GUC: set_config('app.current_tenant_id', ?, false). */
    private static final Pattern SESSION_SCOPED_TENANT_GUC = Pattern.compile(
            "set_config\\s*\\(\\s*'app\\.current_tenant_id'\\s*,[^)]*,\\s*false\\s*\\)",
            Pattern.CASE_INSENSITIVE);

    /**
     * The one legitimate session-scoped use. {@code TenantAwareDataSource} sets the GUC
     * session-scoped on purpose — it covers JDBC connections obtained OUTSIDE a JPA transaction
     * (where transaction-local would not persist across statements) — and it is leak-safe because
     * it RESETs the GUC on every {@code getConnection()} checkout before re-setting it. Any OTHER
     * session-scoped set is a leak (set-and-forget on a pooled connection).
     */
    private static final List<String> ALLOWED = List.of("TenantAwareDataSourceConfig.java");

    @Test
    @DisplayName("no production Java source sets app.current_tenant_id session-scoped (third arg false)")
    void noSessionScopedTenantGuc() {
        Path sourceRoot = Path.of("src", "main", "java");
        assertThat(Files.isDirectory(sourceRoot))
                .as("expected to run from the backend module root with %s present", sourceRoot.toAbsolutePath())
                .isTrue();

        List<String> offenders;
        try (Stream<Path> javaFiles = Files.walk(sourceRoot)) {
            offenders = javaFiles
                    .filter(p -> p.toString().endsWith(".java"))
                    .filter(p -> !ALLOWED.contains(p.getFileName().toString()))
                    .filter(RlsTenantGucScopeTest::containsSessionScopedTenantGuc)
                    .map(p -> sourceRoot.relativize(p).toString())
                    .sorted()
                    .toList();
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to scan production source for RLS GUC scope", e);
        }

        assertThat(offenders)
                .as("Found session-scoped set_config('app.current_tenant_id', ?, false) — this leaks the "
                        + "tenant id onto the pooled connection (cross-tenant RLS leak). Use the "
                        + "transaction-local form set_config('app.current_tenant_id', ?, true), matching "
                        + "TenantRlsTransactionManager. Offending files: %s", offenders)
                .isEmpty();
    }

    private static boolean containsSessionScopedTenantGuc(Path file) {
        try {
            return SESSION_SCOPED_TENANT_GUC.matcher(Files.readString(file)).find();
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to read " + file, e);
        }
    }

    // ── NOBYPASSRLS live integration test ─────────────────────────────────────

    private static final String POSTGRES_IMAGE    = "postgres:16-alpine";
    private static final String APP_ROLE          = "nu_app_rls";
    private static final String APP_ROLE_PASSWORD = "test_rls_pw";

    /**
     * Verifies that the {@code nu_app_rls} role enforces tenant isolation through PostgreSQL RLS
     * when accessed with NOBYPASSRLS.
     *
     * <p>Steps:
     * <ol>
     *   <li>Start a fresh Postgres 16 container (superuser).</li>
     *   <li>Create {@code nu_app_rls} with {@code NOBYPASSRLS LOGIN}.</li>
     *   <li>Create a minimal {@code employees} table with a {@code tenant_id} column.</li>
     *   <li>Enable and FORCE RLS; add a policy that filters by
     *       {@code current_setting('app.current_tenant_id', true)}.</li>
     *   <li>Insert two rows — one per tenant — as superuser.</li>
     *   <li>Reconnect as {@code nu_app_rls}; SET LOCAL the GUC to tenant A
     *       → assert only tenant A's row is visible.</li>
     *   <li>Same for tenant B → assert only tenant B's row is visible.</li>
     *   <li>Without setting the GUC → assert zero rows (default-deny).</li>
     * </ol>
     *
     * <p>Requires a running Docker daemon. The test is skipped automatically when Docker is
     * unavailable because {@link PostgreSQLContainer#start()} throws and the test is marked
     * with {@code assumeTrue} on Docker availability.
     */
    @Test
    @DisplayName("nu_app_rls (NOBYPASSRLS) sees only the tenant matching app.current_tenant_id — cross-tenant rows hidden by RLS")
    void noBypassRlsRoleEnforcesTenantIsolation() throws Exception {
        boolean dockerAvailable = isDockerAvailable();
        org.junit.jupiter.api.Assumptions.assumeTrue(dockerAvailable,
                "Docker not available — skipping NOBYPASSRLS live integration test. " +
                "Run with a Docker daemon present, or set DOCKER_AVAILABLE=true in CI.");

        try (PostgreSQLContainer<?> postgres =
                     new PostgreSQLContainer<>(DockerImageName.parse(POSTGRES_IMAGE))
                             .withDatabaseName("rls_scope_test")
                             .withUsername("superuser")
                             .withPassword("superpass")) {

            postgres.start();

            String jdbcUrl = postgres.getJdbcUrl();
            String dbName  = postgres.getDatabaseName();
            String tenantA = UUID.randomUUID().toString();
            String tenantB = UUID.randomUUID().toString();

            // ── superuser bootstrap ───────────────────────────────────────────
            try (Connection su = openConnection(jdbcUrl, "superuser", "superpass")) {

                // Create nu_app_rls with NOBYPASSRLS so it cannot skip RLS policies
                runSql(su, """
                        DO $$
                        BEGIN
                          IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'nu_app_rls') THEN
                            CREATE ROLE nu_app_rls NOBYPASSRLS LOGIN PASSWORD '""" + APP_ROLE_PASSWORD + """
                            ';
                          END IF;
                        END
                        $$
                        """);

                runSql(su, "GRANT CONNECT ON DATABASE " + dbName + " TO nu_app_rls");
                runSql(su, "GRANT USAGE ON SCHEMA public TO nu_app_rls");

                runSql(su, """
                        CREATE TABLE IF NOT EXISTS employees (
                          id        BIGSERIAL PRIMARY KEY,
                          tenant_id TEXT NOT NULL,
                          full_name TEXT NOT NULL
                        )
                        """);

                // Enable RLS and FORCE it so even the table owner is subject to policies
                runSql(su, "ALTER TABLE employees ENABLE ROW LEVEL SECURITY");
                runSql(su, "ALTER TABLE employees FORCE ROW LEVEL SECURITY");

                // Policy: visible only when tenant_id matches the transaction-local GUC
                runSql(su, """
                        CREATE POLICY tenant_isolation ON employees
                          USING (tenant_id = current_setting('app.current_tenant_id', true))
                        """);

                runSql(su, "GRANT SELECT, INSERT ON TABLE employees TO nu_app_rls");
                runSql(su, "GRANT USAGE, SELECT ON SEQUENCE employees_id_seq TO nu_app_rls");

                // Insert seed rows as superuser (FORCE RLS does not block superuser INSERT)
                runSql(su, "INSERT INTO employees (tenant_id, full_name) VALUES ('" + tenantA + "', 'Alice A')");
                runSql(su, "INSERT INTO employees (tenant_id, full_name) VALUES ('" + tenantB + "', 'Bob B')");

                // Verify nu_app_rls has rolbypassrls = false
                try (Statement st = su.createStatement();
                     ResultSet rs = st.executeQuery(
                             "SELECT rolbypassrls FROM pg_roles WHERE rolname = 'nu_app_rls'")) {
                    assertThat(rs.next()).as("nu_app_rls role must exist in pg_roles").isTrue();
                    assertThat(rs.getBoolean("rolbypassrls"))
                            .as("nu_app_rls must have NOBYPASSRLS (rolbypassrls = false)")
                            .isFalse();
                }
            }

            // ── reconnect as nu_app_rls and verify isolation ──────────────────

            // Tenant A: only Alice A visible
            List<String> tenantARows = queryNamesForTenant(jdbcUrl, tenantA);
            assertThat(tenantARows)
                    .as("nu_app_rls with GUC=tenantA must see only Alice A; tenant B rows must be hidden by RLS")
                    .containsExactly("Alice A");

            // Tenant B: only Bob B visible
            List<String> tenantBRows = queryNamesForTenant(jdbcUrl, tenantB);
            assertThat(tenantBRows)
                    .as("nu_app_rls with GUC=tenantB must see only Bob B; tenant A rows must be hidden by RLS")
                    .containsExactly("Bob B");

            // No GUC set: default-deny → zero rows
            List<String> noGucRows = queryNamesWithoutGuc(jdbcUrl);
            assertThat(noGucRows)
                    .as("nu_app_rls without setting app.current_tenant_id must see zero rows (RLS default-deny)")
                    .isEmpty();
        }
    }

    private static boolean isDockerAvailable() {
        try {
            Process process = new ProcessBuilder("docker", "info")
                    .redirectErrorStream(true)
                    .start();
            int exit = process.waitFor();
            return exit == 0 || "true".equalsIgnoreCase(System.getenv("DOCKER_AVAILABLE"));
        } catch (Exception e) {
            return "true".equalsIgnoreCase(System.getenv("DOCKER_AVAILABLE"));
        }
    }

    private static Connection openConnection(String jdbcUrl, String user, String password)
            throws SQLException {
        Properties props = new Properties();
        props.setProperty("user", user);
        props.setProperty("password", password);
        return DriverManager.getConnection(jdbcUrl, props);
    }

    private static void runSql(Connection conn, String sql) throws SQLException {
        try (Statement st = conn.createStatement()) {
            st.execute(sql);
        }
    }

    /**
     * Query employee names by switching to the {@code nu_app_rls} role via {@code SET ROLE}
     * within the superuser connection, then setting {@code app.current_tenant_id} transaction-locally.
     * Using {@code SET ROLE} (rather than a new TCP connection authenticated as the role) avoids
     * pg_hba.conf configuration concerns in the test container while still exercising the same
     * NOBYPASSRLS enforcement path: PostgreSQL evaluates RLS policies against the current role,
     * not the authenticated user.
     */
    /**
     * Query employee names by switching to the {@code nu_app_rls} role via {@code SET ROLE}
     * within the superuser connection, then setting {@code app.current_tenant_id} transaction-locally.
     * Autocommit is disabled so that {@code SET LOCAL} (transaction-local GUC) persists until the
     * explicit rollback at the end of the method — matching the production transaction lifecycle.
     */
    private List<String> queryNamesForTenant(String jdbcUrl, String tenantId) throws SQLException {
        List<String> names = new ArrayList<>();
        try (Connection conn = openConnection(jdbcUrl, "superuser", "superpass");
             Statement st = conn.createStatement()) {
            // Disable autocommit — SET LOCAL only persists within a transaction
            conn.setAutoCommit(false);
            // Switch to the application role — RLS is now enforced with NOBYPASSRLS semantics
            st.execute("SET ROLE nu_app_rls");
            // SET LOCAL — transaction-local GUC, auto-cleared on rollback (production pattern)
            st.execute("SET LOCAL app.current_tenant_id = '" + tenantId + "'");
            try (ResultSet rs = st.executeQuery("SELECT full_name FROM employees ORDER BY full_name")) {
                while (rs.next()) {
                    names.add(rs.getString("full_name"));
                }
            }
            conn.rollback(); // clean up — no data modification was made
        }
        return names;
    }

    private List<String> queryNamesWithoutGuc(String jdbcUrl) throws SQLException {
        List<String> names = new ArrayList<>();
        try (Connection conn = openConnection(jdbcUrl, "superuser", "superpass");
             Statement st = conn.createStatement()) {
            conn.setAutoCommit(false);
            // Switch to app role without setting the GUC — RLS default-deny should yield zero rows
            st.execute("SET ROLE nu_app_rls");
            try (ResultSet rs = st.executeQuery("SELECT full_name FROM employees ORDER BY full_name")) {
                while (rs.next()) {
                    names.add(rs.getString("full_name"));
                }
            }
            conn.rollback();
        }
        return names;
    }
}
