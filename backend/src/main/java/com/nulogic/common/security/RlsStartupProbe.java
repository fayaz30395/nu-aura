package com.nulogic.common.security;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;

/**
 * Startup canary that verifies the strict tenant RLS policies installed by
 * {@code V177__strict_tenant_rls_policies.sql} and
 * {@code V254__enforce_runtime_rls_fail_closed.sql} are actually in force.
 *
 * <p>The probe acquires a fresh JDBC connection from the primary
 * {@link DataSource}, deliberately does <em>not</em> set
 * {@code app.current_tenant_id}, and runs
 * {@code EXISTS (... WHERE tenant_id IS NOT NULL)} canaries against every
 * public table and view with a UUID {@code tenant_id}. Global catalog rows with
 * {@code tenant_id IS NULL} are intentionally ignored; the canary only proves
 * tenant-owned rows are hidden without tenant context. If any tenant relation is
 * visible without tenant context a {@link IllegalStateException} is thrown when
 * {@code app.security.rls.probe.fail-on-bypass=true}, causing the application to
 * fail fast — better a boot failure than a silent cross-tenant data leak.</p>
 *
 * <p>The probe is skipped under the {@code test} profile (test fixtures
 * often run without RLS) and when the environment variable
 * {@code RLS_PROBE_SKIP=true} is set (escape hatch for local Flyway
 * bootstrap on a fresh database).</p>
 *
 * <p>Development may set {@code app.security.rls.probe.fail-on-bypass=false}
 * so contributors who point at a permissive local/migration DB account still
 * get a loud warning without blocking browser E2E startup. Production must
 * keep the default fail-closed behavior.</p>
 *
 * <p>Backlog reference: T1-01 in
 * {@code docs/architecture/improvement-backlog.md}.</p>
 */
@Component
@Profile("!test")
@Order(Integer.MIN_VALUE + 100)
@Slf4j
public class RlsStartupProbe implements ApplicationRunner {

    private static final String SKIP_ENV_VAR = "RLS_PROBE_SKIP";
    private static final String SKIP_SYS_PROP = "rls.probe.skip";
    private static final int MAX_FAILURES_IN_MESSAGE = 20;

    /**
     * Infrastructure tables that carry a {@code tenant_id} column for routing but are
     * NOT tenant-data tables and have no user/API read path. They are excluded from the
     * strict-policy assertion and the tenant-isolation canary because they are read
     * cross-tenant by trusted internal machinery, not by tenant requests.
     *
     * <p>{@code outbox_events} is the transactional-outbox queue: written by trusted
     * server code (with an explicit, correct {@code tenant_id}) inside the business
     * transaction, and polled across ALL tenants by {@code OutboxEventProcessor} on a
     * scheduler thread with no tenant context. Its relaxed RLS policy (see
     * {@code V311__outbox_events_infra_rls_policy.sql}) intentionally allows unset-GUC
     * reads so cross-tenant polling works; that would otherwise trip this fail-closed
     * canary. Tenant DATA tables are never added here.</p>
     */
    private static final java.util.Set<String> INFRA_EXCLUDED_TABLES = java.util.Set.of("outbox_events");

    private static final String ROLE_INSPECTION_SQL = """
            SELECT current_user,
                   COALESCE((SELECT rolsuper FROM pg_roles WHERE rolname = current_user), false) AS superuser,
                   COALESCE((SELECT rolbypassrls FROM pg_roles WHERE rolname = current_user), false) AS bypass_rls
            """;
    private static final String TENANT_TABLE_INSPECTION_SQL = """
            SELECT n.nspname,
                   c.relname,
                   c.relrowsecurity,
                   c.relforcerowsecurity,
                   pg_get_userbyid(c.relowner) = current_user AS current_user_owns_table,
                   EXISTS (
                       SELECT 1
                       FROM pg_policy p
                       WHERE p.polrelid = c.oid
                         AND p.polpermissive = false
                         AND COALESCE(pg_get_expr(p.polqual, p.polrelid), '') ILIKE '%app.current_tenant_id%'
                         AND COALESCE(pg_get_expr(p.polwithcheck, p.polrelid), '') ILIKE '%app.current_tenant_id%'
                   ) AS has_context_required_policy
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            JOIN information_schema.columns col
              ON col.table_schema = n.nspname
             AND col.table_name = c.relname
             AND col.column_name = 'tenant_id'
             AND col.data_type = 'uuid'
            WHERE n.nspname = 'public'
              AND c.relkind IN ('r', 'p')
            ORDER BY n.nspname, c.relname
            """;
    private static final String TENANT_VIEW_INSPECTION_SQL = """
            SELECT n.nspname,
                   c.relname,
                   COALESCE(c.reloptions @> ARRAY['security_invoker=true']::text[], false) AS security_invoker
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            JOIN information_schema.columns col
              ON col.table_schema = n.nspname
             AND col.table_name = c.relname
             AND col.column_name = 'tenant_id'
             AND col.data_type = 'uuid'
            WHERE n.nspname = 'public'
              AND c.relkind = 'v'
            ORDER BY n.nspname, c.relname
            """;

