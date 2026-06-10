package com.nulogic.common.config;

import com.nulogic.common.security.TenantContext;
import com.zaxxer.hikari.HikariDataSource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeansException;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.datasource.DelegatingDataSource;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Proxy;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.UUID;

/**
 * Wraps the HikariCP {@link DataSource} with tenant-aware connection initialization.
 *
 * <h2>Problem</h2>
 * <p>
 * {@link TenantRlsTransactionManager} sets {@code SET LOCAL app.current_tenant_id}
 * at the start of each JPA transaction. However, some code paths obtain JDBC
 * connections outside of JPA transactions:
 * <ul>
 *   <li>{@code JdbcTemplate} calls without {@code @Transactional}</li>
 *   <li>Native JDBC operations via {@code DataSource.getConnection()}</li>
 *   <li>Spring Batch or other frameworks that manage their own connections</li>
 * </ul>
 * In these cases, the RLS session variable is never set, and the graceful
 * RLS policies fall through to allow-all — a security gap.
 * </p>
 *
 * <h2>Solution</h2>
 * <p>
 * This {@link BeanPostProcessor} wraps the auto-configured {@link HikariDataSource}
 * with a {@link TenantAwareDataSource} that sets the session variable on every
 * {@code getConnection()} call when a tenant is present in {@link TenantContext}.
 * </p>
 *
 * <h2>Interaction with TenantRlsTransactionManager</h2>
 * <p>
 * When both are active, the session variable is set twice for JPA transactions:
 * once here (session-level {@code SET}) and once in the transaction manager
 * ({@code SET LOCAL}). The {@code SET LOCAL} takes precedence within the
 * transaction and auto-reverts on commit/rollback, after which the session-level
 * value takes effect again. This is safe and provides layered coverage.
 * </p>
 *
 * <h2>Edge cases handled</h2>
 * <ul>
 *   <li><strong>Flyway migrations:</strong> Run during startup before any HTTP
 *       request, so {@code TenantContext.getCurrentTenant()} is {@code null} and
 *       the SET is skipped. Flyway connections are unaffected.</li>
 *   <li><strong>Health checks ({@code /actuator/health}):</strong> No tenant
 *       context is set, so the SET is skipped. Health check queries work normally.</li>
 *   <li><strong>Scheduled jobs:</strong> Must set {@code TenantContext} before
 *       DB operations (as they already do). The wrapper then sets the session
 *       variable on the connection.</li>
 * </ul>
 *
 * <h2>Safety toggle</h2>
 * <p>
 * Enabled by default ({@code app.rls.datasource-wrapper.enabled=true}).
 * Set to {@code false} to disable if any startup issues arise.
 * </p>
 *
 * @see TenantRlsTransactionManager
 * @see TenantContext
 */
@Component
@ConditionalOnProperty(
        name = "app.rls.datasource-wrapper.enabled",
        havingValue = "true",
        matchIfMissing = true
)
@Slf4j
public class TenantAwareDataSourceConfig implements BeanPostProcessor {

    @Override
    public Object postProcessAfterInitialization(Object bean, String beanName) throws BeansException {
        if (bean instanceof HikariDataSource hikariDs) {
            log.info("RLS: Wrapping DataSource '{}' with TenantAwareDataSource — " +
                    "app.current_tenant_id will be SET on every connection checkout " +
                    "when tenant context is present", beanName);
            return new TenantAwareDataSource(hikariDs);
        }
        return bean;
    }

