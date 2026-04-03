package com.hrms.common.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Development-only security configuration.
 * <p>
 * This configuration provides open access to Swagger UI and API docs
 * ONLY when the 'dev' profile is active.
 * <p>
 * In production (non-dev profiles), the main SecurityConfig requires
 * SYSTEM_ADMIN authority for these endpoints.
 */
@Configuration
@Profile("dev")
public class DevSecurityConfig {

    /**
     * Higher priority filter chain for Swagger endpoints in dev mode.
     * Order(1) ensures this is evaluated before the main security filter chain.
     */
    @Bean
    @Order(1)
    public SecurityFilterChain swaggerDevFilterChain(HttpSecurity http) throws Exception {
        http
                .securityMatcher("/swagger-ui/**", "/swagger-ui.html", "/api-docs/**", "/v3/api-docs/**")
                .csrf(AbstractHttpConfigurer::disable)
                .authorizeHttpRequests(auth -> auth.anyRequest().permitAll());

        return http.build();
    }

    /**
     * Higher priority filter chain for Actuator endpoints in dev mode.
     * Only safe, non-sensitive endpoints are permitted. Sensitive endpoints
     * (env, configprops, heapdump, beans, mappings) are denied even in dev.
     */
    @Bean
    @Order(2)
    public SecurityFilterChain actuatorDevFilterChain(HttpSecurity http) throws Exception {
        http
                .securityMatcher("/actuator/**")
                .csrf(AbstractHttpConfigurer::disable)
                .authorizeHttpRequests(auth -> auth
                        // Safe endpoints — always permitted
                        .requestMatchers(
                                "/actuator/health", "/actuator/health/**",
                                "/actuator/info",
                                "/actuator/metrics", "/actuator/metrics/**",
                                "/actuator/prometheus"
                        ).permitAll()
                        // Sensitive endpoints — explicitly denied
                        .requestMatchers(
                                "/actuator/env", "/actuator/env/**",
                                "/actuator/configprops", "/actuator/configprops/**",
                                "/actuator/heapdump",
                                "/actuator/beans",
                                "/actuator/mappings",
                                "/actuator/threaddump",
                                "/actuator/scheduledtasks",
                                "/actuator/conditions",
                                "/actuator/logfile",
                                "/actuator/shutdown"
                        ).denyAll()
                        // All other actuator endpoints require authentication
                        .anyRequest().authenticated()
                );

        return http.build();
    }
}
