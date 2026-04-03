package com.hrms.common.websocket;

import com.hrms.common.security.JwtTokenProvider;
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
     * Authenticate WebSocket CONNECT frames using JWT from the Authorization header.
     */
    private void handleConnect(StompHeaderAccessor accessor) {
        String authHeader = accessor.getFirstNativeHeader("Authorization");

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            // SEC-006 FIX: Reject unauthenticated WebSocket connections
            log.warn("WebSocket CONNECT rejected: missing or invalid Authorization header");
            throw new org.springframework.messaging.MessageDeliveryException(
                    "Authentication required for WebSocket connections");
        }

        String token = authHeader.substring(7);

        try {
            if (jwtTokenProvider.validateToken(token)) {
                String username = jwtTokenProvider.getUsernameFromToken(token);

                // Extract tenantId from token and store in session attributes
                // so SUBSCRIBE validation can access it
                UUID tenantId = jwtTokenProvider.getTenantIdFromToken(token);

                UsernamePasswordAuthenticationToken auth =
                        new UsernamePasswordAuthenticationToken(username, null, Collections.emptyList());

                SecurityContextHolder.getContext().setAuthentication(auth);
                accessor.setUser(auth);

                // Store tenantId in session attributes for later SUBSCRIBE validation
                if (tenantId != null) {
                    accessor.getSessionAttributes().put("tenantId", tenantId);
                }

                log.debug("WebSocket connection authenticated for user: {}, tenant: {}", username, tenantId);
            } else {
                // SEC-006 FIX: Reject connections with invalid tokens
                log.warn("WebSocket CONNECT rejected: token validation failed");
                throw new org.springframework.messaging.MessageDeliveryException(
                        "Invalid authentication token");
            }
        } catch (JwtException | IllegalArgumentException e) {
            // SEC-006 FIX: Reject connections with malformed tokens
            log.warn("WebSocket authentication failed: {}", e.getMessage());
            throw new org.springframework.messaging.MessageDeliveryException(
                    "Authentication failed: " + e.getMessage());
        }
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

        Matcher matcher = TENANT_TOPIC_PATTERN.matcher(destination);
        if (!matcher.matches()) {
            // Not a tenant-scoped topic — allow (e.g. /user/queue/notifications)
            return;
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
        UUID userTenantId = accessor.getSessionAttributes() != null
                ? (UUID) accessor.getSessionAttributes().get("tenantId")
                : null;

        if (userTenantId == null) {
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
