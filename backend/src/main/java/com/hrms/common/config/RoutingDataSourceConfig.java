package com.hrms.common.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.boot.autoconfigure.jdbc.DataSourceProperties;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.datasource.LazyConnectionDataSourceProxy;
import org.springframework.jdbc.datasource.lookup.AbstractRoutingDataSource;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import javax.sql.DataSource;
import java.util.HashMap;
import java.util.Map;

/**
 * Optional read-replica routing for {@code @Transactional(readOnly = true)} methods
 * (wave-3 H7 / C7).
 *
 * <h2>Activation</h2>
 * <p>
 * Activated only when the environment variable {@code SPRING_DATASOURCE_REPLICA_URL}
 * (property {@code spring.datasource.replica.url}) is set to a <em>non-empty, non-false</em>
 * value. When unset, empty (e.g. {@code ${SPRING_DATASOURCE_REPLICA_URL:}} resolving to
 * an empty string in the test/dev profile), or explicitly {@code "false"}, this
 * configuration is skipped entirely via {@link ConditionalOnExpression}, leaving the
 * existing primary data-source path untouched — making the change zero-risk for
 * environments that have not yet provisioned a Neon replica endpoint.
 * </p>
 *
 * <p>
 * Note: a plain {@code @ConditionalOnProperty(name = "spring.datasource.replica.url")}
 * is <strong>not</strong> sufficient here because Spring Boot 3.x treats an empty-string
 * placeholder value as "present and not 'false'", which would wrongly activate this
 * config in the test profile (where the placeholder resolves to {@code ""}) and break
 * the {@code dataSource}/{@code routingDataSource} qualifier graph for H2-backed tests.
 * The SpEL expression below explicitly demands a non-empty, non-"false" URL.
 * </p>
 *
 * <h2>How routing works</h2>
 * <ol>
 *   <li>Spring Boot auto-configures the primary {@link HikariDataSource} bean named
 *       {@code dataSource} from {@code spring.datasource.*} (unchanged).</li>
 *   <li>{@link TenantAwareDataSourceConfig} (BeanPostProcessor) wraps that primary
 *       Hikari bean with a tenant-aware delegating proxy that injects
 *       {@code app.current_tenant_id} on every connection checkout.</li>
 *   <li>This config declares a second Hikari pool for the replica
 *       ({@link #replicaDataSource}) bound to {@code spring.datasource.replica.*}.</li>
 *   <li>{@link #routingDataSource} declares an {@link AbstractRoutingDataSource}
 *       keyed by transaction read-only status, then wraps it in a
 *       {@link LazyConnectionDataSourceProxy}.</li>
 * </ol>
 *
 * <p>
 * The {@link LazyConnectionDataSourceProxy} is essential: it defers physical
 * {@code getConnection()} until the application actually issues a JDBC call. By that
 * point the {@code @Transactional} interceptor has already set
 * {@link TransactionSynchronizationManager#isCurrentTransactionReadOnly()}, so the
 * routing decision is correct. Without the lazy proxy, the connection would be
 * obtained before the transactional read-only flag is bound to the thread, and every
 * call would land on the primary.
 * </p>
 *
 * <h2>Interaction with TenantAwareDataSourceConfig</h2>
 * <p>
 * The {@link TenantAwareDataSourceConfig} BeanPostProcessor checks
 * {@code bean instanceof HikariDataSource}. It will therefore wrap:
 * <ul>
 *   <li>the auto-configured primary {@code dataSource} bean (HikariDataSource), AND</li>
 *   <li>this {@link #replicaDataSource} bean (HikariDataSource).</li>
 * </ul>
 * Both replicas of the resulting tenant-aware wrapper are registered with the
 * {@link AbstractRoutingDataSource} below, so {@code app.current_tenant_id} is set
 * on every connection — primary or replica — preserving RLS enforcement on the
 * read replica as well.
 * </p>
 *
 * <p>
 * The routing data source itself is not a {@link HikariDataSource}, so the
 * BeanPostProcessor will <em>not</em> wrap it (avoiding a double-wrap and a
 * recursive proxy chain).
 * </p>
 *
 * <h2>Why @Primary on the routing data source</h2>
 * <p>
 * JPA, JdbcTemplate, Flyway (via {@code spring.flyway.url}, which is set
 * explicitly), and other consumers all autowire {@code DataSource} by type. Marking
 * the routing data source {@code @Primary} ensures they resolve to the router
 * rather than the underlying primary or replica beans directly.
 * </p>
 *
 * <h2>Routing key semantics</h2>
 * <ul>
 *   <li>{@code "replica"} — when {@link TransactionSynchronizationManager#isCurrentTransactionReadOnly()}
 *       returns {@code true} (i.e. inside a {@code @Transactional(readOnly = true)} method).</li>
 *   <li>{@code "primary"} — otherwise (writes, default tx, or no tx at all). This is also
 *       set as the default target so any unknown lookup key falls through safely.</li>
 * </ul>
 *
 * @see TenantAwareDataSourceConfig
 * @see JpaConfig
 */
