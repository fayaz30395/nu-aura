package com.hrms.common.config;

import com.hrms.common.security.TenantContext;
import com.zaxxer.hikari.HikariDataSource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeansException;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.datasource.DelegatingDataSource;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
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
     * A delegating DataSource that sets the PostgreSQL session variable
     * {@code app.current_tenant_id} on every connection obtained from the pool.
     *
     * <p>This catches all connection acquisition paths — JPA, JdbcTemplate,
     * native JDBC — ensuring RLS enforcement regardless of how the connection
     * was obtained.</p>
     */
    static class TenantAwareDataSource extends DelegatingDataSource {

        // Use set_config() with bind parameter to prevent SQL injection (CRIT-002).
        // Third param 'false' = session-scoped (not transaction-local).
        private static final String SET_TENANT_SQL = "SELECT set_config('app.current_tenant_id', ?, false)";

        TenantAwareDataSource(DataSource targetDataSource) {
            super(targetDataSource);
        }

        @Override
        public Connection getConnection() throws SQLException {
            Connection conn = super.getConnection();
            setTenantIfPresent(conn);
            return conn;
        }

        @Override
        public Connection getConnection(String username, String password) throws SQLException {
            Connection conn = super.getConnection(username, password);
            setTenantIfPresent(conn);
            return conn;
        }

        private void setTenantIfPresent(Connection conn) {
            UUID tenantId = TenantContext.getCurrentTenant();
            if (tenantId == null) {
                return;
            }

            try (PreparedStatement ps = conn.prepareStatement(SET_TENANT_SQL)) {
                ps.setString(1, tenantId.toString());
                ps.execute();
            } catch (SQLException e) {
                // Best-effort: log and continue. Application-layer filtering
                // (WHERE tenant_id = ?) still provides primary isolation.
                log.warn("TenantAwareDataSource: Failed to set app.current_tenant_id={}: {}",
                        tenantId, e.getMessage());
            }
        }
    }
}
