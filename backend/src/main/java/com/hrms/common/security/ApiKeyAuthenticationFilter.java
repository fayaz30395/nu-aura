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
import java.util.Set;
import java.util.UUID;

/**
 * Filter for API key authentication.
 * Checks for X-API-Key header and validates against stored keys.
 *
 * <p>Supports authentication for:</p>
 * <ul>
 *   <li>/api/v1/external/* - External integration APIs (required)</li>
 *   <li>/api/webhooks/* - Webhook management APIs (optional, alternative to JWT)</li>
 * </ul>
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ApiKeyAuthenticationFilter extends OncePerRequestFilter {

    private static final String API_KEY_HEADER = "X-API-Key";
    private static final String EXTERNAL_API_PATH_PREFIX = "/api/v1/external";
    private static final String WEBHOOK_API_PATH_PREFIX = "/api/webhooks";

    private final ApiKeyService apiKeyService;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String requestUri = request.getRequestURI();

        // Check if this is an API-key-eligible path
        boolean isExternalApi = requestUri.startsWith(EXTERNAL_API_PATH_PREFIX);
        boolean isWebhookApi = requestUri.startsWith(WEBHOOK_API_PATH_PREFIX);

        // Skip if not an API-key-eligible path
        if (!isExternalApi && !isWebhookApi) {
            filterChain.doFilter(request, response);
            return;
        }

        String apiKey = request.getHeader(API_KEY_HEADER);

        // For webhook APIs, API key is optional (can use JWT instead)
        if (isWebhookApi && (apiKey == null || apiKey.isEmpty())) {
            // Let the request proceed - JWT filter will handle authentication
            filterChain.doFilter(request, response);
            return;
        }

        // For external APIs, API key is required
        if (isExternalApi && (apiKey == null || apiKey.isEmpty())) {
            log.warn("Missing API key for external API request: {}", requestUri);
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"Missing API key\",\"message\":\"X-API-Key header is required\"}");
            return;
        }

        // Validate the API key
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

        // Set tenant context for downstream filters and services
        TenantContext.setCurrentTenant(key.getTenantId());

        SecurityContextHolder.getContext().setAuthentication(authentication);
        log.debug("API key authentication successful for key: {} (tenant: {})", key.getName(), key.getTenantId());

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
            UUID tenantId,
            UUID apiKeyId,
            Set<String> scopes
    ) {}
}
