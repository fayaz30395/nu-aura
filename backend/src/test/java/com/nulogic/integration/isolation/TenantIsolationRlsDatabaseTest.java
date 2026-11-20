package com.nulogic.integration.isolation;

import com.nulogic.config.AbstractTenantIsolationIntegrationTest;
import com.nulogic.integration.isolation.TwoTenantFixture.Tenant;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Savepoint;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;
import java.util.UUID;

import static com.nulogic.integration.isolation.TwoTenantFixture.CONTRACT;
import static com.nulogic.integration.isolation.TwoTenantFixture.CONTRACT_VERSION;
import static org.assertj.core.api.Assertions.assertThat;

/**
 * RLS proven at the database, as the runtime role {@code nu_app_rls}, across EVERY table that has
 * a {@code tenant_id} column (introspected, not hand-listed). Each generic check is paired with a
 * negative control showing the same check does detect a leak when one exists.
 */
@DisplayName("Tenant isolation: Postgres RLS as nu_app_rls across all tenant tables")
class TenantIsolationRlsDatabaseTest extends AbstractTenantIsolationIntegrationTest {

    /** outbox_events: V311 infra policy — readable with NO tenant GUC (poller) and WITH CHECK (true). By design. */
    private static final Set<String> INFRA_TABLES = Set.of("outbox_events");

    /**
     * Tables with neither tenant_id nor RLS (child/join/infra tables relying on the parent row's
     * RLS + application filters). Reported as a finding; pinned so any new one gets reviewed.
     */
    private static final Set<String> KNOWN_TABLES_WITHOUT_RLS = Set.of(
            "announcement_target_departments", "announcement_target_employees", "api_key_scopes",
            "benefit_claim_documents", "failed_kafka_events", "flyway_schema_history", "notification_template_channels",
            "shedlock", "user_app_direct_permissions", "user_app_roles", "user_notification_quiet_days", "webhook_events");

    private static final String TENANT_TABLES = """
            SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
              AND EXISTS (SELECT 1 FROM information_schema.columns ic WHERE ic.table_schema = 'public'
                          AND ic.table_name = c.relname AND ic.column_name = 'tenant_id')
            ORDER BY 1""";

    private static List<String> tenantTables() {
        return superuserJdbc().queryForList(TENANT_TABLES, String.class);
    }

    @Test
    @DisplayName("every tenant_id table has RLS enabled, FORCED and at least one policy")
    void everyTenantTableIsProtected() {
        List<Map<String, Object>> rows = superuserJdbc().queryForList("""
                SELECT c.relname, c.relrowsecurity AS enabled, c.relforcerowsecurity AS forced,
                       (SELECT count(*) FROM pg_policies p WHERE p.schemaname = 'public' AND p.tablename = c.relname) AS policies
                FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
                  AND EXISTS (SELECT 1 FROM information_schema.columns ic WHERE ic.table_schema = 'public'
                              AND ic.table_name = c.relname AND ic.column_name = 'tenant_id')""");
        assertThat(rows).as("tenant tables found").hasSizeGreaterThan(300);
        List<String> unprotected = rows.stream()
                .filter(r -> !Boolean.TRUE.equals(r.get("enabled")) || !Boolean.TRUE.equals(r.get("forced"))
                        || ((Number) r.get("policies")).intValue() == 0)
                .map(r -> r.get("relname") + " " + r).toList();
        assertThat(unprotected).isEmpty();
    }

    @Test
    @DisplayName("FINDING inventory: tables without tenant_id AND without RLS match the reviewed list")
    void tablesWithoutRlsAreTheReviewedSet() {
        List<String> noRls = superuserJdbc().queryForList("""
                SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND NOT c.relrowsecurity ORDER BY 1""", String.class);
        assertThat(new TreeSet<>(noRls)).isEqualTo(new TreeSet<>(KNOWN_TABLES_WITHOUT_RLS));
    }

    @Test
    @DisplayName("SELECT: with GUC=A no table shows a row of any other tenant (and vice versa for B)")
    void noForeignRowsVisible() throws SQLException {
        long tablesWithForeignData = superuserJdbc().queryForList(TENANT_TABLES, String.class).stream()
                .filter(t -> superuserJdbc().queryForObject("SELECT count(*) FROM " + t
                        + " WHERE tenant_id IS NOT NULL AND tenant_id <> ?", Long.class, Tenant.A.id()) > 0)
                .count();
        assertThat(tablesWithForeignData).as("non-vacuous: superuser sees foreign rows in many tables").isGreaterThan(30);
        for (Tenant t : Tenant.values()) {
            assertThat(foreignRowsVisible(tenantTables(), t)).as("tables leaking to %s", t).isEmpty();
        }
    }

