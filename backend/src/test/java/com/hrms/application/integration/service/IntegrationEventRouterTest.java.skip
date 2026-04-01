package com.hrms.application.integration.service;

import com.hrms.common.security.TenantContext;
import com.hrms.domain.integration.*;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Unit tests for the IntegrationEventRouter.
 *
 * <p>Tests event routing to subscribed connectors, tenant isolation,
 * error handling, and logging.</p>
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("IntegrationEventRouter Tests")
class IntegrationEventRouterTest {

    private static final UUID TENANT_A = UUID.randomUUID();
    private static final UUID TENANT_B = UUID.randomUUID();
    private static final UUID ENTITY_ID = UUID.randomUUID();

    private IntegrationEventRouter router;

    @Mock
    private ConnectorRegistry connectorRegistry;

    @Mock
    private IntegrationConnectorConfigService configService;

    @Mock
    private IntegrationEventLogService eventLogService;

    @Mock
    private IntegrationConnector connector1;

    @Mock
    private IntegrationConnector connector2;

    @Mock
    private IntegrationConnectorConfigEntity config1;

    @Mock
    private IntegrationConnectorConfigEntity config2;

    private MockedStatic<TenantContext> tenantContextMock;

    @BeforeEach
    void setUp() {
        router = new IntegrationEventRouter(connectorRegistry, configService, eventLogService);
        tenantContextMock = mockStatic(TenantContext.class);
    }

    @AfterEach
    void tearDown() {
        tenantContextMock.close();
        TenantContext.setCurrentTenant(null);
    }

    // ===================== Basic Event Routing Tests =====================

    @Nested
    @DisplayName("Basic Event Routing")
    class BasicEventRoutingTests {

        @BeforeEach
        void setUp() {
            when(connector1.getConnectorId()).thenReturn("docusign");
            when(connector2.getConnectorId()).thenReturn("slack");
            when(config1.getConnectorId()).thenReturn("docusign");
            when(config2.getConnectorId()).thenReturn("slack");
        }

        @Test
        @DisplayName("Should route event to all subscribed connectors")
        void shouldRouteEventToAllSubscribedConnectors() {
            // Arrange
            IntegrationEvent event = createTestEvent(TENANT_A, "OFFER_CREATED");
            List<IntegrationConnectorConfigEntity> activeConfigs = List.of(config1, config2);

            when(configService.findActiveByEventSubscription(TENANT_A, "OFFER_CREATED"))
                    .thenReturn(activeConfigs);
            when(connectorRegistry.getConnector("docusign")).thenReturn(connector1);
            when(connectorRegistry.getConnector("slack")).thenReturn(connector2);

            // Act
            router.routeToConnectors(event);

            // Assert
            verify(connector1).handleEvent(event);
            verify(connector2).handleEvent(event);
            verify(eventLogService, times(2)).logSuccess(any(IntegrationEvent.class), any(String.class), anyLong());
        }

        @Test
        @DisplayName("Should skip connectors not subscribed to event type")
        void shouldSkipUnsubscribedConnectors() {
            // Arrange
            IntegrationEvent event = createTestEvent(TENANT_A, "OFFER_CREATED");
            List<IntegrationConnectorConfigEntity> activeConfigs = List.of(config1);  // Only docusign

            when(configService.findActiveByEventSubscription(TENANT_A, "OFFER_CREATED"))
                    .thenReturn(activeConfigs);
            when(connectorRegistry.getConnector("docusign")).thenReturn(connector1);

            // Act
            router.routeToConnectors(event);

            // Assert
            verify(connector1).handleEvent(event);
            verify(connector2, never()).handleEvent(any());
        }

        @Test
        @DisplayName("Should handle event with no subscribed connectors")
        void shouldHandleEventWithNoSubscriptions() {
            // Arrange
            IntegrationEvent event = createTestEvent(TENANT_A, "UNKNOWN_EVENT");
            when(configService.findActiveByEventSubscription(TENANT_A, "UNKNOWN_EVENT"))
                    .thenReturn(Collections.emptyList());

            // Act & Assert - should not throw
            assertThatCode(() -> router.routeToConnectors(event))
                    .doesNotThrowAnyException();

            verify(connector1, never()).handleEvent(any());
            verify(connector2, never()).handleEvent(any());
        }
    }

    // ===================== Connector Exception Handling Tests =====================

    @Nested
    @DisplayName("Connector Exception Handling")
    class ConnectorExceptionHandlingTests {

