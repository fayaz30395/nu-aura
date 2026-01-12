package com.hrms.common.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Filter for API key authentication.
 * Checks for X-API-Key header and validates against stored keys.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ApiKeyAuthenticationFilter extends OncePerRequestFilter {

    private static final String API_KEY_HEADER = "X-API-Key";
    private static final String API_PATH_PREFIX = "/api/v1/external";

    private final ApiKeyService apiKeyService;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String requestUri = request.getRequestURI();

        // Only apply to external API paths
        if (!requestUri.startsWith(API_PATH_PREFIX)) {
            filterChain.doFilter(request, response);
            return;
        }

        String apiKey = request.getHeader(API_KEY_HEADER);

        if (apiKey == null || apiKey.isEmpty()) {
            log.warn("Missing API key for external API request: {}", requestUri);
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"Missing API key\",\"message\":\"X-API-Key header is required\"}");
            return;
        }

        String clientIp = getClientIp(request);
        Optional<ApiKey> validKey = apiKeyService.validateApiKey(apiKey, clientIp);

        if (validKey.isEmpty()) {
            log.warn("Invalid API key attempt from IP: {}", clientIp);
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"Invalid API key\",\"message\":\"The provided API key is invalid or expired\"}");
            return;
        }

        ApiKey key = validKey.get();

        // Create authentication with API key scopes as authorities
        List<SimpleGrantedAuthority> authorities = key.getScopes().stream()
                .map(scope -> new SimpleGrantedAuthority("SCOPE_" + scope))
                .collect(Collectors.toList());

        UsernamePasswordAuthenticationToken authentication =
                new UsernamePasswordAuthenticationToken(
                        "api-key:" + key.getName(),
                        null,
                        authorities
                );

        // Store tenant ID in authentication details
        authentication.setDetails(new ApiKeyAuthenticationDetails(key.getTenantId(), key.getId(), key.getScopes()));

        SecurityContextHolder.getContext().setAuthentication(authentication);
        log.debug("API key authentication successful for key: {}", key.getName());

        filterChain.doFilter(request, response);
    }

    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    /**
     * Details object for API key authentication.
     */
    public record ApiKeyAuthenticationDetails(
            java.util.UUID tenantId,
            java.util.UUID apiKeyId,
            java.util.Set<String> scopes
    ) {}
}
