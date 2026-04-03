package com.hrms.common.config;

import io.micrometer.core.aop.TimedAspect;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Micrometer metrics configuration for observability.
 * <p>
 * Playbook Reference: Prompt 13 - Observability baseline
 * <p>
 * Metrics provided:
 * - auth_login_total: Total login attempts
 * - auth_login_success: Successful logins
 * - auth_login_failure: Failed logins
 * - api_requests_total: Total API requests by endpoint
 * - tenant_usage: Per-tenant usage counters
 */
@Configuration
public class MetricsConfig {

    @Bean
    public TimedAspect timedAspect(MeterRegistry registry) {
        return new TimedAspect(registry);
    }

    // Authentication Metrics
    @Bean
    public Counter authLoginTotal(MeterRegistry registry) {
        return Counter.builder("auth_login_total")
                .description("Total login attempts")
                .tag("type", "all")
                .register(registry);
    }

    @Bean
    public Counter authLoginSuccess(MeterRegistry registry) {
        return Counter.builder("auth_login_success")
                .description("Successful login attempts")
                .register(registry);
    }

    @Bean
    public Counter authLoginFailure(MeterRegistry registry) {
        return Counter.builder("auth_login_failure")
                .description("Failed login attempts")
                .register(registry);
    }

    @Bean
    public Counter authGoogleSsoTotal(MeterRegistry registry) {
        return Counter.builder("auth_google_sso_total")
                .description("Google SSO login attempts")
                .register(registry);
    }

    @Bean
    public Counter rateLimitExceeded(MeterRegistry registry) {
        return Counter.builder("rate_limit_exceeded_total")
                .description("Rate limit exceeded events")
                .register(registry);
    }

    // Request duration timer
    @Bean
    public Timer apiRequestDuration(MeterRegistry registry) {
        return Timer.builder("api_request_duration")
                .description("API request duration")
                .publishPercentiles(0.5, 0.95, 0.99)
                .register(registry);
    }
}