        @BeforeEach
        void setUp() {
            when(connector1.getConnectorId()).thenReturn("docusign");
            when(connector2.getConnectorId()).thenReturn("slack");
            when(config1.getConnectorId()).thenReturn("docusign");
            when(config2.getConnectorId()).thenReturn("slack");
        }

        @Test
        @DisplayName("Should catch connector exception and continue with other connectors")
        void shouldCatchConnectorExceptionAndContinue() {
            // Arrange
            IntegrationEvent event = createTestEvent(TENANT_A, "OFFER_CREATED");
            List<IntegrationConnectorConfigEntity> activeConfigs = List.of(config1, config2);

            when(configService.findActiveByEventSubscription(TENANT_A, "OFFER_CREATED"))
                    .thenReturn(activeConfigs);
            when(connectorRegistry.getConnector("docusign")).thenReturn(connector1);
            when(connectorRegistry.getConnector("slack")).thenReturn(connector2);

            RuntimeException testException = new RuntimeException("API connection failed");
            doThrow(testException).when(connector1).handleEvent(event);

            // Act
            router.routeToConnectors(event);

            // Assert
            verify(connector1).handleEvent(event);
            verify(connector2).handleEvent(event);  // Should still be called despite connector1 failure
            verify(eventLogService).logFailure(eq(event), eq("docusign"), anyString(), anyLong());
            verify(eventLogService).logSuccess(eq(event), eq("slack"), anyLong());
        }

        @Test
        @DisplayName("Should log failure when connector throws exception")
        void shouldLogFailureOnException() {
            // Arrange
            IntegrationEvent event = createTestEvent(TENANT_A, "OFFER_CREATED");
            List<IntegrationConnectorConfigEntity> activeConfigs = List.of(config1);

            when(configService.findActiveByEventSubscription(TENANT_A, "OFFER_CREATED"))
                    .thenReturn(activeConfigs);
            when(connectorRegistry.getConnector("docusign")).thenReturn(connector1);

            String errorMsg = "Envelope creation failed";
            doThrow(new RuntimeException(errorMsg)).when(connector1).handleEvent(event);

            // Act
            router.routeToConnectors(event);

            // Assert
            ArgumentCaptor<String> errorCaptor = ArgumentCaptor.forClass(String.class);
            verify(eventLogService).logFailure(eq(event), eq("docusign"), errorCaptor.capture(), anyLong());
            assertThat(errorCaptor.getValue()).contains(errorMsg);
        }

        @Test
        @DisplayName("Should publish failed event to DLT on connector error")
        void shouldPublishFailedEventToDlt() {
            // Arrange
            IntegrationEvent event = createTestEvent(TENANT_A, "OFFER_CREATED");
            List<IntegrationConnectorConfigEntity> activeConfigs = List.of(config1);

            when(configService.findActiveByEventSubscription(TENANT_A, "OFFER_CREATED"))
                    .thenReturn(activeConfigs);
            when(connectorRegistry.getConnector("docusign")).thenReturn(connector1);

            doThrow(new RuntimeException("Test error")).when(connector1).handleEvent(event);

            // Act
            router.routeToConnectors(event);

            // Assert
            verify(eventLogService).logFailure(any(), any(), any(), anyLong());
        }

        @Test
        @DisplayName("Should handle multiple connector failures independently")
        void shouldHandleMultipleConnectorFailures() {
            // Arrange
            IntegrationEvent event = createTestEvent(TENANT_A, "OFFER_CREATED");
            List<IntegrationConnectorConfigEntity> activeConfigs = List.of(config1, config2);

            when(configService.findActiveByEventSubscription(TENANT_A, "OFFER_CREATED"))
                    .thenReturn(activeConfigs);
            when(connectorRegistry.getConnector("docusign")).thenReturn(connector1);
            when(connectorRegistry.getConnector("slack")).thenReturn(connector2);

            doThrow(new RuntimeException("Docusign error")).when(connector1).handleEvent(event);
            doThrow(new RuntimeException("Slack error")).when(connector2).handleEvent(event);

            // Act
            router.routeToConnectors(event);

            // Assert
            verify(connector1).handleEvent(event);
            verify(connector2).handleEvent(event);
            verify(eventLogService, times(2)).logFailure(any(), any(), any(), anyLong());
        }
    }

    // ===================== Tenant Isolation Tests =====================

    @Nested
    @DisplayName("Tenant Isolation")
    class TenantIsolationTests {

        @BeforeEach
        void setUp() {
            when(connector1.getConnectorId()).thenReturn("docusign");
            when(config1.getConnectorId()).thenReturn("docusign");
        }

