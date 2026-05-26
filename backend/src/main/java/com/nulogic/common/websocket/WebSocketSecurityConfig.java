package com.nulogic.common.websocket;

import com.nulogic.common.security.JwtTokenProvider;
import io.jsonwebtoken.JwtException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * WebSocket security configuration.
 * Authenticates WebSocket connections using JWT tokens and validates
 * SUBSCRIBE destinations to enforce tenant isolation.
 */
@Configuration
@RequiredArgsConstructor
@Slf4j
@Order(Ordered.HIGHEST_PRECEDENCE + 99)
public class WebSocketSecurityConfig implements WebSocketMessageBrokerConfigurer {

    /**
     * Pattern to extract tenantId from tenant-scoped topic paths.
     * Matches: /topic/tenant/{uuid}/...
     */
    private static final Pattern TENANT_TOPIC_PATTERN =
            Pattern.compile("^/topic/tenant/([0-9a-fA-F\\-]{36})/.*$");

    /**
     * Explicit allowlist of public (non-tenant) destination prefixes.
     * Audit M-H3: the previous default-allow behavior accepted subscriptions to
     * arbitrary {@code /topic/*} destinations; this allowlist makes the policy
     * default-deny with only the strictly-public endpoints whitelisted.
     */
    private static final Set<String> PUBLIC_TOPIC_PREFIXES = Set.of(
            "/user/queue/",         // Spring's per-principal queue prefix (intrinsically authenticated)
            "/topic/health",        // ops/observability
            "/topic/announcements", // tenant-public announcements
            "/topic/system.shutdown" // graceful STOMP drain during rolling deploys
    );

    private final JwtTokenProvider jwtTokenProvider;

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

                if (accessor == null) {
                    return message;
                }

                StompCommand command = accessor.getCommand();

                if (StompCommand.CONNECT.equals(command)) {
                    handleConnect(accessor);
                } else if (StompCommand.SUBSCRIBE.equals(command)) {
                    handleSubscribe(accessor);
                }

