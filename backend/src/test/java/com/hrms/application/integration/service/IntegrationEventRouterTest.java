package com.hrms.application.integration.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.domain.integration.IntegrationConnector;
import com.hrms.domain.integration.IntegrationConnectorConfigEntity;
import com.hrms.domain.integration.IntegrationEvent;
import com.hrms.domain.kafka.FailedKafkaEvent;
import com.hrms.domain.kafka.FailedKafkaEvent.FailedEventStatus;
import com.hrms.infrastructure.kafka.repository.FailedKafkaEventRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Unit tests for IntegrationEventRouter.
 * Tests DLT persistence, event routing, and error handling.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("IntegrationEventRouter Tests")
class IntegrationEventRouterTest {

    private static final UUID TENANT_ID = UUID.randomUUID();
    private static final UUID ENTITY_ID = UUID.randomUUID();
    private static final String EVENT_TYPE = "employee.created";
    private static final String ENTITY_TYPE = "Employee";
    private static final String CONNECTOR_ID = "slack-connector";

    @Mock
    private ConnectorRegistry connectorRegistry;

    @Mock
    private IntegrationConnectorConfigService configService;

    @Mock
    private IntegrationEventLogService eventLogService;

    @Mock
    private FailedKafkaEventRepository failedKafkaEventRepository;

    @Mock
    private ObjectMapper objectMapper;

    @InjectMocks
    private IntegrationEventRouter integrationEventRouter;

    @Captor
    private ArgumentCaptor<FailedKafkaEvent> failedKafkaEventCaptor;

    private IntegrationEvent buildEvent(String eventType) {
        return new IntegrationEvent(eventType, TENANT_ID, ENTITY_ID, ENTITY_TYPE, Map.of(), Instant.now());
    }

    @Nested
    @DisplayName("publishToDlt")
    class PublishToDlt {

