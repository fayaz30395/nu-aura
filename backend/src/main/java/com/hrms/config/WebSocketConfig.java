package com.hrms.config;

import com.hrms.infrastructure.websocket.RedisWebSocketRelay;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Lazy;
import org.springframework.lang.Nullable;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketTransportRegistration;

import java.time.Instant;
import java.util.Map;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private static final Logger log = LoggerFactory.getLogger(WebSocketConfig.class);

    /**
     * Comma-separated list of allowed origins for WebSocket connections.
     * Must match the CORS policy defined in SecurityConfig.
     * NEVER use "*" in production — Cross-Site WebSocket Hijacking (CSWSH) risk.
     */
    @Value("${app.cors.allowed-origins:http://localhost:3000,http://localhost:3001}")
    private String allowedOriginsStr;

    /**
     * Optional — the Redis-fanout relay used to publish STOMP frames so every
     * pod (not just the one a client happens to be connected to) sees them.
     * Wired via setter to keep field injection out of the static config class
     * and to leave dev/test contexts that don't load the relay (no Redis)
     * able to skip the drain broadcast cleanly.
     */
    private RedisWebSocketRelay redisWebSocketRelay;

    @Autowired(required = false)
    public void setRedisWebSocketRelay(@Lazy @Nullable RedisWebSocketRelay redisWebSocketRelay) {
        this.redisWebSocketRelay = redisWebSocketRelay;
    }

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

    /**
     * Wave-10 P2-6 — STOMP graceful drain on pod shutdown.
     *
     * <p>When the pod receives SIGTERM (rolling deploy, scale-down, node drain),
     * Spring runs @PreDestroy hooks before the embedded Tomcat closes its
     * sockets. If we did nothing, the in-flight WebSocket TCP connections
     * would be RST'd, and SockJS / STOMP clients would see an unexpected
     * close and retry with exponential backoff — which during a rolling deploy
     * means the client may stampede the next pod while it is still warming up.
     *
     * <p>Instead we publish a {@code SystemNotification} frame on the
     * {@code /topic/system.shutdown} broadcast channel via the Redis relay,
     * so every pod (including this one) forwards the notice to every
     * subscribed client. The frontend SocketProvider already listens on this
     * topic and treats it as an instruction to disconnect and immediately
     * reconnect — letting the SockJS load balancer steer the client to a
     * peer pod that is still in the Ready state.
     *
     * <p>If the relay bean is absent (dev/test without Redis), we log and skip
     * the broadcast — the underlying TCP close is still graceful thanks to
     * {@code server.shutdown=graceful} in application.yml, just without the
     * extra hint to the client.
     */
    @PreDestroy
    public void broadcastShutdownNotice() {
        if (redisWebSocketRelay == null) {
            log.info("STOMP shutdown drain skipped — RedisWebSocketRelay bean is not present "
                    + "(likely a dev/test profile without Redis). Tomcat will still close sockets gracefully.");
            return;
        }
        try {
            Map<String, Object> notification = Map.of(
                    "type", "SYSTEM_SHUTDOWN",
                    "reason", "pod-shutdown",
                    "message", "Server is shutting down. Please reconnect.",
                    "reconnect", true,
                    "timestamp", Instant.now().toString()
            );
            redisWebSocketRelay.convertAndSend("/topic/system.shutdown", notification);
            log.info("STOMP shutdown notice broadcast on /topic/system.shutdown — clients will reconnect to peer pods.");
        } catch (Exception ex) {
            // Never block shutdown on a broadcast failure — log and move on.
            log.warn("Failed to broadcast STOMP shutdown notice: {}. Sockets will close gracefully via Tomcat.",
                    ex.getMessage());
        }
    }
}
