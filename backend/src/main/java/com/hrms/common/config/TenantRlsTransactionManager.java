package com.hrms.common.config;

import com.hrms.common.security.TenantContext;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.datasource.DataSourceUtils;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.transaction.TransactionDefinition;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.UUID;

/**
 * Custom JPA transaction manager that sets the PostgreSQL session variable
 * {@code app.current_tenant_id} at the start of every transaction.
 *
 * <h2>Why this is needed</h2>
 * <p>
 * PostgreSQL Row Level Security (RLS) policies on contract tables (V16) use
 * {@code current_setting('app.current_tenant_id', true)::uuid} in their
 * {@code USING} clause.  Spring's standard {@link JpaTransactionManager}
 * opens a JDBC connection but never sets this variable, so all RLS policies
 * that depend on it either throw or evaluate to NULL, defeating the
 * enforcement.
 * </p>
 *
 * <h2>How it works</h2>
 * <ol>
 *   <li>After the parent class opens the physical connection and starts the
 *       transaction ({@code super.doBegin()}), we obtain the same connection
 *       via {@link DataSourceUtils#getConnection(DataSource)} and execute
 *       {@code SET LOCAL app.current_tenant_id = '<uuid>'}.
 *   </li>
 *   <li>{@code SET LOCAL} scopes the variable to the current transaction.
 *       It is automatically reset when the transaction commits or rolls back,
 *       so the value never leaks between requests on the same connection.
 *   </li>
 *   <li>If no tenant is present in the ThreadLocal (e.g., public-facing
 *       endpoints, background jobs) we skip the SET statement entirely.
 *   </li>
 * </ol>
 *
 * <h2>Registration</h2>
 * <p>
 * Registered as the primary {@link org.springframework.transaction.PlatformTransactionManager}
 * in {@link JpaConfig} — see that class for the {@code @Bean} definition.
 * Do NOT register this class directly with {@code @Component}; it must be
 * instantiated by Spring and provided with the {@link jakarta.persistence.EntityManagerFactory}.
 * </p>
 *
 * <h2>Future: strict RLS enforcement</h2>
 * <p>
 * Once this class is wired in (V25 Flyway migration drops the permissive
 * allow-all policies from V24 and reinstates tenant-scoped policies), the
 * DB connection pool user must NOT be a PostgreSQL superuser, because
 * PostgreSQL superusers bypass RLS by default.  Either:
 * <ul>
 *   <li>Use a non-superuser role, or</li>
 *   <li>Add {@code ALTER TABLE ... FORCE ROW LEVEL SECURITY;} for all tables.</li>
 * </ul>
 * </p>
 *
 * @see JpaConfig
 * @see com.hrms.common.security.TenantFilter
 * @see com.hrms.common.security.TenantContext
 */
@Slf4j
public class TenantRlsTransactionManager extends JpaTransactionManager {

    // Use set_config() with bind parameter to prevent SQL injection (CRIT-002).
    // Third param 'true' = SET LOCAL (transaction-scoped).
    private static final String SET_TENANT_SQL = "SELECT set_config('app.current_tenant_id', ?, true)";
    private static final String RESET_TENANT_SQL = "SELECT set_config('app.current_tenant_id', '', false)";

    @Override
    protected void doBegin(Object transaction, TransactionDefinition definition) {
        // Open the connection and start the physical transaction first
        super.doBegin(transaction, definition);

        UUID tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            // Public endpoint or background job — nothing to set
            return;
        }

        setTenantOnConnection(tenantId);
    }

    /**
     * Resets the PostgreSQL session variable after the transaction completes
     * (commit or rollback). Although {@code SET LOCAL} is automatically scoped
     * to the transaction, this explicit reset provides defense-in-depth:
     * <ul>
     *   <li>Guards against any code path that might use {@code SET} (without
     *       {@code LOCAL}), which would persist the value on the connection.</li>
     *   <li>Ensures the connection is returned to the pool in a clean state,
     *       preventing tenant ID leakage if the connection is reused for a
     *       request without tenant context (e.g., health checks).</li>
     * </ul>
     */
    @Override
    protected void doCleanupAfterCompletion(Object transaction) {
        resetTenantOnConnection();
        super.doCleanupAfterCompletion(transaction);
    }

    /**
     * Sets {@code app.current_tenant_id} on the current transaction's connection.
     */
    private void setTenantOnConnection(UUID tenantId) {
        DataSource ds = getDataSource();
        if (ds == null) {
            log.warn("TenantRlsTransactionManager: DataSource is null, cannot set app.current_tenant_id");
            return;
        }

        try {
            Connection conn = DataSourceUtils.getConnection(ds);
            try (PreparedStatement ps = conn.prepareStatement(SET_TENANT_SQL)) {
                ps.setString(1, tenantId.toString());
                ps.execute();
                log.trace("RLS: SET LOCAL app.current_tenant_id = {}", tenantId);
            }
        } catch (SQLException e) {
            // Log and continue rather than failing the transaction.  The
            // application-layer tenant filtering (WHERE tenant_id = :tenantId)
            // still enforces isolation; RLS is a defence-in-depth layer here.
            log.warn(
                "TenantRlsTransactionManager: Failed to set app.current_tenant_id={} — " +
                "RLS enforcement degraded to application layer only. Error: {}",
                tenantId, e.getMessage()
            );
        }
    }

    /**
     * Resets the session variable on the connection before it is returned to the pool.
     * Uses {@code RESET} which reverts the variable to its session default (empty string,
     * as set by HikariCP's {@code connectionInitSql}).
     */
    private void resetTenantOnConnection() {
        DataSource ds = getDataSource();
        if (ds == null) {
            return;
        }

        try {
            Connection conn = DataSourceUtils.getConnection(ds);
            // Only reset if connection is still valid and not already closed
            if (conn != null && !conn.isClosed()) {
                try (Statement stmt = conn.createStatement()) {
                    stmt.execute(RESET_TENANT_SQL);
                    log.trace("RLS: RESET app.current_tenant_id on transaction cleanup");
                }
            }
        } catch (SQLException e) {
            // Best-effort cleanup — don't fail the transaction for this
            log.debug("TenantRlsTransactionManager: Failed to reset app.current_tenant_id on cleanup: {}",
                    e.getMessage());
        }
    }
}
