package com.hrms.common.config;

import com.hrms.common.security.JwtAuthenticationFilter;
import com.hrms.common.security.RateLimitingFilter;
import com.hrms.common.security.TenantFilter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
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
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Value("${app.cors.allowed-origins:http://localhost:3000,http://localhost:3001,http://localhost:8080}")
    private String allowedOriginsStr;

    @Value("${app.security.csrf.enabled:true}")
    private boolean csrfEnabled;

    @Autowired
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @Autowired
    private TenantFilter tenantFilter;

    @Autowired
    private RateLimitingFilter rateLimitingFilter;

    @Autowired
    private UserDetailsService userDetailsService;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
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
                        .xssProtection(xss -> xss.disable()))
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
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
                        .anyRequest().authenticated())
                .authenticationProvider(authenticationProvider())
                .addFilterBefore(tenantFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(rateLimitingFilter, TenantFilter.class)
                .addFilterAfter(jwtAuthenticationFilter, TenantFilter.class);

        // Configure CSRF protection
        if (csrfEnabled) {
            // Use cookie-based CSRF token (double-submit pattern)
            // The token is stored in a cookie and must be sent back in a header
            CookieCsrfTokenRepository csrfTokenRepository = CookieCsrfTokenRepository.withHttpOnlyFalse();
            csrfTokenRepository.setCookiePath("/");

            CsrfTokenRequestAttributeHandler requestHandler = new CsrfTokenRequestAttributeHandler();
            // Don't defer loading the CSRF token
            requestHandler.setCsrfRequestAttributeName(null);

            http.csrf(csrf -> csrf
                    .csrfTokenRepository(csrfTokenRepository)
                    .csrfTokenRequestHandler(requestHandler)
                    // Ignore CSRF for auth endpoints (they're public and don't require existing
                    // auth)
                    .ignoringRequestMatchers("/api/v1/auth/**")
                    // Ignore CSRF for external token-based endpoints
                    .ignoringRequestMatchers("/api/v1/esignature/external/**")
                    .ignoringRequestMatchers("/api/v1/public/offers/**")
                    .ignoringRequestMatchers("/api/v1/exit/interview/public/**")
                    // Ignore CSRF for actuator health checks
                    .ignoringRequestMatchers("/actuator/health", "/actuator/health/**")
                    // Ignore CSRF for WebSocket/SockJS transports
                    .ignoringRequestMatchers("/ws/**")
                    // Ignore CSRF for SSE streaming endpoints (authenticated via cookies, but
                    // native fetch may not have XSRF token on first request)
                    .ignoringRequestMatchers("/api/v1/fluence/chat"));
        } else {
            http.csrf(AbstractHttpConfigurer::disable);
        }

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        List<String> allowedOrigins = Arrays.asList(allowedOriginsStr.split(","));
        // Use allowedOriginPatterns to support wildcard ports (e.g., http://localhost:*)
        // This is required when allowCredentials is true and the origin port varies
        // (e.g., Next.js dev server on random ports, preview servers, etc.)
        List<String> patterns = new java.util.ArrayList<>(allowedOrigins);
        patterns.add("http://localhost:*");
        configuration.setAllowedOriginPatterns(patterns);
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
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
