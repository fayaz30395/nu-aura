package com.hrms.application.integration.service;

import com.hrms.domain.integration.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for the ConnectorRegistry.
 *
 * <p>Tests auto-discovery, lookup by ID, capabilities caching,
 * and filtering connectors by event type and webhook support.</p>
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("ConnectorRegistry Tests")
class ConnectorRegistryTest {

    private ConnectorRegistry registry;

    @Mock
    private IntegrationConnector mockConnector1;

    @Mock
    private IntegrationConnector mockConnector2;

    @Mock
    private IntegrationConnector mockConnector3;

    @BeforeEach
    void setUp() {
        // Default setup will be overridden in specific tests
    }

    // ===================== Auto-Discovery Tests =====================

    @Nested
    @DisplayName("Auto-Discovery")
    class AutoDiscoveryTests {

        @Test
        @DisplayName("Should register multiple connectors from list")
        void shouldRegisterMultipleConnectors() {
            // Arrange
            setupConnectorMocks();
            List<IntegrationConnector> connectors = List.of(mockConnector1, mockConnector2, mockConnector3);

            // Act
            registry = new ConnectorRegistry(Optional.of(connectors));

            // Assert
            assertThat(registry.getConnectorCount()).isEqualTo(3);
            assertThat(registry.getAllConnectorIds()).containsExactlyInAnyOrder("docusign", "slack", "twilio");
        }

        @Test
        @DisplayName("Should handle empty connector list gracefully")
        void shouldHandleEmptyConnectorList() {
            // Act
            registry = new ConnectorRegistry(Optional.of(Collections.emptyList()));

            // Assert
            assertThat(registry.getConnectorCount()).isZero();
            assertThat(registry.getAllConnectorIds()).isEmpty();
            assertThat(registry.getAllConnectors()).isEmpty();
        }

        @Test
        @DisplayName("Should handle Optional.empty() gracefully")
        void shouldHandleEmptyOptional() {
            // Act
            registry = new ConnectorRegistry(Optional.empty());

            // Assert
            assertThat(registry.getConnectorCount()).isZero();
            assertThat(registry.getAllConnectorIds()).isEmpty();
        }

        @Test
        @DisplayName("Should log connector registration")
        void shouldLogConnectorDiscovery() {
            // Arrange
            setupConnectorMocks();
            List<IntegrationConnector> connectors = List.of(mockConnector1, mockConnector2);

            // Act
            registry = new ConnectorRegistry(Optional.of(connectors));

            // Assert - no exception thrown, registry initialized
            assertThat(registry.getConnectorCount()).isEqualTo(2);
        }
    }

    // ===================== Connector Lookup Tests =====================

    @Nested
    @DisplayName("Connector Lookup")
    class ConnectorLookupTests {

        @BeforeEach
        void setUp() {
            setupConnectorMocks();
            List<IntegrationConnector> connectors = List.of(mockConnector1, mockConnector2, mockConnector3);
            registry = new ConnectorRegistry(Optional.of(connectors));
        }

        @Test
        @DisplayName("Should get connector by ID using getConnector()")
        void shouldGetConnectorById() {
            // Act
            IntegrationConnector result = registry.getConnector("docusign");

            // Assert
            assertThat(result).isSameAs(mockConnector1);
        }

        @Test
        @DisplayName("Should get connector by ID using findConnector()")
        void shouldFindConnectorById() {
            // Act
            Optional<IntegrationConnector> result = registry.findConnector("slack");

            // Assert
            assertThat(result).isPresent().contains(mockConnector2);
        }

        @Test
        @DisplayName("Should return empty Optional for non-existent connector")
        void shouldReturnEmptyOptionalForMissingConnector() {
            // Act
            Optional<IntegrationConnector> result = registry.findConnector("nonexistent");

            // Assert
            assertThat(result).isEmpty();
        }

        @Test
        @DisplayName("Should throw IllegalArgumentException for missing connector via getConnector()")
        void shouldThrowExceptionForMissingConnectorViaGetConnector() {
            // Act & Assert
            assertThatThrownBy(() -> registry.getConnector("missing-connector"))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Connector not registered");
        }

