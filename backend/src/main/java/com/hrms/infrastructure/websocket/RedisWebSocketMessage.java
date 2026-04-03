package com.hrms.infrastructure.websocket;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

/**
 * Envelope for WebSocket messages relayed through Redis Pub/Sub.
 * When a pod needs to send a WebSocket message, it publishes this envelope
 * to a Redis channel. All pods (including the sender) receive it and forward
 * the payload to their locally connected WebSocket sessions.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RedisWebSocketMessage implements Serializable {

    private static final long serialVersionUID = 1L;
    /**
     * TOPIC or USER — determines how the message is dispatched locally.
     */
    private SendType sendType;
    /**
     * STOMP destination (e.g. "/topic/tenant.{id}.notifications").
     */
    private String destination;
    /**
     * For USER sends: the principal name (userId) to target.
     * Null for TOPIC sends.
     */
    private String userId;
    /**
     * The serialized message payload (already JSON-compatible).
     */
    private Object payload;

    /**
     * The type of send operation.
     */
    public enum SendType {
        /**
         * convertAndSend to a topic destination
         */
        TOPIC,
        /**
         * convertAndSendToUser targeting a specific user
         */
        USER
    }
}
