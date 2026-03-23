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

/**
 * WebSocket security configuration.
 * Authenticates WebSocket connections using JWT tokens.
 */
@Configuration
@RequiredArgsConstructor
@Slf4j
@Order(Ordered.HIGHEST_PRECEDENCE + 99)
public class WebSocketSecurityConfig implements WebSocketMessageBrokerConfigurer {

    private final JwtTokenProvider jwtTokenProvider;

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

                if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
                    // Extract JWT token from headers
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

                            UsernamePasswordAuthenticationToken auth =
                                    new UsernamePasswordAuthenticationToken(username, null, Collections.emptyList());

                            SecurityContextHolder.getContext().setAuthentication(auth);
                            accessor.setUser(auth);

                            log.debug("WebSocket connection authenticated for user: {}", username);
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

                return message;
            }
        });
    }
}