        @Test
        @DisplayName("Should return all connectors as unmodifiable collection")
        void shouldReturnUnmodifiableConnectorsCollection() {
            // Act
            Collection<IntegrationConnector> connectors = registry.getAllConnectors();

            // Assert
            assertThat(connectors).hasSize(3);
            assertThatThrownBy(() -> connectors.add(mock(IntegrationConnector.class)))
                    .isInstanceOf(UnsupportedOperationException.class);
        }

        @Test
        @DisplayName("Should return all connector IDs as unmodifiable set")
        void shouldReturnUnmodifiableConnectorIds() {
            // Act
            Set<String> ids = registry.getAllConnectorIds();

            // Assert
            assertThat(ids).hasSize(3);
            assertThatThrownBy(() -> ids.add("new-connector"))
                    .isInstanceOf(UnsupportedOperationException.class);
        }

        @Test
        @DisplayName("Should check if connector is registered")
        void shouldCheckConnectorRegistration() {
            // Act & Assert
            assertThat(registry.isConnectorRegistered("docusign")).isTrue();
            assertThat(registry.isConnectorRegistered("slack")).isTrue();
            assertThat(registry.isConnectorRegistered("missing")).isFalse();
        }
    }

    // ===================== Capabilities Tests =====================

    @Nested
    @DisplayName("Capabilities Lookup")
    class CapabilitiesTests {

        private ConnectorCapabilities cap1, cap2, cap3;

        @BeforeEach
        void setUp() {
            // Create capabilities for each connector
            cap1 = new ConnectorCapabilities(
                    Set.of("OFFER_CREATED", "DOCUMENT_CREATED"),
                    true,
                    false,
                    true,
                    "{}"
            );
            cap2 = new ConnectorCapabilities(
                    Set.of("MESSAGE_SENT", "NOTIFICATION_SENT"),
                    false,
                    true,
                    false,
                    "{}"
            );
            cap3 = new ConnectorCapabilities(
                    Set.of("SMS_SENT"),
                    false,
                    false,
                    false,
                    "{}"
            );

            when(mockConnector1.getConnectorId()).thenReturn("docusign");
            when(mockConnector1.getCapabilities()).thenReturn(cap1);

            when(mockConnector2.getConnectorId()).thenReturn("slack");
            when(mockConnector2.getCapabilities()).thenReturn(cap2);

            when(mockConnector3.getConnectorId()).thenReturn("twilio");
            when(mockConnector3.getCapabilities()).thenReturn(cap3);

            List<IntegrationConnector> connectors = List.of(mockConnector1, mockConnector2, mockConnector3);
            registry = new ConnectorRegistry(Optional.of(connectors));
        }

        @Test
        @DisplayName("Should get capabilities by connector ID")
        void shouldGetCapabilitiesById() {
            // Act
            ConnectorCapabilities result = registry.getCapabilities("docusign");

            // Assert
            assertThat(result).isSameAs(cap1);
            assertThat(result.supportedEvents()).containsExactly("OFFER_CREATED", "DOCUMENT_CREATED");
            assertThat(result.supportsWebhookCallback()).isTrue();
        }

        @Test
        @DisplayName("Should find capabilities as Optional")
        void shouldFindCapabilitiesAsOptional() {
            // Act
            Optional<ConnectorCapabilities> result = registry.findCapabilities("slack");

            // Assert
            assertThat(result).isPresent().contains(cap2);
        }

        @Test
        @DisplayName("Should return empty Optional for missing capabilities")
        void shouldReturnEmptyOptionalForMissingCapabilities() {
            // Act
            Optional<ConnectorCapabilities> result = registry.findCapabilities("nonexistent");

            // Assert
            assertThat(result).isEmpty();
        }

        @Test
        @DisplayName("Should throw exception for missing capabilities via getCapabilities()")
        void shouldThrowExceptionForMissingCapabilities() {
            // Act & Assert
            assertThatThrownBy(() -> registry.getCapabilities("missing"))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Connector not registered");
        }

