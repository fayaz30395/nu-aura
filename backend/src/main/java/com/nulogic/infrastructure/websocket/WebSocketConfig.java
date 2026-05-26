package com.nulogic.infrastructure.websocket;

import com.nulogic.common.websocket.WebSocketAuthTokenHandshakeInterceptor;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Lazy;
import org.springframework.lang.Nullable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketTransportRegistration;

import java.time.Instant;
import java.util.Arrays;
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
     * Optional local STOMP template for shutdown drain notices. Shutdown is a
     * local-pod event: only clients connected to this pod need to reconnect.
     * Avoid Redis here because Redis infrastructure can stop before this
     * @PreDestroy hook runs.
     */
    private SimpMessagingTemplate messagingTemplate;

    @Autowired(required = false)
    public void setMessagingTemplate(@Lazy @Nullable SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
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
        String[] allowedOrigins = Arrays.stream(allowedOriginsStr.split(","))
                .map(String::trim)
                .filter(origin -> !origin.isBlank())
                .toArray(String[]::new);
        if (allowedOrigins.length == 0) {
            throw new IllegalStateException("At least one WebSocket allowed origin must be configured");
        }
        for (String origin : allowedOrigins) {
            if ("*".equals(origin)) {
                throw new IllegalStateException("Wildcard WebSocket origin is not allowed");
            }
        }
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns(allowedOrigins)
                .addInterceptors(new WebSocketAuthTokenHandshakeInterceptor())
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
     * {@code /topic/system.shutdown} broadcast channel through the local STOMP
     * broker. The frontend SocketProvider already listens on this topic and
     * treats it as an instruction to disconnect and immediately reconnect —
     * letting the SockJS load balancer steer the client to a peer pod that is
     * still in the Ready state.
     *
     * <p>If the local broker template is absent, we log and skip the broadcast.
     * The underlying TCP close is still graceful thanks to
     * {@code server.shutdown=graceful} in application.yml.
     */
    @PreDestroy
    public void broadcastShutdownNotice() {
        if (messagingTemplate == null) {
            log.info("STOMP shutdown drain skipped — local SimpMessagingTemplate is not present. "
                    + "Tomcat will still close sockets gracefully.");
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
            messagingTemplate.convertAndSend("/topic/system.shutdown", notification);
            log.info("STOMP shutdown notice broadcast on /topic/system.shutdown — clients will reconnect to peer pods.");
        } catch (Exception ex) {
            // Never block shutdown on a broadcast failure — log and move on.
            log.warn("Failed to broadcast STOMP shutdown notice: {}. Sockets will close gracefully via Tomcat.",
                    ex.getMessage());
        }
    }
}