    private final DataSource dataSource;
    private final boolean failOnBypass;
    private final boolean allowBootstrapSkip;

    public RlsStartupProbe(
            DataSource dataSource,
            @Value("${app.security.rls.probe.fail-on-bypass:true}") boolean failOnBypass,
            @Value("${app.security.rls.probe.allow-bootstrap-skip:false}") boolean allowBootstrapSkip) {
        this.dataSource = dataSource;
        this.failOnBypass = failOnBypass;
        this.allowBootstrapSkip = allowBootstrapSkip;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (isSkipRequested()) {
            if (!isBootstrapSkipAllowedForSkipRequest()) {
                failStartup("RLS startup probe skip requested, but bootstrap skips are disabled. "
                        + "Unset RLS_PROBE_SKIP/rls.probe.skip for production startup.");
            }
            log.warn("RLS startup probe skipped (RLS_PROBE_SKIP set). "
                    + "Strict-policy regressions will NOT be caught at boot.");
            return;
        }

        try (Connection conn = dataSource.getConnection()) {
            // Make absolutely sure no inherited session var is in play.
            try (PreparedStatement reset = conn.prepareStatement("RESET app.current_tenant_id")) {
                reset.execute();
            }

            RoleInspection role = inspectCurrentRole(conn);
            assertCurrentRoleCannotBypassRls(role);

            List<TenantTableInspection> tenantTables = inspectTenantTables(conn);
            if (tenantTables.isEmpty()) {
                if (!isBootstrapSkipAllowedForMissingSchema()) {
                    failStartup("RLS startup probe found no public UUID tenant_id tables. "
                            + "Production startup cannot prove tenant isolation is active.");
                }
                log.warn("RLS startup probe found no public UUID tenant_id tables. "
                        + "Skipping canary — re-run after first migration completes.");
                return;
            }

            assertTenantTablesHaveStrictRls(role, tenantTables);
            List<TenantViewInspection> tenantViews = inspectTenantViews(conn);
            assertTenantViewsUseSecurityInvoker(tenantViews);

            List<TableVisibility> visibleTables = findVisibleTenantRows(conn, tenantTables);
            visibleTables.addAll(findVisibleTenantViewRows(conn, tenantViews));
            if (!visibleTables.isEmpty()) {
                String msg = String.format(
                        "RLS bypass detected — strict policy not active. "
                                + "Connection without app.current_tenant_id saw tenant rows in %d relation(s): %s. "
                                + "Verify V254__enforce_runtime_rls_fail_closed.sql and "
                                + "V256__force_security_invoker_on_tenant_views.sql ran, and the app DB "
                                + "user does NOT have BYPASSRLS.",
                        visibleTables.size(), summarize(visibleTables));
                handleBypassDetected(msg);
                return;
            }

            log.info("RLS startup probe passed: 0 tenant-owned rows visible across {} tenant tables and {} tenant views "
                            + "without tenant context.",
                    tenantTables.size(), tenantViews.size());
        } catch (SQLException ex) {
            handleBypassDetected("RLS startup probe failed before tenant isolation could be verified "
                    + "(SQLState=" + ex.getSQLState() + ")");
            return;
        }
    }