        @Test
        @DisplayName("Should return capabilities map for all connectors")
        void shouldReturnCapabilitiesMap() {
            // Act
            Map<String, ConnectorCapabilities> capMap = registry.getCapabilitiesMap();

            // Assert
            assertThat(capMap).hasSize(3);
            assertThat(capMap).containsEntry("docusign", cap1)
                    .containsEntry("slack", cap2)
                    .containsEntry("twilio", cap3);
        }

        @Test
        @DisplayName("Should return unmodifiable capabilities map")
        void shouldReturnUnmodifiableCapabilitiesMap() {
            // Act
            Map<String, ConnectorCapabilities> capMap = registry.getCapabilitiesMap();

            // Assert
            assertThatThrownBy(() -> capMap.put("new", cap1))
                    .isInstanceOf(UnsupportedOperationException.class);
        }
    }

    // ===================== Event Type Filtering Tests =====================

    @Nested
    @DisplayName("Event Type Filtering")
    class EventTypeFilteringTests {

        private ConnectorCapabilities cap1, cap2, cap3;

        @BeforeEach
        void setUp() {
            cap1 = new ConnectorCapabilities(
                    Set.of("OFFER_CREATED", "DOCUMENT_CREATED"),
                    true,
                    false,
                    true,
                    "{}"
            );
            cap2 = new ConnectorCapabilities(
                    Set.of("OFFER_CREATED", "EMPLOYEE_CREATED"),
                    false,
                    true,
                    false,
                    "{}"
            );
            cap3 = new ConnectorCapabilities(
                    Set.of("SMS_SENT"),
                    false,
                    false,
                    false,
                    "{}"
            );

            when(mockConnector1.getConnectorId()).thenReturn("docusign");
            when(mockConnector1.getCapabilities()).thenReturn(cap1);

            when(mockConnector2.getConnectorId()).thenReturn("slack");
            when(mockConnector2.getCapabilities()).thenReturn(cap2);

            when(mockConnector3.getConnectorId()).thenReturn("twilio");
            when(mockConnector3.getCapabilities()).thenReturn(cap3);

            List<IntegrationConnector> connectors = List.of(mockConnector1, mockConnector2, mockConnector3);
            registry = new ConnectorRegistry(Optional.of(connectors));
        }

        @Test
        @DisplayName("Should find all connectors supporting a specific event type")
        void shouldFindConnectorsByEventType() {
            // Act
            List<IntegrationConnector> result = registry.findConnectorsByEventType("OFFER_CREATED");

            // Assert
            assertThat(result).hasSize(2).contains(mockConnector1, mockConnector2);
        }

        @Test
        @DisplayName("Should return empty list for unsupported event type")
        void shouldReturnEmptyListForUnsupportedEvent() {
            // Act
            List<IntegrationConnector> result = registry.findConnectorsByEventType("UNKNOWN_EVENT");

            // Assert
            assertThat(result).isEmpty();
        }

        @Test
        @DisplayName("Should find connectors supporting only one event")
        void shouldFindConnectorForSingleEventType() {
            // Act
            List<IntegrationConnector> result = registry.findConnectorsByEventType("SMS_SENT");

            // Assert
            assertThat(result).hasSize(1).contains(mockConnector3);
        }

        @Test
        @DisplayName("Should return unmodifiable list of connectors")
        void shouldReturnUnmodifiableConnectorList() {
            // Act
            List<IntegrationConnector> result = registry.findConnectorsByEventType("OFFER_CREATED");

            // Assert
            assertThatThrownBy(() -> result.add(mock(IntegrationConnector.class)))
                    .isInstanceOf(UnsupportedOperationException.class);
        }
    }

    // ===================== Webhook Support Filtering Tests =====================

    @Nested
    @DisplayName("Webhook Support Filtering")
    class WebhookSupportFilteringTests {

        private ConnectorCapabilities webhookCap, noWebhookCap;

