package com.hrms.common.config;

import net.javacrumbs.shedlock.core.LockProvider;
import net.javacrumbs.shedlock.provider.jdbctemplate.JdbcTemplateLockProvider;
import net.javacrumbs.shedlock.spring.annotation.EnableSchedulerLock;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

import javax.sql.DataSource;

/**
 * ShedLock configuration for distributed job locking.
 *
 * <p>In a multi-pod Kubernetes deployment, all {@code @Scheduled} jobs fire on every pod.
 * ShedLock uses a shared database table ({@code shedlock}) to guarantee that at most one
 * pod executes each job within the configured lock window.</p>
 *
 * <p>Default maximum lock duration is 30 minutes. Individual jobs can override this
 * via {@code @SchedulerLock(lockAtMostFor = "...")}.</p>
 */
@Configuration
@EnableSchedulerLock(defaultLockAtMostFor = "PT30M")
public class ShedLockConfig {

    @Bean
    public LockProvider lockProvider(DataSource dataSource) {
        return new JdbcTemplateLockProvider(
                JdbcTemplateLockProvider.Configuration.builder()
                        .withJdbcTemplate(new JdbcTemplate(dataSource))
                        .usingDbTime()
                        .build()
        );
    }
}
