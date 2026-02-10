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
 *
 * This configuration provides open access to Swagger UI and API docs
 * ONLY when the 'dev' profile is active.
 *
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
     * Allows full access to actuator endpoints for debugging.
     */
    @Bean
    @Order(2)
    public SecurityFilterChain actuatorDevFilterChain(HttpSecurity http) throws Exception {
        http
                .securityMatcher("/actuator/**")
                .csrf(AbstractHttpConfigurer::disable)
                .authorizeHttpRequests(auth -> auth
                        // Health is always public
                        .requestMatchers("/actuator/health", "/actuator/health/**").permitAll()
                        // In dev, allow all actuator endpoints
                        .anyRequest().permitAll()
                );

        return http.build();
    }
}
