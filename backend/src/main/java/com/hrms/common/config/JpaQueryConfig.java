package com.hrms.common.config;

import com.hrms.common.logging.SlowQueryInterceptor;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.hibernate.cfg.AvailableSettings;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.orm.jpa.HibernatePropertiesCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.stereotype.Component;

import java.util.concurrent.TimeUnit;

/**
 * JPA and query performance configuration.
 *
 * <p>Provides:</p>
 * <ul>
 *   <li>Slow query detection and logging</li>
 *   <li>Query execution metrics</li>
 *   <li>Statement inspection for debugging</li>
 * </ul>
 */
@Configuration
@Slf4j
public class JpaQueryConfig {

    @Value("${app.query.slow-threshold-ms:200}")
    private long slowQueryThresholdMs;

    /**
     * Register the slow query interceptor with Hibernate.
     */
    @Bean
    public HibernatePropertiesCustomizer hibernatePropertiesCustomizer(SlowQueryInterceptor slowQueryInterceptor) {
        return hibernateProperties -> {
            hibernateProperties.put(AvailableSettings.STATEMENT_INSPECTOR, slowQueryInterceptor);
        };
    }

    /**
     * Aspect for tracking repository query execution times.
     */
    @Aspect
    @Component
    @RequiredArgsConstructor
    @Slf4j
    public static class RepositoryQueryAspect {

        private final MeterRegistry meterRegistry;

        @Value("${app.query.slow-threshold-ms:200}")
        private long slowQueryThresholdMs;

        /**
         * Track execution time of all JPA repository methods.
         */
        @Around("execution(* org.springframework.data.jpa.repository.JpaRepository+.*(..))")
        public Object trackQueryTime(ProceedingJoinPoint joinPoint) throws Throwable {
            String repoName = joinPoint.getTarget().getClass().getSimpleName()
                    .replace("$Proxy", "")
                    .replaceAll("\\$\\$.*", "");
            String methodName = joinPoint.getSignature().getName();

            long startTime = System.nanoTime();

            try {
                Object result = joinPoint.proceed();

                long durationMs = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startTime);

                // Record metrics
                Timer.builder("jpa.query.duration")
                        .tag("repository", repoName)
                        .tag("method", methodName)
                        .tag("slow", durationMs > slowQueryThresholdMs ? "true" : "false")
                        .register(meterRegistry)
                        .record(durationMs, TimeUnit.MILLISECONDS);

                // Log slow queries
                if (durationMs > slowQueryThresholdMs) {
                    log.warn("SLOW_QUERY: {}.{} took {}ms (threshold: {}ms)",
                            repoName, methodName, durationMs, slowQueryThresholdMs);
                }

                return result;

            } catch (Exception e) {
                long durationMs = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startTime);

                // Record failed query metrics
                Timer.builder("jpa.query.duration")
                        .tag("repository", repoName)
                        .tag("method", methodName)
                        .tag("slow", "error")
                        .register(meterRegistry)
                        .record(durationMs, TimeUnit.MILLISECONDS);

                log.error("QUERY_ERROR: {}.{} failed after {}ms - {}",
                        repoName, methodName, durationMs, e.getMessage());

                throw e;
            }
        }
    }
}
