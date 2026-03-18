package com.hrms.common.config;

import jakarta.persistence.EntityManagerFactory;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.orm.jpa.JpaTransactionManager;

import javax.sql.DataSource;

/**
 * JPA persistence configuration for tenant-aware RLS enforcement.
 *
 * <p>Replaces Spring Boot's auto-configured {@link JpaTransactionManager}
 * with {@link TenantRlsTransactionManager} so that every transaction
 * automatically sets the {@code app.current_tenant_id} PostgreSQL session
 * variable, enabling proper Row Level Security enforcement on tables that
 * have tenant-scoped RLS policies.</p>
 *
 * <p>All other JPA settings (entity scan, auditing, repositories) remain
 * driven by the annotations on {@link com.hrms.HrmsApplication}.</p>
 *
 * <h3>Safety toggle</h3>
 * <p>Enabled by default ({@code app.rls.transaction-manager.enabled=true}).
 * Set to {@code false} to fall back to Spring Boot's default transaction
 * manager if any startup issues arise. When disabled, tenant isolation
 * relies solely on the application layer ({@code WHERE tenant_id = ?}).</p>
 *
 * @see TenantRlsTransactionManager
 */
@Configuration
@ConditionalOnProperty(
    name = "app.rls.transaction-manager.enabled",
    havingValue = "true",
    matchIfMissing = true
)
@Slf4j
public class JpaConfig {

    /**
     * Primary transaction manager with RLS session-variable injection.
     *
     * <p>Marked {@code @Primary} so Spring Boot uses this instead of its
     * auto-configured {@code JpaTransactionManager} everywhere
     * {@code @Transactional} is used.</p>
     */
    @Bean(name = "transactionManager")
    @Primary
    public JpaTransactionManager transactionManager(
            EntityManagerFactory entityManagerFactory,
            DataSource dataSource
    ) {
        log.info("RLS: Registering TenantRlsTransactionManager — PostgreSQL session variable " +
                 "app.current_tenant_id will be SET LOCAL on every transaction begin");
        TenantRlsTransactionManager txManager = new TenantRlsTransactionManager();
        txManager.setEntityManagerFactory(entityManagerFactory);
        txManager.setDataSource(dataSource);
        return txManager;
    }
}
