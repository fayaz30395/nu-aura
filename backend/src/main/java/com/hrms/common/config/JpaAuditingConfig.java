package com.hrms.common.config;

import com.hrms.common.security.SecurityContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.AuditorAware;

import java.util.Optional;
import java.util.UUID;

/**
 * Configuration for JPA auditing
 * Provides the current user for @CreatedBy and @LastModifiedBy annotations
 */
@Configuration
public class JpaAuditingConfig {

    @Bean
    public AuditorAware<UUID> auditorAware() {
        return () -> Optional.ofNullable(SecurityContext.getCurrentUserId());
    }
}
