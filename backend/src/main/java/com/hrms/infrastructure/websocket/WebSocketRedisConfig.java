package com.hrms.infrastructure.websocket;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;

/**
 * Configures Redis Pub/Sub for WebSocket message relay across multiple pods.
 *
 * <p>This configuration registers a {@link RedisMessageListenerContainer} that
 * subscribes to the {@code ws:relay} Redis channel. When any pod publishes a
 * WebSocket message to this channel, every pod's {@link RedisWebSocketSubscriber}
 * receives it and forwards it to locally connected STOMP sessions.</p>
 *
 * <p>Uses the existing {@link RedisConnectionFactory} auto-configured by
 * Spring Boot from application.yml redis settings.</p>
 */
@Configuration
public class WebSocketRedisConfig {

    @Bean
    public ChannelTopic webSocketRelayTopic() {
        return new ChannelTopic(RedisWebSocketRelay.WS_RELAY_CHANNEL);
    }

    @Bean
    public RedisMessageListenerContainer webSocketRedisListenerContainer(
            RedisConnectionFactory connectionFactory,
            RedisWebSocketSubscriber subscriber,
            ChannelTopic webSocketRelayTopic) {

        RedisMessageListenerContainer container = new RedisMessageListenerContainer();
        container.setConnectionFactory(connectionFactory);
        container.addMessageListener(subscriber, webSocketRelayTopic);
        return container;
    }
}