@Configuration
@ConditionalOnExpression(
        "'${spring.datasource.replica.url:}'.length() > 0 "
        + "&& !'${spring.datasource.replica.url:}'.equalsIgnoreCase('false')")
@Slf4j
public class RoutingDataSourceConfig {

    static final String PRIMARY_KEY = "primary";
    static final String REPLICA_KEY = "replica";

    /**
     * Binds {@code spring.datasource.replica.*} into a {@link DataSourceProperties}
     * holder. Only URL/username/password are read by {@link #replicaDataSource}; pool
     * tuning lives in code (mirrors the primary pool's behavior).
     */
    @Bean
    @ConfigurationProperties(prefix = "spring.datasource.replica")
    public DataSourceProperties replicaProperties() {
        return new DataSourceProperties();
    }

    /**
     * Read-only Hikari pool pointing at the Neon read replica endpoint.
     *
     * <p>Hikari pool is marked {@code readOnly} so any accidental write attempt
     * fails fast at the JDBC layer rather than silently succeeding on a stale
     * replica.</p>
     *
     * <p>Naming the bean {@code replicaDataSource} (rather than {@code dataSource})
     * is critical so it doesn't collide with Spring Boot's auto-configured primary
     * bean. The {@link TenantAwareDataSourceConfig} BeanPostProcessor will still
     * wrap this bean because it is a {@link HikariDataSource}, preserving
     * {@code app.current_tenant_id} injection on replica connections.</p>
     */
    @Bean(name = "replicaDataSource")
    public DataSource replicaDataSource(@Qualifier("replicaProperties") DataSourceProperties props) {
        HikariConfig config = new HikariConfig();
        config.setJdbcUrl(props.getUrl());
        config.setUsername(props.getUsername());
        config.setPassword(props.getPassword());
        config.setDriverClassName(props.getDriverClassName() != null
                ? props.getDriverClassName()
                : "org.postgresql.Driver");
        config.setReadOnly(true);
        config.setPoolName("HrmsHikariReplicaPool");
        config.setMaximumPoolSize(20);
        config.setMinimumIdle(2);
        config.setConnectionTimeout(30000);
        config.setIdleTimeout(120000);
        config.setMaxLifetime(240000);
        config.setKeepaliveTime(120000);
        config.setValidationTimeout(5000);
        config.setLeakDetectionThreshold(60000);
        config.setConnectionTestQuery("SELECT 1");
        // Mirror primary: initialize tenant variable + statement timeout per connection.
        // TenantAwareDataSource still overrides app.current_tenant_id when a tenant
        // is present in TenantContext on connection checkout.
        config.setConnectionInitSql("SET app.current_tenant_id = ''; SET statement_timeout = '120s'");

        log.info("Replica routing: registering replicaDataSource pool '{}' (readOnly=true) for {}",
                config.getPoolName(), props.getUrl());
        return new HikariDataSource(config);
    }

    /**
     * Primary {@link DataSource} bean exposed to JPA, JdbcTemplate, etc. It dispatches
     * between the auto-configured primary pool and the replica pool based on the
     * current transaction's read-only flag.
     *
     * <p>Wrapped in {@link LazyConnectionDataSourceProxy} so the routing decision
     * happens after the Spring {@code @Transactional} interceptor binds the read-only
     * flag to the thread (i.e. lazy on first JDBC call, not on connection allocation).</p>
     *
     * @param primary the auto-configured primary {@code dataSource} bean
     *                (already tenant-aware via {@link TenantAwareDataSourceConfig})
     * @param replica the {@code replicaDataSource} bean declared above
     *                (also tenant-aware after BeanPostProcessor wrapping)
     */
    @Bean(name = "routingDataSource")
    @Primary
    public DataSource routingDataSource(
            @Qualifier("dataSource") DataSource primary,
            @Qualifier("replicaDataSource") DataSource replica) {

        AbstractRoutingDataSource routing = new AbstractRoutingDataSource() {
            @Override
            protected Object determineCurrentLookupKey() {
                return TransactionSynchronizationManager.isCurrentTransactionReadOnly()
                        ? REPLICA_KEY
                        : PRIMARY_KEY;
            }
        };

        Map<Object, Object> targets = new HashMap<>();
        targets.put(PRIMARY_KEY, primary);
        targets.put(REPLICA_KEY, replica);
        routing.setTargetDataSources(targets);
        routing.setDefaultTargetDataSource(primary);
        routing.afterPropertiesSet();

        log.info("Replica routing: enabled — @Transactional(readOnly=true) routes to replica, " +
                "all other paths route to primary");
        return new LazyConnectionDataSourceProxy(routing);
    }
}