    private void assertCurrentRoleCannotBypassRls(RoleInspection role) {
        StringBuilder bypassReasons = new StringBuilder();
        if (role.superuser()) {
            bypassReasons.append("role has SUPERUSER");
        }
        if (role.bypassRls()) {
            if (!bypassReasons.isEmpty()) {
                bypassReasons.append("; ");
            }
            bypassReasons.append("role has BYPASSRLS");
        }

        if (!bypassReasons.isEmpty()) {
            String msg = String.format(
                    "RLS bypass role detected — database user '%s' can bypass tenant isolation (%s). "
                            + "Use a dedicated runtime role without SUPERUSER/BYPASSRLS. "
                            + "SuperAdmin bypass must remain application-layer only.",
                    role.userName(), bypassReasons);
            handleBypassDetected(msg);
        }
    }

    private RoleInspection inspectCurrentRole(Connection conn) throws SQLException {
        try (PreparedStatement ps = conn.prepareStatement(ROLE_INSPECTION_SQL);
             ResultSet rs = ps.executeQuery()) {
            if (!rs.next()) {
                throw new SQLException("RLS startup probe could not inspect current database role");
            }
            return new RoleInspection(
                    rs.getString(1),
                    rs.getBoolean(2),
                    rs.getBoolean(3)
            );
        }
    }

    private List<TenantTableInspection> inspectTenantTables(Connection conn) throws SQLException {
        try (PreparedStatement ps = conn.prepareStatement(TENANT_TABLE_INSPECTION_SQL);
             ResultSet rs = ps.executeQuery()) {
            List<TenantTableInspection> tables = new java.util.ArrayList<>();
            while (rs.next()) {
                String schema = rs.getString(1);
                String table = rs.getString(2);
                // Skip infrastructure queues (e.g. outbox_events) — they carry a
                // tenant_id for routing but are read cross-tenant by trusted internal
                // machinery and have no user/API read path. See INFRA_EXCLUDED_TABLES.
                if ("public".equals(schema) && INFRA_EXCLUDED_TABLES.contains(table)) {
                    log.info("RLS startup probe: skipping infrastructure table {}.{} "
                            + "(no tenant-user read path; polled cross-tenant by design)", schema, table);
                    continue;
                }
                tables.add(new TenantTableInspection(
                        schema,
                        table,
                        rs.getBoolean(3),
                        rs.getBoolean(4),
                        rs.getBoolean(5),
                        rs.getBoolean(6)
                ));
            }
            return tables;
        }
    }

    private List<TenantViewInspection> inspectTenantViews(Connection conn) throws SQLException {
        try (PreparedStatement ps = conn.prepareStatement(TENANT_VIEW_INSPECTION_SQL);
             ResultSet rs = ps.executeQuery()) {
            List<TenantViewInspection> views = new java.util.ArrayList<>();
            while (rs.next()) {
                views.add(new TenantViewInspection(
                        rs.getString(1),
                        rs.getString(2),
                        rs.getBoolean(3)
                ));
            }
            return views;
        }
    }

    private void assertTenantTablesHaveStrictRls(RoleInspection role, List<TenantTableInspection> tables) {
        List<String> gaps = new java.util.ArrayList<>();
        for (TenantTableInspection table : tables) {
            if (!table.rlsEnabled()) {
                gaps.add(table.qualifiedName() + " does not have RLS enabled");
            }
            if (!table.rlsForced()) {
                String ownerContext = table.currentUserOwnsTable()
                        ? "database user '" + role.userName() + "' owns this table; "
                        : "";
                gaps.add(ownerContext + table.qualifiedName()
                        + " does not have FORCE ROW LEVEL SECURITY enabled");
            }
            if (!table.contextRequiredPolicyPresent()) {
                gaps.add(table.qualifiedName()
                        + " is missing a restrictive app.current_tenant_id policy");
            }
        }

        if (!gaps.isEmpty()) {
            handleBypassDetected("RLS startup probe found strict-policy gaps in tenant tables: "
                    + summarize(gaps));
        }
    }

    private void assertTenantViewsUseSecurityInvoker(List<TenantViewInspection> views) {
        List<String> gaps = new java.util.ArrayList<>();
        for (TenantViewInspection view : views) {
            if (!view.securityInvoker()) {
                gaps.add(view.qualifiedName() + " is not SECURITY INVOKER");
            }
        }

        if (!gaps.isEmpty()) {
            handleBypassDetected("RLS startup probe found tenant views that can bypass underlying table RLS: "
                    + summarize(gaps));
        }
    }

