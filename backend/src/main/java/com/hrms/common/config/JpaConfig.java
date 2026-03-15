package com.hrms.common.config;

import jakarta.persistence.EntityManagerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.orm.jpa.JpaTransactionManager;

import javax.sql.DataSource;

/**
 * JPA persistence configuration.
 *
 * <p>Replaces Spring Boot's auto-configured {@link JpaTransactionManager}
 * with {@link TenantRlsTransactionManager} so that every transaction
 * automatically sets the {@code app.current_tenant_id} PostgreSQL session
 * variable, enabling proper Row Level Security enforcement on tables that
 * have tenant-scoped RLS policies.</p>
 *
 * <p>All other JPA settings (entity scan, auditing, repositories) remain
 * driven by the annotations on {@link com.hrms.HrmsApplication}.</p>
 */
// Temporarily disabled to debug entity manager factory issue
// @Configuration
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
        TenantRlsTransactionManager txManager = new TenantRlsTransactionManager();
        txManager.setEntityManagerFactory(entityManagerFactory);
        txManager.setDataSource(dataSource);
        return txManager;
    }
}