    @Test
    @DisplayName("NEGATIVE CONTROL: the foreign-row checker flags a table whose policy is USING (true)")
    void checkerDetectsAPermissivePolicy() throws SQLException {
        JdbcTemplate su = superuserJdbc();
        su.execute("DROP TABLE IF EXISTS iso_leak_probe");
        su.execute("CREATE TABLE iso_leak_probe (id uuid PRIMARY KEY, tenant_id uuid NOT NULL)");
        try {
            su.execute("ALTER TABLE iso_leak_probe ENABLE ROW LEVEL SECURITY");
            su.execute("ALTER TABLE iso_leak_probe FORCE ROW LEVEL SECURITY");
            su.execute("CREATE POLICY leaky ON iso_leak_probe USING (true)");
            su.execute("GRANT SELECT ON iso_leak_probe TO " + APP_ROLE);
            su.update("INSERT INTO iso_leak_probe VALUES (gen_random_uuid(), ?), (gen_random_uuid(), ?)",
                    Tenant.A.id(), Tenant.B.id());
            assertThat(foreignRowsVisible(List.of("iso_leak_probe"), Tenant.A)).containsKey("iso_leak_probe");
        } finally {
            su.execute("DROP TABLE iso_leak_probe");
        }
    }

    @Test
    @DisplayName("NEGATIVE CONTROL: the superuser (RLS bypass) sees both tenants; nu_app_rls without GUC sees none")
    void bypassSeesEverythingRuntimeRoleSeesNothingWithoutGuc() throws SQLException {
        Map<String, Object> su = superuserJdbc().queryForMap("SELECT count(*) FILTER (WHERE tenant_id = ?) AS a, "
                + "count(*) FILTER (WHERE tenant_id = ?) AS b FROM employees", Tenant.A.id(), Tenant.B.id());
        assertThat(((Number) su.get("a")).longValue()).isPositive();
        assertThat(((Number) su.get("b")).longValue()).isPositive();
        try (Connection c = appRoleConnection(); Statement s = c.createStatement();
             ResultSet rs = s.executeQuery("SELECT count(*) FROM employees")) {
            rs.next();
            assertThat(rs.getLong(1)).isZero();
        }
    }

    @Test
    @DisplayName("GUC unset or empty: zero tenant rows in every table (fail closed), except the documented outbox")
    void missingTenantContextFailsClosed() throws SQLException {
        for (String guc : new String[]{null, ""}) {
            Map<String, Long> visible = new TreeMap<>();
            try (Connection c = appRoleConnection()) {
                if (guc != null) {
                    setGuc(c, guc);
                }
                for (String t : tenantTables()) {
                    long n = count(c, "SELECT count(*) FROM " + t + " WHERE tenant_id IS NOT NULL");
                    if (n > 0) {
                        visible.put(t, n);
                    }
                }
            }
            assertThat(visible.keySet()).as("tables readable without tenant context (guc=%s): %s", guc, visible)
                    .isSubsetOf(INFRA_TABLES);
        }
    }

    @Test
    @DisplayName("UPDATE/DELETE with GUC=A touch zero rows of other tenants in every table")
    void writesCannotReachForeignRows() throws SQLException {
        Map<String, Integer> touched = new TreeMap<>();
        try (Connection c = appRoleConnection()) {
            c.setAutoCommit(false);
            setGuc(c, Tenant.A.id().toString());
            for (String t : tenantTables()) {
                String foreign = " WHERE tenant_id IS NOT NULL AND tenant_id <> '" + Tenant.A.id() + "'";
                Savepoint sp = c.setSavepoint();
                try (Statement s = c.createStatement()) {
                    int u = s.executeUpdate("UPDATE " + t + " SET tenant_id = tenant_id" + foreign);
                    int d = s.executeUpdate("DELETE FROM " + t + foreign);
                    if (u + d > 0) {
                        touched.put(t, u + d);
                    }
                } finally {
                    c.rollback(sp);
                }
            }
            c.rollback();
        }
        assertThat(touched).isEmpty();
    }

    @Test
    @DisplayName("INSERT: WITH CHECK rejects tenant_id=B under GUC=A in every table; tenant_id=A is never an RLS error")
    void withCheckRejectsForeignTenantInserts() throws SQLException {
        Map<String, String> foreignAccepted = new TreeMap<>();
        Map<String, String> ownRejectedByRls = new TreeMap<>();
        try (Connection c = appRoleConnection()) {
            c.setAutoCommit(false);
            setGuc(c, Tenant.A.id().toString());
            for (String t : tenantTables()) {
                String b = tryInsertTenantOnly(c, t, Tenant.B.id());
                if (!b.startsWith("RLS")) {
                    foreignAccepted.put(t, b);
                }
                String a = tryInsertTenantOnly(c, t, Tenant.A.id());
                if (a.startsWith("RLS")) {
                    ownRejectedByRls.put(t, a);
                }
            }
            c.rollback();
        }
        assertThat(ownRejectedByRls).as("positive control: own-tenant insert must pass RLS").isEmpty();
        assertThat(foreignAccepted.keySet()).as("WITH CHECK missing: %s", foreignAccepted).isSubsetOf(INFRA_TABLES);
    }