        @Test
        @DisplayName("Should store FailedKafkaEvent with correct fields")
        void shouldStoreFailedKafkaEventWithCorrectFields() throws Exception {
            // Given
            IntegrationEvent event = buildEvent(EVENT_TYPE);
            Exception exception = new RuntimeException("Connector timeout");
            String serializedPayload = "{\"eventType\":\"employee.created\"}";
            when(objectMapper.writeValueAsString(any())).thenReturn(serializedPayload);
            when(failedKafkaEventRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            // When
            integrationEventRouter.publishToDlt(event, CONNECTOR_ID, exception);

            // Then
            verify(failedKafkaEventRepository).save(failedKafkaEventCaptor.capture());
            FailedKafkaEvent saved = failedKafkaEventCaptor.getValue();

            assertThat(saved.getTopic()).isEqualTo("integration-events.dlt");
            assertThat(saved.getTargetTopic()).isEqualTo("integration-events");
            assertThat(saved.getPartition()).isEqualTo(0);
            assertThat(saved.getOffset()).isEqualTo(-1L);
            assertThat(saved.getStatus()).isEqualTo(FailedEventStatus.PENDING_REPLAY);
            assertThat(saved.getErrorMessage()).isEqualTo("Connector timeout");
            assertThat(saved.getReplayCount()).isEqualTo(0);
            assertThat(saved.getPayload()).isEqualTo(serializedPayload);
            assertThat(saved.isPayloadTruncated()).isFalse();
        }

        @Test
        @DisplayName("Should truncate payload when it exceeds MAX_PAYLOAD_LENGTH")
        void shouldTruncatePayloadWhenExceedingMaxLength() throws Exception {
            // Given
            IntegrationEvent event = buildEvent(EVENT_TYPE);
            Exception exception = new RuntimeException("error");
            // Build a string longer than MAX_PAYLOAD_LENGTH (500)
            String longPayload = "x".repeat(FailedKafkaEvent.MAX_PAYLOAD_LENGTH + 100);
            when(objectMapper.writeValueAsString(any())).thenReturn(longPayload);
            when(failedKafkaEventRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            // When
            integrationEventRouter.publishToDlt(event, CONNECTOR_ID, exception);

            // Then
            verify(failedKafkaEventRepository).save(failedKafkaEventCaptor.capture());
            FailedKafkaEvent saved = failedKafkaEventCaptor.getValue();
            assertThat(saved.getPayload()).hasSize(FailedKafkaEvent.MAX_PAYLOAD_LENGTH);
            assertThat(saved.isPayloadTruncated()).isTrue();
        }

        @Test
        @DisplayName("Should not truncate payload at exactly MAX_PAYLOAD_LENGTH")
        void shouldNotTruncatePayloadAtExactlyMaxLength() throws Exception {
            // Given
            IntegrationEvent event = buildEvent(EVENT_TYPE);
            Exception exception = new RuntimeException("error");
            String exactPayload = "x".repeat(FailedKafkaEvent.MAX_PAYLOAD_LENGTH);
            when(objectMapper.writeValueAsString(any())).thenReturn(exactPayload);
            when(failedKafkaEventRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            // When
            integrationEventRouter.publishToDlt(event, CONNECTOR_ID, exception);

            // Then
            verify(failedKafkaEventRepository).save(failedKafkaEventCaptor.capture());
            FailedKafkaEvent saved = failedKafkaEventCaptor.getValue();
            assertThat(saved.isPayloadTruncated()).isFalse();
        }

        @Test
        @DisplayName("Should handle ObjectMapper serialization failure gracefully")
        void shouldHandleObjectMapperFailureGracefully() throws Exception {
            // Given
            IntegrationEvent event = buildEvent(EVENT_TYPE);
            Exception connectorException = new RuntimeException("Connector error");
            when(objectMapper.writeValueAsString(any()))
                    .thenThrow(new JsonProcessingException("Serialization failed") {});

            // When — must not throw
            integrationEventRouter.publishToDlt(event, CONNECTOR_ID, connectorException);

            // Then — save must NOT be called when serialization fails
            verify(failedKafkaEventRepository, never()).save(any());
        }

        @Test
        @DisplayName("Should handle null exception message gracefully")
        void shouldHandleNullExceptionMessageGracefully() throws Exception {
            // Given
            IntegrationEvent event = buildEvent(EVENT_TYPE);
            Exception exception = new RuntimeException((String) null);
            String payload = "{\"errorMessage\":\"\"}";
            when(objectMapper.writeValueAsString(any())).thenReturn(payload);
            when(failedKafkaEventRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            // When
            integrationEventRouter.publishToDlt(event, CONNECTOR_ID, exception);

            // Then — should complete without NPE
            verify(failedKafkaEventRepository).save(failedKafkaEventCaptor.capture());
            assertThat(failedKafkaEventCaptor.getValue().getErrorMessage()).isNull();
        }
    }

    @Nested
    @DisplayName("routeToConnectors")
    class RouteToConnectors {

        private IntegrationConnectorConfigEntity buildConfig(String connectorId) {
            IntegrationConnectorConfigEntity config = mock(IntegrationConnectorConfigEntity.class);
            when(config.getConnectorId()).thenReturn(connectorId);
            return config;
        }

        @Test
        @DisplayName("Should dispatch event to matching connector")
        void shouldDispatchEventToMatchingConnector() {
            // Given
            IntegrationEvent event = buildEvent(EVENT_TYPE);
            IntegrationConnectorConfigEntity config = buildConfig(CONNECTOR_ID);
            when(configService.findActiveByEventSubscription(TENANT_ID, EVENT_TYPE))
                    .thenReturn(List.of(config));
            IntegrationConnector connector = mock(IntegrationConnector.class);
            when(connectorRegistry.getConnector(CONNECTOR_ID)).thenReturn(connector);

            // When
            integrationEventRouter.routeToConnectors(event);

            // Then
            verify(connector).handleEvent(event);
            verify(eventLogService).logSuccess(eq(event), eq(CONNECTOR_ID), anyLong());
        }

        @Test
        @DisplayName("Should dispatch event to multiple connectors")
        void shouldDispatchEventToMultipleConnectors() {
            // Given
            IntegrationEvent event = buildEvent(EVENT_TYPE);
            String connectorId2 = "jira-connector";
            IntegrationConnectorConfigEntity config1 = buildConfig(CONNECTOR_ID);
            IntegrationConnectorConfigEntity config2 = buildConfig(connectorId2);
            when(configService.findActiveByEventSubscription(TENANT_ID, EVENT_TYPE))
                    .thenReturn(List.of(config1, config2));

            IntegrationConnector connector1 = mock(IntegrationConnector.class);
            IntegrationConnector connector2 = mock(IntegrationConnector.class);
            when(connectorRegistry.getConnector(CONNECTOR_ID)).thenReturn(connector1);
            when(connectorRegistry.getConnector(connectorId2)).thenReturn(connector2);

            // When
            integrationEventRouter.routeToConnectors(event);

            // Then
            verify(connector1).handleEvent(event);
            verify(connector2).handleEvent(event);
            verify(eventLogService).logSuccess(eq(event), eq(CONNECTOR_ID), anyLong());
            verify(eventLogService).logSuccess(eq(event), eq(connectorId2), anyLong());
        }

        @Test
        @DisplayName("Should skip routing when no connectors are subscribed")
        void shouldSkipRoutingWhenNoConnectorsSubscribed() {
            // Given
            IntegrationEvent event = buildEvent("unknown.event.type");
            when(configService.findActiveByEventSubscription(TENANT_ID, "unknown.event.type"))
                    .thenReturn(List.of());

            // When
            integrationEventRouter.routeToConnectors(event);

            // Then
            verifyNoInteractions(connectorRegistry);
            verifyNoInteractions(eventLogService);
        }

        @Test
        @DisplayName("Should route failed connector event to DLT and continue processing others")
        void shouldRouteFailedEventToDltAndContinueProcessing() throws Exception {
            // Given
            IntegrationEvent event = buildEvent(EVENT_TYPE);
            String connectorId2 = "jira-connector";
            IntegrationConnectorConfigEntity config1 = buildConfig(CONNECTOR_ID);
            IntegrationConnectorConfigEntity config2 = buildConfig(connectorId2);
            when(configService.findActiveByEventSubscription(TENANT_ID, EVENT_TYPE))
                    .thenReturn(List.of(config1, config2));

            IntegrationConnector connector1 = mock(IntegrationConnector.class);
            IntegrationConnector connector2 = mock(IntegrationConnector.class);
            when(connectorRegistry.getConnector(CONNECTOR_ID)).thenReturn(connector1);
            when(connectorRegistry.getConnector(connectorId2)).thenReturn(connector2);

            doThrow(new RuntimeException("Connector 1 failed")).when(connector1).handleEvent(event);
            String payload = "{\"connectorId\":\"" + CONNECTOR_ID + "\"}";
            when(objectMapper.writeValueAsString(any())).thenReturn(payload);
            when(failedKafkaEventRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            // When
            integrationEventRouter.routeToConnectors(event);

            // Then — connector1 fails → DLT, connector2 still processes
            verify(eventLogService).logFailure(eq(event), eq(CONNECTOR_ID), anyString(), anyLong());
            verify(failedKafkaEventRepository).save(any(FailedKafkaEvent.class));
            verify(connector2).handleEvent(event);
            verify(eventLogService).logSuccess(eq(event), eq(connectorId2), anyLong());
        }

        @Test
        @DisplayName("Should handle unknown event type with no matching connectors")
        void shouldHandleUnknownEventTypeWithNoMatchingConnectors() {
            // Given
            IntegrationEvent event = buildEvent("nonexistent.event");
            when(configService.findActiveByEventSubscription(TENANT_ID, "nonexistent.event"))
                    .thenReturn(List.of());

            // When
            integrationEventRouter.routeToConnectors(event);

            // Then — DLT is NOT called; routing just returns early
            verifyNoInteractions(failedKafkaEventRepository);
            verifyNoInteractions(connectorRegistry);
        }
    }
}
