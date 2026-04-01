package com.hrms.infrastructure.integration.docusign;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.domain.integration.*;
import com.hrms.domain.integration.docusign.DocuSignEnvelope;
import com.hrms.domain.integration.docusign.DocuSignTemplateMapping;
import com.hrms.infrastructure.integration.repository.DocuSignEnvelopeRepository;
import com.hrms.infrastructure.integration.repository.DocuSignTemplateMappingRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for the DocuSignConnector.
 *
 * <p>Tests connector capabilities, event handling, webhook callback processing,
 * and connection testing.</p>
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("DocuSignConnector Tests")
class DocuSignConnectorTest {

    private static final UUID TENANT_ID = UUID.randomUUID();
    private static final UUID ENTITY_ID = UUID.randomUUID();

    private DocuSignConnector connector;

    @Mock
    private DocuSignApiClient apiClient;

    @Mock
    private DocuSignAuthService authService;

    @Mock
    private DocuSignEnvelopeRepository envelopeRepository;

    @Mock
    private DocuSignTemplateMappingRepository templateMappingRepository;

    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        connector = new DocuSignConnector(
                apiClient,
                authService,
                envelopeRepository,
                templateMappingRepository,
                objectMapper
        );
    }

    // ===================== Connector Identity Tests =====================

    @Nested
    @DisplayName("Connector Identity")
    class ConnectorIdentityTests {

        @Test
        @DisplayName("Should return 'docusign' as connector ID")
        void shouldReturnDocuSignConnectorId() {
            // Act
            String connectorId = connector.getConnectorId();

            // Assert
            assertThat(connectorId).isEqualTo("docusign");
        }

        @Test
        @DisplayName("Should return E_SIGNATURE as connector type")
        void shouldReturnESignatureType() {
            // Act
            ConnectorType type = connector.getType();

            // Assert
            assertThat(type).isEqualTo(ConnectorType.E_SIGNATURE);
        }

        @Test
        @DisplayName("Should return capabilities with correct event types")
        void shouldReturnCapabilitiesWithCorrectEvents() {
            // Act
            ConnectorCapabilities caps = connector.getCapabilities();

            // Assert
            assertThat(caps.supportedEvents())
                    .containsExactlyInAnyOrder("OFFER_CREATED", "DOCUMENT_CREATED", "EMPLOYEE_ONBOARDED");
        }

        @Test
        @DisplayName("Should advertise webhook support")
        void shouldAdvertiseWebhookSupport() {
            // Act
            ConnectorCapabilities caps = connector.getCapabilities();

            // Assert
            assertThat(caps.supportsWebhookCallback()).isTrue();
        }

        @Test
        @DisplayName("Should advertise batch operation support")
        void shouldAdvertiseBatchOperationSupport() {
            // Act
            ConnectorCapabilities caps = connector.getCapabilities();

            // Assert
            assertThat(caps.supportsBatchOperations()).isTrue();
        }

        @Test
        @DisplayName("Should not advertise action button support")
        void shouldNotAdvertiseActionButtonSupport() {
            // Act
            ConnectorCapabilities caps = connector.getCapabilities();

            // Assert
            assertThat(caps.supportsActionButtons()).isFalse();
        }

        @Test
        @DisplayName("Should return config schema JSON")
        void shouldReturnConfigSchemaJson() {
            // Act
            ConnectorCapabilities caps = connector.getCapabilities();

            // Assert
            assertThat(caps.configSchemaJson()).isNotNull().isNotEmpty();
            assertThat(caps.configSchemaJson()).contains("integrationKey");
        }
    }

    // ===================== Connection Testing Tests =====================

    @Nested
    @DisplayName("Connection Testing")
    class ConnectionTestingTests {

        @Test
        @DisplayName("Should return successful connection test result")
        void shouldReturnSuccessfulConnectionTest() {
            // Arrange
            ConnectorConfig config = createTestConfig();
            when(authService.getAccessToken(config)).thenReturn("test-token");
            when(apiClient.listTemplates(config)).thenReturn(List.of(
                    new DocuSignApiClient.TemplateResponse("template1", "Template 1", "Test template")
            ));

            // Act
            ConnectionTestResult result = connector.testConnection(config);

            // Assert
            assertThat(result.success()).isTrue();
            assertThat(result.message()).contains("Successfully connected to DocuSign");
            assertThat(result.latencyMs()).isGreaterThanOrEqualTo(0);
            assertThat(result.diagnostics()).containsEntry("templateCount", 1);
        }

        @Test
        @DisplayName("Should return failed connection test result on error")
        void shouldReturnFailedConnectionTest() {
            // Arrange
            ConnectorConfig config = createTestConfig();
            when(authService.getAccessToken(config))
                    .thenThrow(new RuntimeException("Invalid credentials"));

            // Act
            ConnectionTestResult result = connector.testConnection(config);

            // Assert
            assertThat(result.success()).isFalse();
            assertThat(result.message()).contains("Failed to connect to DocuSign");
            assertThat(result.diagnostics()).containsKey("error");
        }

        @Test
        @DisplayName("Should measure connection test latency")
        void shouldMeasureConnectionLatency() {
            // Arrange
            ConnectorConfig config = createTestConfig();
            when(authService.getAccessToken(config)).thenReturn("test-token");
            when(apiClient.listTemplates(config)).thenReturn(Collections.emptyList());

            // Act
            ConnectionTestResult result = connector.testConnection(config);

            // Assert
            assertThat(result.latencyMs()).isGreaterThanOrEqualTo(0);
        }
    }

    // ===================== Event Handling Tests =====================

    @Nested
    @DisplayName("Event Handling")
    class EventHandlingTests {

        @Test
        @DisplayName("Should handle OFFER_CREATED event")
        void shouldHandleOfferCreatedEvent() {
            // Arrange
            IntegrationEvent event = new IntegrationEvent(
                    "OFFER_CREATED",
                    TENANT_ID,
                    ENTITY_ID,
                    "Offer",
                    Map.of(
                            "recipientEmail", "candidate@example.com",
                            "recipientName", "John Doe",
                            "documentUrl", "https://example.com/offer.pdf",
                            "subject", "Your Offer Letter"
                    ),
                    Instant.now()
            );

            DocuSignTemplateMapping mapping = new DocuSignTemplateMapping();
            mapping.setDocusignTemplateId("template123");
            when(templateMappingRepository.findByTenantIdAndDocumentTypeAndIsActiveTrue(TENANT_ID, "OfferLetter"))
                    .thenReturn(Optional.of(mapping));

            // Act & Assert - should not throw
            assertThatCode(() -> connector.handleEvent(event))
                    .doesNotThrowAnyException();
        }

        @Test
        @DisplayName("Should handle DOCUMENT_CREATED event with requiresSignature=true")
        void shouldHandleDocumentCreatedEventWithSignature() {
            // Arrange
            IntegrationEvent event = new IntegrationEvent(
                    "DOCUMENT_CREATED",
                    TENANT_ID,
                    ENTITY_ID,
                    "Document",
                    Map.of(
                            "documentType", "EmploymentContract",
                            "requiresSignature", "true",
                            "recipientEmail", "employee@example.com",
                            "recipientName", "Jane Smith",
                            "documentUrl", "https://example.com/contract.pdf"
                    ),
                    Instant.now()
            );

            DocuSignTemplateMapping mapping = new DocuSignTemplateMapping();
            mapping.setDocusignTemplateId("template456");
            when(templateMappingRepository.findByTenantIdAndDocumentTypeAndIsActiveTrue(TENANT_ID, "EmploymentContract"))
                    .thenReturn(Optional.of(mapping));

            // Act & Assert
            assertThatCode(() -> connector.handleEvent(event))
                    .doesNotThrowAnyException();
        }

        @Test
        @DisplayName("Should skip DOCUMENT_CREATED event with requiresSignature=false")
        void shouldSkipDocumentCreatedEventWithoutSignature() {
            // Arrange
            IntegrationEvent event = new IntegrationEvent(
                    "DOCUMENT_CREATED",
                    TENANT_ID,
                    ENTITY_ID,
                    "Document",
                    Map.of(
                            "documentType", "EmploymentContract",
                            "requiresSignature", "false",
                            "recipientEmail", "employee@example.com",
                            "recipientName", "Jane Smith"
                    ),
                    Instant.now()
            );

            // Act & Assert
            assertThatCode(() -> connector.handleEvent(event))
                    .doesNotThrowAnyException();

            verify(templateMappingRepository, never()).findByTenantIdAndDocumentTypeAndIsActiveTrue(any(), any());
        }

        @Test
        @DisplayName("Should handle EMPLOYEE_ONBOARDED event gracefully")
        void shouldHandleEmployeeOnboardedEvent() {
            // Arrange
            IntegrationEvent event = new IntegrationEvent(
                    "EMPLOYEE_ONBOARDED",
                    TENANT_ID,
                    ENTITY_ID,
                    "Employee",
                    Map.of(),
                    Instant.now()
            );

            // Act & Assert - should not throw
            assertThatCode(() -> connector.handleEvent(event))
                    .doesNotThrowAnyException();
        }

        @Test
        @DisplayName("Should handle unknown event type gracefully")
        void shouldHandleUnknownEventType() {
            // Arrange
            IntegrationEvent event = new IntegrationEvent(
                    "UNKNOWN_EVENT",
                    TENANT_ID,
                    ENTITY_ID,
                    "Unknown",
                    Map.of(),
                    Instant.now()
            );

            // Act & Assert - should not throw
            assertThatCode(() -> connector.handleEvent(event))
                    .doesNotThrowAnyException();
        }

        @Test
        @DisplayName("Should catch exception and log without crashing")
        void shouldCatchExceptionAndLog() {
            // Arrange
            IntegrationEvent event = new IntegrationEvent(
                    "OFFER_CREATED",
                    TENANT_ID,
                    ENTITY_ID,
                    "Offer",
                    Map.of(
                            "recipientEmail", "candidate@example.com",
                            "recipientName", "John Doe"
                    ),
                    Instant.now()
            );

            when(templateMappingRepository.findByTenantIdAndDocumentTypeAndIsActiveTrue(TENANT_ID, "OfferLetter"))
                    .thenThrow(new RuntimeException("Database error"));

            // Act & Assert
            assertThatCode(() -> connector.handleEvent(event))
                    .doesNotThrowAnyException();
        }
    }

    // ===================== Webhook Callback Tests =====================

    @Nested
    @DisplayName("Webhook Callback Processing")
    class WebhookCallbackTests {

        @Test
        @DisplayName("Should process envelope completion webhook")
        void shouldProcessEnvelopeCompletionWebhook() {
            // Arrange
            String envelopeId = "test-envelope-123";
            String webhookBody = """
                    {
                        "envelopeId": "%s",
                        "status": "completed",
                        "recipients": []
                    }
                    """.formatted(envelopeId);

            DocuSignEnvelope envelope = new DocuSignEnvelope();
            envelope.setEnvelopeId(envelopeId);
            envelope.setStatus("sent");

            when(envelopeRepository.findByEnvelopeId(envelopeId))
                    .thenReturn(Optional.of(envelope));

            // Act
            WebhookCallbackResult result = connector.handleWebhookCallback(
                    "docusign",
                    Map.of(),
                    webhookBody
            );

            // Assert
            assertThat(result.success()).isTrue();
            verify(envelopeRepository).save(any(DocuSignEnvelope.class));
        }

        @Test
        @DisplayName("Should return success when envelope not found")
        void shouldReturnSuccessWhenEnvelopeNotFound() {
            // Arrange
            String webhookBody = """
                    {
                        "envelopeId": "missing-envelope",
                        "status": "completed"
                    }
                    """;

            when(envelopeRepository.findByEnvelopeId("missing-envelope"))
                    .thenReturn(Optional.empty());

            // Act
            WebhookCallbackResult result = connector.handleWebhookCallback(
                    "docusign",
                    Map.of(),
                    webhookBody
            );

            // Assert
            assertThat(result.success()).isTrue();
            assertThat(result.message()).contains("Envelope not found");
        }

        @Test
        @DisplayName("Should return failure on invalid JSON payload")
        void shouldReturnFailureOnInvalidJson() {
            // Arrange
            String invalidBody = "{ invalid json }";

            // Act
            WebhookCallbackResult result = connector.handleWebhookCallback(
                    "docusign",
                    Map.of(),
                    invalidBody
            );

            // Assert
            assertThat(result.success()).isFalse();
            assertThat(result.message()).contains("Error parsing webhook");
        }

        @Test
        @DisplayName("Should update envelope status from webhook")
        void shouldUpdateEnvelopeStatus() {
            // Arrange
            String envelopeId = "test-envelope-123";
            String webhookBody = """
                    {
                        "envelopeId": "%s",
                        "status": "declined"
                    }
                    """.formatted(envelopeId);

            DocuSignEnvelope envelope = new DocuSignEnvelope();
            envelope.setEnvelopeId(envelopeId);
            envelope.setStatus("sent");

            when(envelopeRepository.findByEnvelopeId(envelopeId))
                    .thenReturn(Optional.of(envelope));

            // Act
            connector.handleWebhookCallback("docusign", Map.of(), webhookBody);

            // Assert
            ArgumentCaptor<DocuSignEnvelope> envelopeCaptor = ArgumentCaptor.forClass(DocuSignEnvelope.class);
            verify(envelopeRepository).save(envelopeCaptor.capture());

            DocuSignEnvelope saved = envelopeCaptor.getValue();
            assertThat(saved.getStatus()).isEqualTo("declined");
        }

        @Test
        @DisplayName("Should handle webhook with recipient information")
        void shouldHandleWebhookWithRecipients() {
            // Arrange
            String envelopeId = "test-envelope-123";
            String webhookBody = """
                    {
                        "envelopeId": "%s",
                        "status": "completed",
                        "recipients": [
                            {
                                "email": "signer@example.com",
                                "name": "Signer Name",
                                "status": "completed",
                                "completedDateTime": "2024-01-15T10:30:00Z"
                            }
                        ]
                    }
                    """.formatted(envelopeId);

            DocuSignEnvelope envelope = new DocuSignEnvelope();
            envelope.setEnvelopeId(envelopeId);
            envelope.setStatus("sent");

            when(envelopeRepository.findByEnvelopeId(envelopeId))
                    .thenReturn(Optional.of(envelope));

            // Act
            WebhookCallbackResult result = connector.handleWebhookCallback(
                    "docusign",
                    Map.of(),
                    webhookBody
            );

            // Assert
            assertThat(result.success()).isTrue();
            verify(envelopeRepository).save(any(DocuSignEnvelope.class));
        }

        @Test
        @DisplayName("Should set completedAt timestamp for completed envelopes")
        void shouldSetCompletedAtTimestamp() {
            // Arrange
            String envelopeId = "test-envelope-123";
            String webhookBody = """
                    {
                        "envelopeId": "%s",
                        "status": "completed"
                    }
                    """.formatted(envelopeId);

            DocuSignEnvelope envelope = new DocuSignEnvelope();
            envelope.setEnvelopeId(envelopeId);
            envelope.setStatus("sent");
            envelope.setCompletedAt(null);

            when(envelopeRepository.findByEnvelopeId(envelopeId))
                    .thenReturn(Optional.of(envelope));

            // Act
            connector.handleWebhookCallback("docusign", Map.of(), webhookBody);

            // Assert
            ArgumentCaptor<DocuSignEnvelope> envelopeCaptor = ArgumentCaptor.forClass(DocuSignEnvelope.class);
            verify(envelopeRepository).save(envelopeCaptor.capture());

            DocuSignEnvelope saved = envelopeCaptor.getValue();
            assertThat(saved.getCompletedAt()).isNotNull();
        }

        @Test
        @DisplayName("Should handle declined envelope and set error message")
        void shouldHandleDeclinedEnvelope() {
            // Arrange
            String envelopeId = "test-envelope-123";
            String webhookBody = """
                    {
                        "envelopeId": "%s",
                        "status": "declined"
                    }
                    """.formatted(envelopeId);

            DocuSignEnvelope envelope = new DocuSignEnvelope();
            envelope.setEnvelopeId(envelopeId);
            envelope.setStatus("sent");

            when(envelopeRepository.findByEnvelopeId(envelopeId))
                    .thenReturn(Optional.of(envelope));

            // Act
            connector.handleWebhookCallback("docusign", Map.of(), webhookBody);

            // Assert
            ArgumentCaptor<DocuSignEnvelope> envelopeCaptor = ArgumentCaptor.forClass(DocuSignEnvelope.class);
            verify(envelopeRepository).save(envelopeCaptor.capture());

            DocuSignEnvelope saved = envelopeCaptor.getValue();
            assertThat(saved.getErrorMessage()).contains("declined");
        }
    }

    // ===================== Configuration Tests =====================

    @Nested
    @DisplayName("Configuration")
    class ConfigurationTests {

        @Test
        @DisplayName("Should throw exception when required field is missing")
        void shouldThrowExceptionForMissingRequiredField() {
            // Arrange
            ConnectorConfig config = new ConnectorConfig(
                    TENANT_ID,
                    "docusign",
                    Map.of("integrationKey", "key"),  // Missing other required fields
                    Set.of("OFFER_CREATED")
            );

            // Act & Assert
            assertThatThrownBy(() -> connector.configure(config))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("Configuration failed");
        }

        @Test
        @DisplayName("Should test connection before configuration")
        void shouldTestConnectionBeforeConfiguration() {
            // Arrange
            ConnectorConfig config = createTestConfig();
            when(authService.getAccessToken(config)).thenReturn("test-token");
            when(apiClient.listTemplates(config)).thenReturn(Collections.emptyList());

            // Act
            connector.configure(config);

            // Assert
            verify(authService).getAccessToken(config);
        }
    }

    // ===================== Helper Methods =====================

    private ConnectorConfig createTestConfig() {
        return new ConnectorConfig(
                TENANT_ID,
                "docusign",
                Map.of(
                        "integrationKey", "test-key",
                        "userId", "test-user",
                        "accountId", "test-account",
                        "rsaPrivateKey", "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7VJTUt9Us8cKj\nMzEfYyjiWA4/4eoP+KwbGOHS2CTamRiYknLBulJ+PrH5XO5qXSaFEQ8kLuzHxM2P\nSP2qsKbSYwBYcB9F4g7qxZQAm8n0zzuc5p+0yHf4+qNlY5X7lXgp0OqEdB1rz7Ys\nPwvEdJLQlDUfXKWNmV9B9PXhMJgOEaLG2YvTWCIf4eBJP0bBnvEMy3fT0CJ1OdSI\nshHGEjPeP7TDUvI8PmI5X4+f4gYPHnU/6KT3VjWmKKK0oHn0fEp8g/K8Pu6EqhEq\nZFvnAWeLxLLQcsH5sXrY30pPKG2Kq1J5JLY3yPKhC7gO4rL8MN8ry9qvBL5YxjBu\nxBb10T0bAgMBAAECggEAIqwwb3AiPt8pfzQQjXxU1sNAx7C8q0gfJBBxVkGR31w3\nd+yYRxRVlVdBBfTTZCZzE2WTUxR+8VCGXx4+lGBGLfRDzwPHhR5AqfvbfQhMXpJh\nvmjN9Ir2kMIqVkAXmYEu0FZ6C6XfBYp7A0R1R0bAhQVmUDxs0aXLzVQpRCLjnRm+\n+rMvNEbdxmqkKGpwXPL1PFpFX/WELhRUhyL+w3gZ5p5YJN1qsHRc6pVYMgKn/bxd\nYZXn8K7BK3wW5LqQmjSZtW8W5F0OhpMzEw0tOPVKCEIGFZLr5OY0O7CQVXg3pxvz\nCwZfXSn3QrJu9D+7eUFCLMrNqNZn0eqJUQa5JYJEAQKBgQDyMFLJ6L2qH9WFpQhf\nFwqRUO6xZ5K7rz5h0C5gIqR2Z3QbKHMpKN6V7wRFcTQGQ+5w5PUJZJpXB2YYTmHi\nN1CZL7XM7+RpYnLrAr5MWvQJCLGU6p9jFKJQa8jGgPSDNxqFiQiT5tWMlVh+L8RT\nUE5QZWvdl6TwTmQYJFz/GpYYAQKBgQDFqKxkZ3XBlJbfLqP8fpSp0TYFBsYPQ2nF\nQJ4TpQmqt6G+YM+Xr6NbnWOPdE2l2OgL2V5dX7ktVQhFYwVRwuDXv+BhWJ3xXkE3\nKVu3R5qyB6dBWbxmY3V7TpPlwX1bD8JOa/RBCfYlNCJYlcfBpQqcWHgmaqXWqhNr\n8P9nG8UywQKBgQDe8U2v/0o6spJ/LRLa7hkH7yt2T7UzVZbMvNpJdWlGh0s7F4cV\ndLJjqp5V0xHFJQiYl0VTQqD4PdG0aaANZ3I1dUxJAhQXuQwbM/kGLSY/AvAi8hvY\nYWNXxbFBQCnhXW6mCHZEVxVAFdMl5b7PeVKYxs1Jqjz5z3zZ3UBF0tPOAQKBgGEV\nqMcVH0Wkp2BL3zLzXCWRXFVaJL5NYVsvMDhT4LXPZS9cYcECdvIJzcHsGKE1sXOj\n6E/7L5sQrQ0IMLL6z+z/FYaEAkVXJFyKK9TcWq7Z7q1YzEJMqz8U9qTLQGD/+vvx\n7e7+vl8xGswD4zw8XyLIhqBvUK4N0qPiVA1nZZGBAoGAfULJpwDf8c+p8XPKqKwp\nBbLPDHaRsJJyQkCYhpVlLXZhHKnv2pMAuMmVj7x8sTm7NYzBSRpZs5O4LZQCVRb0\ncqLcxeHDZVnRHbslCvQQzPx3rALcVYELN6wvwKYcAhYpW+3/2yNIiLKPl5aXQJQl\nKfDvZz6FZx7rJRKJzFmvMnU=\n-----END PRIVATE KEY-----",
                        "baseUrl", "https://demo.docusign.net",
                        "connectWebhookUrl", "https://example.com/webhook"
                ),
                Set.of("OFFER_CREATED", "DOCUMENT_CREATED")
        );
    }
}