    @Test
    @DisplayName("UPDATE cannot re-home an own row into the other tenant (WITH CHECK on UPDATE)")
    void updateCannotMoveRowAcrossTenants() throws SQLException {
        List<String> moved = new ArrayList<>();
        try (Connection c = appRoleConnection()) {
            c.setAutoCommit(false);
            setGuc(c, Tenant.A.id().toString());
            for (TenantResourceCatalog.ApiResource r : TenantResourceCatalog.RESOURCES) {
                Savepoint sp = c.setSavepoint();
                try (PreparedStatement ps = c.prepareStatement("UPDATE " + r.table() + " SET tenant_id = ? WHERE id = ?")) {
                    ps.setObject(1, Tenant.B.id());
                    ps.setObject(2, r.id(Tenant.A));
                    moved.add(r.table() + " updated " + ps.executeUpdate());
                } catch (SQLException e) {
                    if (!isRlsViolation(e)) {
                        moved.add(r.table() + " " + e.getSQLState() + " " + e.getMessage());
                    }
                } finally {
                    c.rollback(sp);
                }
            }
            c.rollback();
        }
        assertThat(moved).isEmpty();
    }

    @Test
    @DisplayName("REGRESSION V356 contract_versions (no tenant_id): another tenant's version history is invisible and unwritable")
    void contractVersionsAreIsolatedThroughTheirContract() throws SQLException {
        UUID bVersion = Tenant.B.id(CONTRACT_VERSION);
        try (Connection c = appRoleConnection()) {
            c.setAutoCommit(false);
            setGuc(c, Tenant.A.id().toString());
            assertThat(count(c, "SELECT count(*) FROM contract_versions WHERE id = '" + Tenant.A.id(CONTRACT_VERSION) + "'"))
                    .as("positive control: own version visible").isEqualTo(1);
            assertThat(count(c, "SELECT count(*) FROM contract_versions WHERE id = '" + bVersion + "'"))
                    .as("tenant B's contract version visible to tenant A").isZero();
            Savepoint sp = c.setSavepoint();
            try (Statement s = c.createStatement()) {
                int n = s.executeUpdate("UPDATE contract_versions SET change_notes = 'ISO-A pwned' WHERE id = '" + bVersion + "'");
                assertThat(n).isZero();
                s.executeUpdate("INSERT INTO contract_versions (contract_id, version_number, content) VALUES ('"
                        + Tenant.B.id(CONTRACT) + "', 99, '{}'::jsonb)");
                throw new AssertionError("insert of a version into tenant B's contract was accepted");
            } catch (SQLException e) {
                assertThat(isRlsViolation(e)).as(e.getMessage()).isTrue();
            } finally {
                c.rollback(sp);
            }
            c.rollback();
        }
    }

    // ── helpers ──────────────────────────────────────────────────────────────────────────────

    /** Table -> number of rows of OTHER tenants visible to nu_app_rls with the GUC set to {@code t}. */
    private static Map<String, Long> foreignRowsVisible(List<String> tables, Tenant t) throws SQLException {
        Map<String, Long> leaks = new TreeMap<>();
        try (Connection c = appRoleConnection()) {
            setGuc(c, t.id().toString());
            for (String table : tables) {
                long n = count(c, "SELECT count(*) FROM " + table + " WHERE tenant_id IS NOT NULL AND tenant_id <> '"
                        + t.id() + "'");
                if (n > 0) {
                    leaks.put(table, n);
                }
            }
        }
        return leaks;
    }

    /** INSERT (tenant_id) only, inside a savepoint. RLS WITH CHECK runs before NOT NULL/FK checks. */
    private static String tryInsertTenantOnly(Connection c, String table, UUID tenant) throws SQLException {
        Savepoint sp = c.setSavepoint();
        try (PreparedStatement ps = c.prepareStatement("INSERT INTO " + table + " (tenant_id) VALUES (?)")) {
            ps.setObject(1, tenant);
            ps.executeUpdate();
            return "INSERTED";
        } catch (SQLException e) {
            return (isRlsViolation(e) ? "RLS " : "") + e.getSQLState() + " " + e.getMessage();
        } finally {
            c.rollback(sp);
        }
    }

    private static boolean isRlsViolation(SQLException e) {
        return "42501".equals(e.getSQLState()) && e.getMessage() != null && e.getMessage().contains("row-level security");
    }

    private static void setGuc(Connection c, String value) throws SQLException {
        try (PreparedStatement ps = c.prepareStatement("SELECT set_config('app.current_tenant_id', ?, false)")) {
            ps.setString(1, value);
            ps.execute();
        }
    }

    private static long count(Connection c, String sql) throws SQLException {
        try (Statement s = c.createStatement(); ResultSet rs = s.executeQuery(sql)) {
            rs.next();
            return rs.getLong(1);
        }
    }
}
