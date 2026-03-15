package com.hrms.common.config;

import com.hrms.common.security.TenantContext;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.datasource.DataSourceUtils;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.DefaultTransactionStatus;

import javax.sql.DataSource;
import java.sql.Connection;
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

    private static final String SET_TENANT_SQL = "SET LOCAL app.current_tenant_id = '%s'";

    @Override
    protected void doBegin(Object transaction, TransactionDefinition definition) {
        // Open the connection and start the physical transaction first
        super.doBegin(transaction, definition);

        UUID tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            // Public endpoint or background job — nothing to set
            return;
        }

        DataSource ds = getDataSource();
        if (ds == null) {
            log.warn("TenantRlsTransactionManager: DataSource is null, cannot set app.current_tenant_id");
            return;
        }

        Connection conn = null;
        try {
            conn = DataSourceUtils.getConnection(ds);
            try (Statement stmt = conn.createStatement()) {
                // SET LOCAL scopes the variable to this transaction only.
                // Using string interpolation here is intentional: tenantId is a
                // UUID (validated on ingress in TenantFilter) so there is no SQL
                // injection risk.  We deliberately avoid PreparedStatement here
                // because SET LOCAL does not accept bind parameters in PostgreSQL.
                String sql = String.format(SET_TENANT_SQL, tenantId);
                stmt.execute(sql);
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
        } finally {
            // Do NOT close or release the connection — the transaction manager owns it.
            // DataSourceUtils.releaseConnection() is intentionally NOT called here.
        }
    }
}
