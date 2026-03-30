package com.hrms.infrastructure.websocket;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.stereotype.Component;

/**
 * Redis Pub/Sub subscriber that listens on the WebSocket relay channel.
 * When a message arrives, it delegates to {@link RedisWebSocketRelay#onMessage}
 * to forward the payload to locally connected WebSocket sessions.
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class RedisWebSocketSubscriber implements MessageListener {

    private final RedisWebSocketRelay relay;
    private final GenericJackson2JsonRedisSerializer serializer = new GenericJackson2JsonRedisSerializer();

    @Override
    public void onMessage(Message message, byte[] pattern) {
        try {
            RedisWebSocketMessage wsMessage = (RedisWebSocketMessage) serializer.deserialize(message.getBody());
            if (wsMessage != null) {
                relay.onMessage(wsMessage);
            }
        } catch (Exception e) { // Intentional broad catch — Redis pub/sub error boundary
            log.error("Failed to deserialize Redis WebSocket relay message", e);
        }
    }
}
