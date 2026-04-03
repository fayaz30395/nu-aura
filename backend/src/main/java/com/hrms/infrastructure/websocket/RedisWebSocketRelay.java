package com.hrms.infrastructure.websocket;

import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

/**
 * Redis-backed relay for WebSocket messages, enabling multi-pod delivery.
 *
 * <p><b>Problem:</b> Spring's SimpleMessageBroker is in-memory. In a horizontally
 * scaled deployment (K8s HPA, 2-10 pods), a user connected to Pod A won't
 * receive messages sent by Pod B.</p>
 *
 * <p><b>Solution:</b> Every WebSocket send is published to a Redis Pub/Sub channel.
 * All pods subscribe to that channel and forward received messages to their
 * locally connected WebSocket sessions via SimpMessagingTemplate.</p>
 *
 * <p>Usage: inject this bean instead of calling SimpMessagingTemplate directly.</p>
 */
@Component
@Slf4j
public class RedisWebSocketRelay {

    /**
     * Redis Pub/Sub channel name for WebSocket message fan-out.
     */
    public static final String WS_RELAY_CHANNEL = "ws:relay";

    private final RedisTemplate<String, Object> redisTemplate;
    private final SimpMessagingTemplate messagingTemplate;
    private final ChannelTopic topic;

    public RedisWebSocketRelay(RedisTemplate<String, Object> redisTemplate,
                               SimpMessagingTemplate messagingTemplate) {
        this.redisTemplate = redisTemplate;
        this.messagingTemplate = messagingTemplate;
        this.topic = new ChannelTopic(WS_RELAY_CHANNEL);
    }

    // ======================== Publishing (outbound) ========================

    /**
     * Publish a topic message to Redis so all pods deliver it.
     *
     * @param destination STOMP destination (e.g. "/topic/broadcast")
     * @param payload     message payload
     */
    public void convertAndSend(String destination, Object payload) {
        RedisWebSocketMessage message = RedisWebSocketMessage.builder()
                .sendType(RedisWebSocketMessage.SendType.TOPIC)
                .destination(destination)
                .payload(payload)
                .build();

        publish(message);
    }

    /**
     * Publish a user-targeted message to Redis so all pods deliver it.
     *
     * @param userId      the target user's principal name
     * @param destination STOMP user destination (e.g. "/queue/notifications")
     * @param payload     message payload
     */
    public void convertAndSendToUser(String userId, String destination, Object payload) {
        RedisWebSocketMessage message = RedisWebSocketMessage.builder()
                .sendType(RedisWebSocketMessage.SendType.USER)
                .userId(userId)
                .destination(destination)
                .payload(payload)
                .build();

        publish(message);
    }

    // ======================== Receiving (inbound from Redis) ========================

    /**
     * Called by {@link RedisWebSocketSubscriber} when a message arrives from Redis.
     * Forwards the message to locally connected WebSocket sessions.
     */
    public void onMessage(RedisWebSocketMessage message) {
        try {
            if (message.getSendType() == RedisWebSocketMessage.SendType.USER) {
                messagingTemplate.convertAndSendToUser(
                        message.getUserId(),
                        message.getDestination(),
                        message.getPayload()
                );
                log.trace("Relayed user message to {} at {}", message.getUserId(), message.getDestination());
            } else {
                messagingTemplate.convertAndSend(
                        message.getDestination(),
                        message.getPayload()
                );
                log.trace("Relayed topic message to {}", message.getDestination());
            }
        } catch (Exception e) { // Intentional broad catch — Redis pub/sub error boundary
            log.error("Failed to relay WebSocket message from Redis: destination={}, sendType={}",
                    message.getDestination(), message.getSendType(), e);
        }
    }

    // ======================== Internal ========================

    private void publish(RedisWebSocketMessage message) {
        try {
            redisTemplate.convertAndSend(topic.getTopic(), message);
            log.debug("Published WebSocket message to Redis: destination={}, sendType={}",
                    message.getDestination(), message.getSendType());
        } catch (Exception e) { // Intentional broad catch — Redis pub/sub error boundary
            // Fallback: deliver locally if Redis is down (single-pod graceful degradation)
            log.warn("Redis publish failed, falling back to local delivery: {}", e.getMessage());
            onMessage(message);
        }
    }
}