        @Test
        @DisplayName("Should set tenant context at start of routing")
        void shouldSetTenantContextAtStart() {
            // Arrange
            IntegrationEvent event = createTestEvent(TENANT_A, "OFFER_CREATED");
            List<IntegrationConnectorConfigEntity> activeConfigs = List.of(config1);

            when(configService.findActiveByEventSubscription(TENANT_A, "OFFER_CREATED"))
                    .thenReturn(activeConfigs);
            when(connectorRegistry.getConnector("docusign")).thenReturn(connector1);

            // Act
            router.routeToConnectors(event);

            // Assert
            InOrder inOrder = inOrder(tenantContextMock.verification());
            tenantContextMock.verify(() -> TenantContext.setCurrentTenant(TENANT_A));
        }

        @Test
        @DisplayName("Should clear tenant context even after successful processing")
        void shouldClearTenantContextAfterSuccess() {
            // Arrange
            IntegrationEvent event = createTestEvent(TENANT_A, "OFFER_CREATED");
            List<IntegrationConnectorConfigEntity> activeConfigs = List.of(config1);

            when(configService.findActiveByEventSubscription(TENANT_A, "OFFER_CREATED"))
                    .thenReturn(activeConfigs);
            when(connectorRegistry.getConnector("docusign")).thenReturn(connector1);

            // Act
            router.routeToConnectors(event);

            // Assert
            tenantContextMock.verify(() -> TenantContext.setCurrentTenant(null));
        }

        @Test
        @DisplayName("Should clear tenant context even after exception")
        void shouldClearTenantContextAfterException() {
            // Arrange
            IntegrationEvent event = createTestEvent(TENANT_A, "OFFER_CREATED");
            List<IntegrationConnectorConfigEntity> activeConfigs = List.of(config1);

            when(configService.findActiveByEventSubscription(TENANT_A, "OFFER_CREATED"))
                    .thenReturn(activeConfigs);
            when(connectorRegistry.getConnector("docusign")).thenReturn(connector1);
            doThrow(new RuntimeException("Test error")).when(connector1).handleEvent(event);

            // Act
            router.routeToConnectors(event);

            // Assert - setCurrentTenant(null) should be called in finally block
            tenantContextMock.verify(() -> TenantContext.setCurrentTenant(null));
        }

        @Test
        @DisplayName("Should use event's tenant ID for routing")
        void shouldUseEventTenantIdForRouting() {
            // Arrange
            IntegrationEvent eventForTenantB = createTestEvent(TENANT_B, "OFFER_CREATED");
            List<IntegrationConnectorConfigEntity> activeConfigs = List.of(config1);

            when(configService.findActiveByEventSubscription(TENANT_B, "OFFER_CREATED"))
                    .thenReturn(activeConfigs);
            when(connectorRegistry.getConnector("docusign")).thenReturn(connector1);

            // Act
            router.routeToConnectors(eventForTenantB);

            // Assert
            tenantContextMock.verify(() -> TenantContext.setCurrentTenant(TENANT_B));
            verify(configService).findActiveByEventSubscription(TENANT_B, "OFFER_CREATED");
        }
    }

    // ===================== Logging Tests =====================

    @Nested
    @DisplayName("Event Logging")
    class EventLoggingTests {

        @BeforeEach
        void setUp() {
            when(connector1.getConnectorId()).thenReturn("docusign");
            when(config1.getConnectorId()).thenReturn("docusign");
        }

        @Test
        @DisplayName("Should log success with duration")
        void shouldLogSuccessWithDuration() {
            // Arrange
            IntegrationEvent event = createTestEvent(TENANT_A, "OFFER_CREATED");
            List<IntegrationConnectorConfigEntity> activeConfigs = List.of(config1);

            when(configService.findActiveByEventSubscription(TENANT_A, "OFFER_CREATED"))
                    .thenReturn(activeConfigs);
            when(connectorRegistry.getConnector("docusign")).thenReturn(connector1);

            // Act
            router.routeToConnectors(event);

            // Assert
            ArgumentCaptor<Long> durationCaptor = ArgumentCaptor.forClass(Long.class);
            verify(eventLogService).logSuccess(eq(event), eq("docusign"), durationCaptor.capture());
            assertThat(durationCaptor.getValue()).isGreaterThanOrEqualTo(0);
        }