    /**
     * A delegating DataSource that resets the PostgreSQL session variable on
     * checkout, then sets {@code app.current_tenant_id} when tenant context is
     * present.
     *
     * <h2>Why the session-scoped {@code set_config(..., false)} here is safe</h2>
     * <p>
     * Unlike service-level code (which MUST use transaction-local
     * {@code set_config(..., true)} — see {@link TenantRlsTransactionManager}),
     * this wrapper intentionally uses session scope because it runs on connection
     * checkout, usually in autocommit mode where a transaction-local set would be
     * discarded immediately. The leak vector (tenant id persisting on the pooled
     * connection across requests) is closed twice over:
     * <ol>
     *   <li><strong>Reset-on-checkout:</strong> every {@code getConnection()} first
     *       executes {@code RESET app.current_tenant_id} before optionally setting
     *       the current tenant, so no consumer can observe a stale value.</li>
     *   <li><strong>Reset-on-close (RLS-LEAK hardening):</strong> the returned
     *       connection is proxied so {@code close()} best-effort RESETs the
     *       variable before the connection re-enters the pool, guaranteeing the
     *       pool never holds tenant-tagged sessions even for code paths that
     *       bypass this wrapper on a later checkout.</li>
     * </ol>
     */
    static class TenantAwareDataSource extends DelegatingDataSource {

        // Use set_config() with bind parameter to prevent SQL injection (CRIT-002).
        // Third param 'false' = session-scoped — REQUIRED here (see class Javadoc);
        // safety comes from the unconditional RESET on checkout and on close.
        private static final String SET_TENANT_SQL = "SELECT set_config('app.current_tenant_id', ?, false)";
        private static final String RESET_TENANT_SQL = "RESET app.current_tenant_id";

        TenantAwareDataSource(DataSource targetDataSource) {
            super(targetDataSource);
        }

        @Override
        public Connection getConnection() throws SQLException {
            Connection conn = super.getConnection();
            prepareTenantContext(conn);
            return wrapWithResetOnClose(conn);
        }

        @Override
        public Connection getConnection(String username, String password) throws SQLException {
            Connection conn = super.getConnection(username, password);
            prepareTenantContext(conn);
            return wrapWithResetOnClose(conn);
        }

        private void prepareTenantContext(Connection conn) throws SQLException {
            resetTenant(conn);

            UUID tenantId = TenantContext.getCurrentTenant();
            if (tenantId == null) {
                return;
            }

            setTenant(conn, tenantId);
        }

        /**
         * Wraps the checked-out connection so {@code close()} resets
         * {@code app.current_tenant_id} (best-effort) before the physical
         * connection is returned to the Hikari pool. This guarantees pooled
         * connections are never parked with a tenant id on the session.
         */
        private Connection wrapWithResetOnClose(Connection conn) {
            return (Connection) Proxy.newProxyInstance(
                    conn.getClass().getClassLoader(),
                    new Class<?>[]{Connection.class},
                    (proxy, method, args) -> {
                        if ("close".equals(method.getName())) {
                            resetTenantQuietly(conn);
                        }
                        try {
                            return method.invoke(conn, args);
                        } catch (InvocationTargetException e) {
                            throw e.getCause();
                        }
                    });
        }

        /**
         * Best-effort RESET before pool return. Swallows SQL errors (e.g. the
         * connection is in an aborted transaction about to be rolled back by
         * Hikari) — the reset-on-checkout in {@link #prepareTenantContext}
         * remains the authoritative guard for the next consumer.
         */
        private void resetTenantQuietly(Connection conn) {
            try {
                if (conn != null && !conn.isClosed()) {
                    try (Statement stmt = conn.createStatement()) {
                        stmt.execute(RESET_TENANT_SQL);
                    }
                }
            } catch (SQLException e) {
                log.debug("RLS: best-effort RESET app.current_tenant_id on close failed: {}", e.getMessage());
            }
        }

        private void resetTenant(Connection conn) throws SQLException {
            try (PreparedStatement ps = conn.prepareStatement(RESET_TENANT_SQL)) {
                ps.execute();
            }
        }

        private void setTenant(Connection conn, UUID tenantId) throws SQLException {
            try (PreparedStatement ps = conn.prepareStatement(SET_TENANT_SQL)) {
                ps.setString(1, tenantId.toString());
                ps.execute();
            }
        }
    }
}
