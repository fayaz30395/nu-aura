package com.hrms.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    /**
     * Comma-separated list of allowed origins for WebSocket connections.
     * Must match the CORS policy defined in SecurityConfig.
     * NEVER use "*" in production — Cross-Site WebSocket Hijacking (CSWSH) risk.
     */
    @Value("${app.cors.allowed-origins:http://localhost:3000,http://localhost:3001}")
    private String allowedOriginsStr;

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Enable a simple memory-based message broker for destinations prefixed
        // with "/topic" (broadcast) and "/queue" (user-targeted).
        // Note: The SimpleMessageBroker remains for local session dispatch.
        // Cross-pod fan-out is handled by RedisWebSocketRelay (Redis Pub/Sub)
        // which publishes to all pods before each pod delivers locally.
        config.enableSimpleBroker("/topic", "/queue");

        // Designate the prefix for messages that are bound for methods annotated with
        // @MessageMapping
        config.setApplicationDestinationPrefixes("/app");

        // User destination prefix for convertAndSendToUser (e.g. /user/{userId}/queue/notifications)
        config.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Register the "/ws" endpoint with SockJS fallback.
        // Allowed origins are driven by config — no wildcard "*" permitted.
        String[] allowedOrigins = allowedOriginsStr.split(",");
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns(allowedOrigins)
                .withSockJS();
    }
}
