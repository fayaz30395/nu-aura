package com.nulogic.infrastructure.websocket;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

@DisplayName("WebSocketConfig")
class WebSocketConfigTest {

    @Test
    @DisplayName("broadcasts shutdown notice through local broker")
    void broadcastsShutdownNoticeThroughLocalBroker() {
        SimpMessagingTemplate messagingTemplate = mock(SimpMessagingTemplate.class);
        WebSocketConfig config = new WebSocketConfig();
        config.setMessagingTemplate(messagingTemplate);

        config.broadcastShutdownNotice();

        ArgumentCaptor<Map<String, Object>> payloadCaptor = ArgumentCaptor.forClass(Map.class);
        verify(messagingTemplate).convertAndSend(
                org.mockito.ArgumentMatchers.eq("/topic/system.shutdown"),
                payloadCaptor.capture()
        );
        assertThat(payloadCaptor.getValue())
                .containsEntry("type", "SYSTEM_SHUTDOWN")
                .containsEntry("reason", "pod-shutdown")
                .containsEntry("reconnect", true)
                .containsKey("timestamp");
    }

    @Test
    @DisplayName("does not fail shutdown when local broker is absent")
    void doesNotFailShutdownWhenLocalBrokerIsAbsent() {
        WebSocketConfig config = new WebSocketConfig();

        assertThatCode(config::broadcastShutdownNotice).doesNotThrowAnyException();
    }
}