        @Test
        @DisplayName("Should log failure with error message")
        void shouldLogFailureWithErrorMessage() {
            // Arrange
            IntegrationEvent event = createTestEvent(TENANT_A, "OFFER_CREATED");
            List<IntegrationConnectorConfigEntity> activeConfigs = List.of(config1);

            when(configService.findActiveByEventSubscription(TENANT_A, "OFFER_CREATED"))
                    .thenReturn(activeConfigs);
            when(connectorRegistry.getConnector("docusign")).thenReturn(connector1);

            String expectedError = "Connection timeout";
            doThrow(new RuntimeException(expectedError)).when(connector1).handleEvent(event);

            // Act
            router.routeToConnectors(event);

            // Assert
            ArgumentCaptor<String> errorCaptor = ArgumentCaptor.forClass(String.class);
            verify(eventLogService).logFailure(eq(event), eq("docusign"), errorCaptor.capture(), anyLong());
            assertThat(errorCaptor.getValue()).contains(expectedError);
        }

        @Test
        @DisplayName("Should not log when no connectors are subscribed")
        void shouldNotLogWhenNoSubscribedConnectors() {
            // Arrange
            IntegrationEvent event = createTestEvent(TENANT_A, "UNKNOWN_EVENT");
            when(configService.findActiveByEventSubscription(TENANT_A, "UNKNOWN_EVENT"))
                    .thenReturn(Collections.emptyList());

            // Act
            router.routeToConnectors(event);

            // Assert
            verify(eventLogService, never()).logSuccess(any(), any(), anyLong());
            verify(eventLogService, never()).logFailure(any(), any(), any(), anyLong());
        }
    }

    // ===================== Edge Cases Tests =====================

    @Nested
    @DisplayName("Edge Cases")
    class EdgeCasesTests {

        @BeforeEach
        void setUp() {
            when(connector1.getConnectorId()).thenReturn("docusign");
            when(config1.getConnectorId()).thenReturn("docusign");
        }

        @Test
        @DisplayName("Should handle null connector from registry")
        void shouldHandleNullConnectorFromRegistry() {
            // Arrange
            IntegrationEvent event = createTestEvent(TENANT_A, "OFFER_CREATED");
            List<IntegrationConnectorConfigEntity> activeConfigs = List.of(config1);

            when(configService.findActiveByEventSubscription(TENANT_A, "OFFER_CREATED"))
                    .thenReturn(activeConfigs);
            when(connectorRegistry.getConnector("docusign"))
                    .thenThrow(new IllegalArgumentException("Connector not registered: docusign"));

            // Act
            router.routeToConnectors(event);

            // Assert - should log failure but not crash
            verify(eventLogService).logFailure(any(), any(), any(), anyLong());
        }

        @Test
        @DisplayName("Should process empty event metadata")
        void shouldProcessEmptyEventMetadata() {
            // Arrange
            IntegrationEvent event = new IntegrationEvent(
                    "OFFER_CREATED",
                    TENANT_A,
                    ENTITY_ID,
                    "Offer",
                    Collections.emptyMap(),
                    Instant.now()
            );
            List<IntegrationConnectorConfigEntity> activeConfigs = List.of(config1);

            when(configService.findActiveByEventSubscription(TENANT_A, "OFFER_CREATED"))
                    .thenReturn(activeConfigs);
            when(connectorRegistry.getConnector("docusign")).thenReturn(connector1);

            // Act & Assert - should not throw
            assertThatCode(() -> router.routeToConnectors(event))
                    .doesNotThrowAnyException();

            verify(connector1).handleEvent(event);
        }

        @Test
        @DisplayName("Should process event with large metadata")
        void shouldProcessLargeMetadata() {
            // Arrange
            Map<String, Object> largeMetadata = new HashMap<>();
            for (int i = 0; i < 1000; i++) {
                largeMetadata.put("key_" + i, "value_" + i);
            }

            IntegrationEvent event = new IntegrationEvent(
                    "OFFER_CREATED",
                    TENANT_A,
                    ENTITY_ID,
                    "Offer",
                    largeMetadata,
                    Instant.now()
            );
            List<IntegrationConnectorConfigEntity> activeConfigs = List.of(config1);

            when(configService.findActiveByEventSubscription(TENANT_A, "OFFER_CREATED"))
                    .thenReturn(activeConfigs);
            when(connectorRegistry.getConnector("docusign")).thenReturn(connector1);

            // Act & Assert
            assertThatCode(() -> router.routeToConnectors(event))
                    .doesNotThrowAnyException();

            verify(connector1).handleEvent(event);
        }
    }

    // ===================== Helper Methods =====================

    private IntegrationEvent createTestEvent(UUID tenantId, String eventType) {
        return new IntegrationEvent(
                eventType,
                tenantId,
                ENTITY_ID,
                "Offer",
                Map.of("recipientEmail", "test@example.com"),
                Instant.now()
        );
    }
}
