package com.hrms.common.config;

import com.hrms.common.security.CsrfDoubleSubmitFilter;
import com.hrms.common.security.JwtAuthenticationFilter;
import com.hrms.common.security.RateLimitingFilter;
import com.hrms.common.security.SamlAuthenticationSuccessHandler;
import com.hrms.common.security.TenantFilter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Lazy;
import org.springframework.core.env.Environment;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.saml2.provider.service.registration.RelyingPartyRegistrationRepository;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    /**
     * BUG-013 FIX: Spring's built-in CSRF is disabled because we use a custom
     * double-submit cookie filter (CsrfDoubleSubmitFilter) for defense-in-depth.
     * The custom filter sets a non-httpOnly XSRF-TOKEN cookie and validates
     * the X-XSRF-TOKEN header on state-changing requests, while skipping
     * auth/public/webhook endpoints that cannot supply the token.
     */

    private final Environment environment;
    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final TenantFilter tenantFilter;
    private final RateLimitingFilter rateLimitingFilter;
    private final CsrfDoubleSubmitFilter csrfDoubleSubmitFilter;
    private final UserDetailsService userDetailsService;
    private final RelyingPartyRegistrationRepository relyingPartyRegistrationRepository;
    private final SamlAuthenticationSuccessHandler samlAuthenticationSuccessHandler;
    @Value("${app.cors.allowed-origins:http://localhost:3000,http://localhost:3001,http://localhost:8080}")
    private String allowedOriginsStr;

    public SecurityConfig(Environment environment,
                          @Lazy JwtAuthenticationFilter jwtAuthenticationFilter,
                          @Lazy TenantFilter tenantFilter,
                          RateLimitingFilter rateLimitingFilter,
                          CsrfDoubleSubmitFilter csrfDoubleSubmitFilter,
                          @Lazy UserDetailsService userDetailsService,
                          @Lazy RelyingPartyRegistrationRepository relyingPartyRegistrationRepository,
                          @Lazy SamlAuthenticationSuccessHandler samlAuthenticationSuccessHandler) {
        this.environment = environment;
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.tenantFilter = tenantFilter;
        this.rateLimitingFilter = rateLimitingFilter;
        this.csrfDoubleSubmitFilter = csrfDoubleSubmitFilter;
        this.userDetailsService = userDetailsService;
        this.relyingPartyRegistrationRepository = relyingPartyRegistrationRepository;
        this.samlAuthenticationSuccessHandler = samlAuthenticationSuccessHandler;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /**
     * Prevent these filters from being auto-registered as servlet filters by Tomcat.
     * They are added to the Spring Security filter chain only (via addFilterBefore).
     * Without this, CGLIB proxy creation (from @EnableAsync) breaks OncePerRequestFilter
     * because its doFilter() is final and the proxy's logger field is null.
     */
    @Bean
    public FilterRegistrationBean<RateLimitingFilter> disableRateLimitingFilterAutoRegistration(RateLimitingFilter filter) {
        FilterRegistrationBean<RateLimitingFilter> registration = new FilterRegistrationBean<>(filter);
        registration.setEnabled(false);
        return registration;
    }

    @Bean
    public FilterRegistrationBean<TenantFilter> disableTenantFilterAutoRegistration(TenantFilter filter) {
        FilterRegistrationBean<TenantFilter> registration = new FilterRegistrationBean<>(filter);
        registration.setEnabled(false);
        return registration;
    }

    @Bean
    public FilterRegistrationBean<JwtAuthenticationFilter> disableJwtFilterAutoRegistration(JwtAuthenticationFilter filter) {
        FilterRegistrationBean<JwtAuthenticationFilter> registration = new FilterRegistrationBean<>(filter);
        registration.setEnabled(false);
        return registration;
    }

    @Bean
    public FilterRegistrationBean<CsrfDoubleSubmitFilter> disableCsrfDoubleSubmitFilterAutoRegistration(CsrfDoubleSubmitFilter filter) {
        FilterRegistrationBean<CsrfDoubleSubmitFilter> registration = new FilterRegistrationBean<>(filter);
        registration.setEnabled(false);
        return registration;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .headers(headers -> headers
                        .frameOptions(frame -> frame.deny())
                        .contentSecurityPolicy(
                                csp -> csp.policyDirectives("default-src 'self'; frame-ancestors 'none'"))
                        // X-XSS-Protection header is deprecated in modern browsers and removed in Spring Security 6.2+
                        // CSP header above provides better protection. Omitting xssProtection() entirely.
                        // Enforce HTTPS for 1 year (Strict-Transport-Security)
                        // Only effective over HTTPS; browsers ignore HSTS over plain HTTP.
                        .httpStrictTransportSecurity(hsts -> hsts
                                .maxAgeInSeconds(31536000)
                                .includeSubDomains(true)
                                .preload(false))
                        // Prevent MIME-type sniffing (X-Content-Type-Options: nosniff)
                        .contentTypeOptions(contentTypeOptions -> {
                        })
                        // Limit referrer information sent in cross-origin requests.
                        // 'strict-origin-when-cross-origin' sends the full URL for same-origin
                        // requests and only the origin for cross-origin HTTPS→HTTPS requests.
                        // This prevents internal API path details leaking to third-party servers.
                        .referrerPolicy(referrer -> referrer
                                .policy(org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN))
                        // Restrict browser feature permissions (camera, microphone, geolocation, etc.)
                        // An HRMS API server has no need to grant these capabilities to callers.
                        .permissionsPolicy(permissions -> permissions
                                .policy("camera=(), microphone=(), geolocation=(), payment=(), usb=(), display-capture=()")))
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                // Return 401 JSON for unauthenticated API requests instead of 302 redirect
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint((request, response, authException) -> {
                            response.setContentType("application/json");
                            response.setStatus(jakarta.servlet.http.HttpServletResponse.SC_UNAUTHORIZED);
                            response.getWriter().write("{\"error\":\"Unauthorized\",\"message\":\"Authentication required\"}");
                        })
                        .accessDeniedHandler((request, response, accessDeniedException) -> {
                            response.setContentType("application/json");
                            response.setStatus(jakarta.servlet.http.HttpServletResponse.SC_FORBIDDEN);
                            response.getWriter().write("{\"error\":\"Forbidden\",\"message\":\"Access denied\"}");
                        }))
                .authorizeHttpRequests(auth -> auth
                        // Error endpoint must be public
                        .requestMatchers("/error").permitAll()
                        .requestMatchers("/api/v1/auth/**").permitAll()
                        // MFA endpoints - login is public (pre-auth step), others require
                        // authentication
                        .requestMatchers("/api/v1/auth/mfa-login").permitAll()
                        .requestMatchers("/api/v1/auth/mfa/**").authenticated()
                        .requestMatchers("/api/v1/tenants/register").permitAll()
                        // Actuator: only health endpoint is public, others require SUPER_ADMIN
                        .requestMatchers("/actuator/health", "/actuator/health/**").permitAll()
                        .requestMatchers("/actuator/**").hasRole("SUPER_ADMIN")
                        // Swagger UI: require SUPER_ADMIN in production (see SwaggerSecurityConfig for
                        // dev profile)
                        .requestMatchers("/swagger-ui/**", "/swagger-ui.html", "/api-docs/**", "/v3/api-docs/**")
                        .hasRole("SUPER_ADMIN")
                        // External signing endpoints (token-based, no authentication)
                        .requestMatchers("/api/v1/esignature/external/**").permitAll()
                        // Public offer portal endpoints (token-based access for candidates)
                        .requestMatchers("/api/v1/public/offers/**").permitAll()
                        // Public exit interview (token-based, no auth required)
                        .requestMatchers("/api/v1/exit/interview/public/**").permitAll()
                        // Public career page (job listings, no auth required)
                        .requestMatchers("/api/public/careers/**").permitAll()
                        // WebSocket/SockJS endpoints (auth handled at STOMP level)
                        .requestMatchers("/ws/**").permitAll()
                        // DocuSign webhook (public, HMAC-verified via CRIT-002)
                        .requestMatchers("/api/v1/integrations/docusign/webhook").permitAll()
                        // Payment provider webhooks (public, signature-verified per provider)
                        .requestMatchers("/api/v1/payments/webhooks/**").permitAll()
                        // Preboarding portal endpoints (token-based access for new hires)
                        .requestMatchers("/api/v1/preboarding/portal/**").permitAll()
                        // Biometric device webhook endpoints (API key auth, not JWT)
                        .requestMatchers("/api/v1/biometric/punch").permitAll()
                        .requestMatchers("/api/v1/biometric/punch/batch").permitAll()
                        // Slack webhook endpoints (signing-secret verified in SlackCommandController)
                        .requestMatchers("/api/v1/integrations/slack/commands").permitAll()
                        .requestMatchers("/api/v1/integrations/slack/interactions").permitAll()
                        .requestMatchers("/api/v1/integrations/slack/events").permitAll()
                        // SAML 2.0 SSO endpoints (Spring Security handles auth internally)
                        .requestMatchers("/saml2/**").permitAll()
                        .requestMatchers("/login/saml2/**").permitAll()
                        .requestMatchers("/logout/saml2/**").permitAll()
                        .anyRequest().authenticated())
                .authenticationProvider(authenticationProvider())
                // SAML 2.0 Login — additive to existing JWT/password/Google OAuth flows.
                // Uses the DynamicSamlRelyingPartyRegistrationRepository to load per-tenant IdP configs.
                // After successful SAML auth, SamlAuthenticationSuccessHandler issues a JWT and redirects to frontend.
                .saml2Login(saml2 -> saml2
                        .relyingPartyRegistrationRepository(relyingPartyRegistrationRepository)
                        .successHandler(samlAuthenticationSuccessHandler))
                // Filter order: RateLimiting -> Tenant -> JWT -> CSRF -> (UsernamePasswordAuth)
                // All positioned relative to standard UsernamePasswordAuthenticationFilter.
                .addFilterBefore(rateLimitingFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(tenantFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterAfter(csrfDoubleSubmitFilter, JwtAuthenticationFilter.class);

        // Spring's built-in CSRF is disabled — we use CsrfDoubleSubmitFilter instead.
        // The custom filter provides defense-in-depth on top of JWT httpOnly cookies
        // with SameSite=Strict, and correctly skips auth/public/webhook endpoints.
        http.csrf(AbstractHttpConfigurer::disable);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        List<String> allowedOrigins = Arrays.asList(allowedOriginsStr.split(","));
        // SECURITY FIX (P1.2): Removed wildcard port pattern "http://localhost:*"
        // which allowed ANY localhost port. Use explicit origins only.
        // Configure additional origins via app.cors.allowed-origins property.
        configuration.setAllowedOrigins(allowedOrigins);
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        // Enumerate required headers explicitly rather than using "*".
        // Wildcards bypass security review and could allow future abuse if an
        // attacker finds a way to influence header names.
        configuration.setAllowedHeaders(Arrays.asList(
                "Authorization",
                "Content-Type",
                "Accept",
                "X-Tenant-ID",
                "X-Requested-With",
                "X-XSRF-TOKEN",
                "Cache-Control",
                "Origin"
        ));
        configuration.setExposedHeaders(Arrays.asList("Authorization", "X-Tenant-ID"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public org.springframework.security.access.expression.method.MethodSecurityExpressionHandler methodSecurityExpressionHandler(
            org.springframework.security.access.PermissionEvaluator permissionEvaluator) {
        org.springframework.security.access.expression.method.DefaultMethodSecurityExpressionHandler expressionHandler = new org.springframework.security.access.expression.method.DefaultMethodSecurityExpressionHandler();
        expressionHandler.setPermissionEvaluator(permissionEvaluator);
        return expressionHandler;
    }
}
