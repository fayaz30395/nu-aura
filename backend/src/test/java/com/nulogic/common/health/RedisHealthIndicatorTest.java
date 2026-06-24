package com.nulogic.common.health;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.Status;
import org.springframework.data.redis.connection.RedisConnection;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.connection.RedisServerCommands;
import org.springframework.data.redis.core.RedisTemplate;

import java.util.Properties;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class RedisHealthIndicatorTest {

    private RedisTemplate<String, Object> redisTemplate;
    private RedisConnectionFactory connectionFactory;
    private RedisConnection connection;
    private RedisServerCommands commands;
    private RedisHealthIndicator indicator;

    @BeforeEach
    void setUp() {
        redisTemplate = mock();
        connectionFactory = mock();
        connection = mock();
        commands = mock();
        indicator = new RedisHealthIndicator(redisTemplate);

        when(redisTemplate.getConnectionFactory()).thenReturn(connectionFactory);
        when(connectionFactory.getConnection()).thenReturn(connection);
        when(connection.serverCommands()).thenReturn(commands);
    }

    @Test
    void healthReturnsUpWithMemoryDetailsWhenPingSucceeds() {
        Properties memory = new Properties();
        memory.setProperty("used_memory_human", "10M");
        memory.setProperty("maxmemory_human", "128M");
        when(connection.ping()).thenReturn("PONG");
        when(commands.info("memory")).thenReturn(memory);

        Health health = indicator.health();

        assertThat(health.getStatus()).isEqualTo(Status.UP);
        assertThat(health.getDetails())
                .containsEntry("usedMemory", "10M")
                .containsEntry("maxMemory", "128M")
                .containsKey("responseTimeMs");
    }

    @Test
    void healthStillReturnsUpWhenInfoCommandFails() {
        when(connection.ping()).thenReturn("PONG");
        when(commands.info("memory")).thenThrow(new RuntimeException("INFO disabled"));

        Health health = indicator.health();

        assertThat(health.getStatus()).isEqualTo(Status.UP);
        assertThat(health.getDetails()).containsKey("responseTimeMs");
        assertThat(health.getDetails()).doesNotContainKeys("usedMemory", "maxMemory");
    }

    @Test
    void healthReturnsUpWithWarningForUnexpectedPing() {
        when(connection.ping()).thenReturn("QUEUED");

        Health health = indicator.health();

        assertThat(health.getStatus()).isEqualTo(Status.UP);
        assertThat(health.getDetails())
                .containsEntry("warning", "Unexpected PING response: QUEUED");
    }

    @Test
    void healthReturnsUpWithWarningWhenRedisThrows() {
        when(connection.ping()).thenThrow(new RuntimeException("connection refused"));

        Health health = indicator.health();

        assertThat(health.getStatus()).isEqualTo(Status.UP);
        assertThat(health.getDetails().get("warning"))
                .isEqualTo("Redis unavailable: connection refused");
    }
}
