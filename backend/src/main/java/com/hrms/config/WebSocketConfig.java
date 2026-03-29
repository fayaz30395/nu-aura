package com.hrms.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketTransportRegistration;

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
        ThreadPoolTaskScheduler heartbeatScheduler = new ThreadPoolTaskScheduler();
        heartbeatScheduler.setPoolSize(1);
        heartbeatScheduler.setThreadNamePrefix("ws-heartbeat-");
        heartbeatScheduler.initialize();

        config.enableSimpleBroker("/topic", "/queue")
                .setHeartbeatValue(new long[]{10000, 10000}) // server→client and client→server heartbeat: 10s
                .setTaskScheduler(heartbeatScheduler);

        // Designate the prefix for messages that are bound for methods annotated with
        // @MessageMapping
        config.setApplicationDestinationPrefixes("/app");

        // User destination prefix for convertAndSendToUser (e.g. /user/{userId}/queue/notifications)
        config.setUserDestinationPrefix("/user");
    }

    @Override
    public void configureWebSocketTransport(WebSocketTransportRegistration registration) {
        // Limit inbound message size to 64KB to prevent abuse / memory exhaustion
        registration.setMessageSizeLimit(65536);
        // Limit send buffer size to 512KB
        registration.setSendBufferSizeLimit(512 * 1024);
        // Timeout for send operations: 20 seconds
        registration.setSendTimeLimit(20000);
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