    private List<TableVisibility> findVisibleTenantRows(Connection conn, List<TenantTableInspection> tables)
            throws SQLException {
        return findVisibleRowsWithoutTenant(conn, tables.stream()
                .map(table -> new TenantRelation(table.schemaName(), table.tableName(), table.qualifiedName()))
                .toList());
    }

    private List<TableVisibility> findVisibleTenantViewRows(Connection conn, List<TenantViewInspection> views)
            throws SQLException {
        return findVisibleRowsWithoutTenant(conn, views.stream()
                .map(view -> new TenantRelation(view.schemaName(), view.viewName(), view.qualifiedName()))
                .toList());
    }

    private List<TableVisibility> findVisibleRowsWithoutTenant(Connection conn, List<TenantRelation> relations)
            throws SQLException {
        List<TableVisibility> visible = new java.util.ArrayList<>();
        if (relations.isEmpty()) {
            return visible;
        }

        StringBuilder sql = new StringBuilder();
        for (int i = 0; i < relations.size(); i++) {
            TenantRelation relation = relations.get(i);
            if (i > 0) {
                sql.append(" UNION ALL ");
            }
            sql.append("SELECT ")
                    .append(sqlStringLiteral(relation.qualifiedName()))
                    .append(" AS relation_name, CASE WHEN EXISTS (SELECT 1 FROM ")
                    .append(quoteIdentifier(relation.schemaName()))
                    .append(".")
                    .append(quoteIdentifier(relation.relationName()))
                    .append(" WHERE tenant_id IS NOT NULL LIMIT 1) THEN 1 ELSE 0 END AS visible_rows");
        }

        try (PreparedStatement ps = conn.prepareStatement(sql.toString())) {
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    long rows = rs.getLong(2);
                    if (rows > 0) {
                        visible.add(new TableVisibility(rs.getString(1), rows));
                    }
                }
            }
        }
        return visible;
    }

    private String quoteIdentifier(String identifier) {
        return "\"" + identifier.replace("\"", "\"\"") + "\"";
    }

    private String sqlStringLiteral(String value) {
        return "'" + value.replace("'", "''") + "'";
    }

    private void handleBypassDetected(String msg) {
        log.error(msg);
        if (failOnBypass) {
            throw new IllegalStateException(msg);
        }
        log.warn("RLS startup probe is configured fail-open for this profile; continuing startup. "
                + "Do not use this configuration for production.");
    }

    private void failStartup(String msg) {
        log.error(msg);
        throw new IllegalStateException(msg);
    }

    private boolean isSkipRequested() {
        String env = System.getenv(SKIP_ENV_VAR);
        if (env != null && "true".equalsIgnoreCase(env.trim())) {
            return true;
        }
        String prop = System.getProperty(SKIP_SYS_PROP);
        return prop != null && "true".equalsIgnoreCase(prop.trim());
    }

    private boolean isBootstrapSkipAllowedForSkipRequest() {
        return allowBootstrapSkip && !failOnBypass;
    }

    private boolean isBootstrapSkipAllowedForMissingSchema() {
        return allowBootstrapSkip && !failOnBypass;
    }

    private String summarize(List<?> values) {
        if (values.size() <= MAX_FAILURES_IN_MESSAGE) {
            return values.toString();
        }
        return values.subList(0, MAX_FAILURES_IN_MESSAGE) + " ... +" + (values.size() - MAX_FAILURES_IN_MESSAGE)
                + " more";
    }

    private record RoleInspection(String userName, boolean superuser, boolean bypassRls) {
    }

    private record TenantTableInspection(
            String schemaName,
            String tableName,
            boolean rlsEnabled,
            boolean rlsForced,
            boolean currentUserOwnsTable,
            boolean contextRequiredPolicyPresent) {

        String qualifiedName() {
            return schemaName + "." + tableName;
        }
    }

    private record TenantViewInspection(
            String schemaName,
            String viewName,
            boolean securityInvoker) {

        String qualifiedName() {
            return schemaName + "." + viewName;
        }
    }

    private record TenantRelation(String schemaName, String relationName, String qualifiedName) {
    }

    private record TableVisibility(String qualifiedName, long visibleRows) {
        @Override
        public String toString() {
            return qualifiedName + "=" + visibleRows;
        }
    }
}