                return message;
            }
        });
    }

    /**
     * Authenticate WebSocket CONNECT frames using either a STOMP Authorization
     * header or the httpOnly access-token cookie copied from the handshake.
     */
    private void handleConnect(StompHeaderAccessor accessor) {
        String token = resolveAccessToken(accessor);

        if (token == null) {
            // SEC-006 FIX: Reject unauthenticated WebSocket connections
            log.warn("WebSocket CONNECT rejected: missing access token");
            throw new org.springframework.messaging.MessageDeliveryException(
                    "Authentication required for WebSocket connections");
        }

        try {
            if (jwtTokenProvider.validateToken(token)) {
                String username = jwtTokenProvider.getUsernameFromToken(token);
                UUID userId = jwtTokenProvider.getUserIdFromToken(token);

                // Extract tenantId from token and store in session attributes
                // so SUBSCRIBE validation can access it
                UUID tenantId = jwtTokenProvider.getTenantIdFromToken(token);

                if (userId == null) {
                    log.warn("WebSocket CONNECT rejected: token missing userId claim");
                    throw new org.springframework.messaging.MessageDeliveryException(
                            "Authentication token missing user identity");
                }

                UsernamePasswordAuthenticationToken auth =
                        new UsernamePasswordAuthenticationToken(userId.toString(), null, Collections.emptyList());

                SecurityContextHolder.getContext().setAuthentication(auth);
                accessor.setUser(auth);

                Map<String, Object> sessionAttributes = accessor.getSessionAttributes();
                if (sessionAttributes == null) {
                    sessionAttributes = new HashMap<>();
                    accessor.setSessionAttributes(sessionAttributes);
                }

                // Store tenantId in session attributes for later SUBSCRIBE validation
                if (tenantId != null) {
                    sessionAttributes.put("tenantId", tenantId);
                }
                sessionAttributes.put("username", username);

                log.debug("WebSocket connection authenticated for userId: {}, username: {}, tenant: {}",
                        userId, username, tenantId);
            } else {
                // SEC-006 FIX: Reject connections with invalid tokens
                log.warn("WebSocket CONNECT rejected: token validation failed");
                throw new org.springframework.messaging.MessageDeliveryException(
                        "Invalid authentication token");
            }
        } catch (JwtException | IllegalArgumentException e) {
            // SEC-006 FIX: Reject connections with malformed tokens
            log.warn("WebSocket authentication failed: invalid token ({})", e.getClass().getSimpleName());
            throw new org.springframework.messaging.MessageDeliveryException(
                    "Authentication failed");
        }
    }

    private String resolveAccessToken(StompHeaderAccessor accessor) {
        String authHeader = accessor.getFirstNativeHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }

        Map<String, Object> sessionAttributes = accessor.getSessionAttributes();
        if (sessionAttributes == null) {
            return null;
        }

        Object cookieToken = sessionAttributes.get(WebSocketAuthTokenHandshakeInterceptor.ACCESS_TOKEN_ATTRIBUTE);
        if (cookieToken instanceof String token && !token.isBlank()) {
            return token;
        }
        return null;
    }

    /**
     * Validate SUBSCRIBE destinations to enforce tenant isolation.
     *
     * <p>If a user subscribes to a tenant-scoped topic (e.g. /topic/tenant/{tenantId}/broadcast),
     * the tenantId in the path must match the tenantId from the user's JWT token.
     * This prevents cross-tenant data leakage via WebSocket subscriptions.</p>
     */
    private void handleSubscribe(StompHeaderAccessor accessor) {
        String destination = accessor.getDestination();
        if (destination == null) {
            return;
        }

        if (accessor.getUser() == null) {
            log.warn("WebSocket SUBSCRIBE rejected: unauthenticated session for destination {}", destination);
            throw new org.springframework.messaging.MessageDeliveryException(
                    "Authentication required for WebSocket subscriptions");
        }

        Matcher matcher = TENANT_TOPIC_PATTERN.matcher(destination);
        if (!matcher.matches()) {
            // Audit M-H3: default-deny on non-tenant topics. Only explicitly-public
            // destination prefixes are accepted; everything else is rejected.
            if (PUBLIC_TOPIC_PREFIXES.stream().anyMatch(destination::startsWith)) {
                log.debug("WebSocket SUBSCRIBE allowed (public): destination={}", destination);
                return;
            }
            log.warn("WebSocket SUBSCRIBE rejected: destination is not tenant-prefixed and not in public allowlist: {}",
                    destination);
            throw new org.springframework.messaging.MessageDeliveryException(
                    "Subscription denied: topic must be tenant-prefixed or in the public allowlist");
        }

        String topicTenantIdStr = matcher.group(1);
        UUID topicTenantId;
        try {
            topicTenantId = UUID.fromString(topicTenantIdStr);
        } catch (IllegalArgumentException e) {
            log.warn("WebSocket SUBSCRIBE rejected: invalid tenantId in topic path: {}", topicTenantIdStr);
            throw new org.springframework.messaging.MessageDeliveryException(
                    "Invalid tenant in subscription path");
        }

        // Retrieve the authenticated user's tenantId from session attributes
        Object userTenantIdAttribute = accessor.getSessionAttributes() != null
                ? accessor.getSessionAttributes().get("tenantId")
                : null;

        if (!(userTenantIdAttribute instanceof UUID userTenantId)) {
            log.warn("WebSocket SUBSCRIBE rejected: no tenantId in session for destination {}", destination);
            throw new org.springframework.messaging.MessageDeliveryException(
                    "Tenant context not available; re-authenticate");
        }

        if (!userTenantId.equals(topicTenantId)) {
            log.warn("WebSocket SUBSCRIBE rejected: tenant mismatch — user tenant={}, topic tenant={}, destination={}",
                    userTenantId, topicTenantId, destination);
            throw new org.springframework.messaging.MessageDeliveryException(
                    "Cross-tenant subscription not permitted");
        }

        log.debug("WebSocket SUBSCRIBE allowed: tenant={}, destination={}", userTenantId, destination);
    }
}