        @BeforeEach
        void setUp() {
            webhookCap = new ConnectorCapabilities(
                    Set.of("OFFER_CREATED"),
                    true,  // supportsWebhookCallback
                    false,
                    true,
                    "{}"
            );
            noWebhookCap = new ConnectorCapabilities(
                    Set.of("SMS_SENT"),
                    false,  // no webhook support
                    false,
                    false,
                    "{}"
            );

            when(mockConnector1.getConnectorId()).thenReturn("docusign");
            when(mockConnector1.getCapabilities()).thenReturn(webhookCap);

            when(mockConnector2.getConnectorId()).thenReturn("twilio");
            when(mockConnector2.getCapabilities()).thenReturn(noWebhookCap);

            List<IntegrationConnector> connectors = List.of(mockConnector1, mockConnector2);
            registry = new ConnectorRegistry(Optional.of(connectors));
        }

        @Test
        @DisplayName("Should find all connectors supporting webhooks")
        void shouldFindConnectorsWithWebhookSupport() {
            // Act
            List<IntegrationConnector> result = registry.findConnectorsWithWebhookSupport();

            // Assert
            assertThat(result).hasSize(1).contains(mockConnector1);
        }

        @Test
        @DisplayName("Should return empty list when no connectors support webhooks")
        void shouldReturnEmptyListWhenNoWebhookSupport() {
            // Arrange
            registry = new ConnectorRegistry(Optional.of(List.of(mockConnector2)));

            // Act
            List<IntegrationConnector> result = registry.findConnectorsWithWebhookSupport();

            // Assert
            assertThat(result).isEmpty();
        }

        @Test
        @DisplayName("Should return unmodifiable list of webhook-supporting connectors")
        void shouldReturnUnmodifiableWebhookConnectorList() {
            // Act
            List<IntegrationConnector> result = registry.findConnectorsWithWebhookSupport();

            // Assert
            assertThatThrownBy(() -> result.add(mock(IntegrationConnector.class)))
                    .isInstanceOf(UnsupportedOperationException.class);
        }
    }

    // ===================== String Representation Tests =====================

    @Nested
    @DisplayName("String Representation")
    class StringRepresentationTests {

        @Test
        @DisplayName("Should return summary string with connector IDs")
        void shouldReturnSummaryString() {
            // Arrange
            setupConnectorMocks();
            List<IntegrationConnector> connectors = List.of(mockConnector1, mockConnector2);
            registry = new ConnectorRegistry(Optional.of(connectors));

            // Act
            String result = registry.toString();

            // Assert
            assertThat(result).contains("ConnectorRegistry");
            assertThat(result).contains("docusign");
            assertThat(result).contains("slack");
        }

        @Test
        @DisplayName("Should return empty registry summary when no connectors")
        void shouldReturnEmptyRegistrySummary() {
            // Arrange
            registry = new ConnectorRegistry(Optional.empty());

            // Act
            String result = registry.toString();

            // Assert
            assertThat(result).contains("ConnectorRegistry");
            assertThat(result).contains("[]");
        }
    }

    // ===================== Helper Methods =====================

    private void setupConnectorMocks() {
        ConnectorCapabilities cap1 = new ConnectorCapabilities(
                Set.of("OFFER_CREATED"),
                true,
                false,
                true,
                "{}"
        );
        ConnectorCapabilities cap2 = new ConnectorCapabilities(
                Set.of("MESSAGE_SENT"),
                false,
                true,
                false,
                "{}"
        );
        ConnectorCapabilities cap3 = new ConnectorCapabilities(
                Set.of("SMS_SENT"),
                false,
                false,
                false,
                "{}"
        );

        when(mockConnector1.getConnectorId()).thenReturn("docusign");
        when(mockConnector1.getCapabilities()).thenReturn(cap1);

        when(mockConnector2.getConnectorId()).thenReturn("slack");
        when(mockConnector2.getCapabilities()).thenReturn(cap2);

        when(mockConnector3.getConnectorId()).thenReturn("twilio");
        when(mockConnector3.getCapabilities()).thenReturn(cap3);
    }
}
