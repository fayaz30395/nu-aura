package com.hrms.application.webhook;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.application.webhook.service.WebhookDeliveryService;
import com.hrms.application.webhook.service.WebhookService;
import com.hrms.common.metrics.MetricsService;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.webhook.*;
import com.hrms.infrastructure.webhook.repository.WebhookDeliveryRepository;
import com.hrms.infrastructure.webhook.repository.WebhookRepository;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for WebhookDeliveryService.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("WebhookDeliveryService Tests")
class WebhookDeliveryServiceTest {

    @Mock
    private WebhookRepository webhookRepository;

    @Mock
    private WebhookDeliveryRepository deliveryRepository;

    @Mock
    private WebhookService webhookService;

    @Mock
    private MetricsService metricsService;

    @Mock
    private RestTemplate restTemplate;

    private WebhookDeliveryService webhookDeliveryService;
    private ObjectMapper objectMapper;
    private MeterRegistry meterRegistry;

    private static final UUID TENANT_ID = UUID.fromString("550e8400-e29b-41d4-a716-446655440000");
    private static final UUID WEBHOOK_ID = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        meterRegistry = new SimpleMeterRegistry();
        webhookDeliveryService = new WebhookDeliveryService(
                webhookRepository,
                deliveryRepository,
                webhookService,
                objectMapper,
                meterRegistry,
                metricsService,
                restTemplate
        );
        TenantContext.setCurrentTenant(TENANT_ID);
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Nested
    @DisplayName("dispatchEvent")
    class DispatchEventTests {

        @Test
        @DisplayName("should create delivery for subscribed webhook")
        void shouldCreateDeliveryForSubscribedWebhook() {
            // Arrange
            Webhook webhook = createTestWebhook(Set.of(WebhookEventType.EMPLOYEE_CREATED));
            when(webhookService.findActiveWebhooks(TENANT_ID))
                    .thenReturn(List.of(webhook));
            when(deliveryRepository.existsByWebhookIdAndEventId(any(), any()))
                    .thenReturn(false);
            when(deliveryRepository.save(any(WebhookDelivery.class)))
                    .thenAnswer(inv -> inv.getArgument(0));
            when(restTemplate.exchange(anyString(), eq(HttpMethod.POST), any(HttpEntity.class), eq(String.class)))
                    .thenReturn(new ResponseEntity<>("{\"status\":\"ok\"}", HttpStatus.OK));
            when(webhookRepository.save(any(Webhook.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            Map<String, Object> payload = Map.of(
                    "employeeId", "123",
                    "name", "John Doe"
            );

            // Act
            webhookDeliveryService.dispatchEvent(TENANT_ID, WebhookEventType.EMPLOYEE_CREATED, payload);

            // Assert
            ArgumentCaptor<WebhookDelivery> deliveryCaptor = ArgumentCaptor.forClass(WebhookDelivery.class);
            verify(deliveryRepository, atLeastOnce()).save(deliveryCaptor.capture());

            WebhookDelivery savedDelivery = deliveryCaptor.getAllValues().get(0);
            assertThat(savedDelivery.getWebhookId()).isEqualTo(WEBHOOK_ID);
            assertThat(savedDelivery.getEventType()).isEqualTo(WebhookEventType.EMPLOYEE_CREATED);
            assertThat(savedDelivery.getTenantId()).isEqualTo(TENANT_ID);
        }

        @Test
        @DisplayName("should not deliver to unsubscribed event type")
        void shouldNotDeliverToUnsubscribedEventType() {
            // Arrange
            Webhook webhook = createTestWebhook(Set.of(WebhookEventType.LEAVE_REQUESTED));
            when(webhookService.findActiveWebhooks(TENANT_ID))
                    .thenReturn(List.of(webhook));

            Map<String, Object> payload = Map.of("employeeId", "123");

            // Act
            webhookDeliveryService.dispatchEvent(TENANT_ID, WebhookEventType.EMPLOYEE_CREATED, payload);

            // Assert
            verify(deliveryRepository, never()).save(any());
            verify(restTemplate, never()).exchange(anyString(), any(), any(), eq(String.class));
        }

        @Test
        @DisplayName("should skip duplicate events")
        void shouldSkipDuplicateEvents() {
            // Arrange
            Webhook webhook = createTestWebhook(Set.of(WebhookEventType.EMPLOYEE_CREATED));
            when(webhookService.findActiveWebhooks(TENANT_ID))
                    .thenReturn(List.of(webhook));
            when(deliveryRepository.existsByWebhookIdAndEventId(eq(WEBHOOK_ID), anyString()))
                    .thenReturn(true); // Already delivered

            Map<String, Object> payload = Map.of("employeeId", "123");

            // Act
            webhookDeliveryService.dispatchEvent(TENANT_ID, WebhookEventType.EMPLOYEE_CREATED, payload);

            // Assert
            verify(deliveryRepository, never()).save(any());
        }

        @Test
        @DisplayName("should handle delivery failure and increment failure count")
        void shouldHandleDeliveryFailure() {
            // Arrange
            Webhook webhook = createTestWebhook(Set.of(WebhookEventType.EMPLOYEE_CREATED));
            when(webhookService.findActiveWebhooks(TENANT_ID))
                    .thenReturn(List.of(webhook));
            when(deliveryRepository.existsByWebhookIdAndEventId(any(), any()))
                    .thenReturn(false);
            when(deliveryRepository.save(any(WebhookDelivery.class)))
                    .thenAnswer(inv -> inv.getArgument(0));
            when(restTemplate.exchange(anyString(), eq(HttpMethod.POST), any(HttpEntity.class), eq(String.class)))
                    .thenThrow(new RuntimeException("Connection refused"));
            when(webhookRepository.save(any(Webhook.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            Map<String, Object> payload = Map.of("employeeId", "123");

            // Act
            webhookDeliveryService.dispatchEvent(TENANT_ID, WebhookEventType.EMPLOYEE_CREATED, payload);

            // Assert
            ArgumentCaptor<Webhook> webhookCaptor = ArgumentCaptor.forClass(Webhook.class);
            verify(webhookRepository).save(webhookCaptor.capture());
            assertThat(webhookCaptor.getValue().getConsecutiveFailures()).isGreaterThan(0);
        }

        @Test
        @DisplayName("should deliver to ALL event subscriber for any event type")
        void shouldDeliverToAllEventSubscriber() {
            // Arrange - webhook subscribed to ALL events
            Webhook webhook = createTestWebhook(Set.of(WebhookEventType.ALL));
            when(webhookService.findActiveWebhooks(TENANT_ID))
                    .thenReturn(List.of(webhook));
            when(deliveryRepository.existsByWebhookIdAndEventId(any(), any()))
                    .thenReturn(false);
            when(deliveryRepository.save(any(WebhookDelivery.class)))
                    .thenAnswer(inv -> inv.getArgument(0));
            when(restTemplate.exchange(anyString(), eq(HttpMethod.POST), any(HttpEntity.class), eq(String.class)))
                    .thenReturn(new ResponseEntity<>("{}", HttpStatus.OK));
            when(webhookRepository.save(any(Webhook.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            Map<String, Object> payload = Map.of("data", "test");

            // Act - send any event type
            webhookDeliveryService.dispatchEvent(TENANT_ID, WebhookEventType.PAYROLL_PROCESSED, payload);

            // Assert - should still deliver because subscribed to ALL
            verify(deliveryRepository, atLeastOnce()).save(any(WebhookDelivery.class));
        }

        @Test
        @DisplayName("should record success metrics on successful delivery")
        void shouldRecordSuccessMetrics() {
            // Arrange
            Webhook webhook = createTestWebhook(Set.of(WebhookEventType.EMPLOYEE_CREATED));
            when(webhookService.findActiveWebhooks(TENANT_ID))
                    .thenReturn(List.of(webhook));
            when(deliveryRepository.existsByWebhookIdAndEventId(any(), any()))
                    .thenReturn(false);
            when(deliveryRepository.save(any(WebhookDelivery.class)))
                    .thenAnswer(inv -> inv.getArgument(0));
            when(restTemplate.exchange(anyString(), eq(HttpMethod.POST), any(HttpEntity.class), eq(String.class)))
                    .thenReturn(new ResponseEntity<>("{}", HttpStatus.OK));
            when(webhookRepository.save(any(Webhook.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            // Act
            webhookDeliveryService.dispatchEvent(TENANT_ID, WebhookEventType.EMPLOYEE_CREATED, Map.of("test", "data"));

            // Assert - verify webhook success was recorded
            ArgumentCaptor<Webhook> webhookCaptor = ArgumentCaptor.forClass(Webhook.class);
            verify(webhookRepository).save(webhookCaptor.capture());
            assertThat(webhookCaptor.getValue().getConsecutiveFailures()).isZero();
        }

        @Test
        @DisplayName("should handle multiple webhooks for same event")
        void shouldHandleMultipleWebhooksForSameEvent() {
            // Arrange
            Webhook webhook1 = createTestWebhook(Set.of(WebhookEventType.EMPLOYEE_CREATED));
            webhook1.setUrl("https://example1.com/webhook");

            Webhook webhook2 = createTestWebhook(Set.of(WebhookEventType.EMPLOYEE_CREATED));
            webhook2.setId(UUID.randomUUID());
            webhook2.setUrl("https://example2.com/webhook");

            when(webhookService.findActiveWebhooks(TENANT_ID))
                    .thenReturn(List.of(webhook1, webhook2));
            when(deliveryRepository.existsByWebhookIdAndEventId(any(), any()))
                    .thenReturn(false);
            when(deliveryRepository.save(any(WebhookDelivery.class)))
                    .thenAnswer(inv -> inv.getArgument(0));
            when(restTemplate.exchange(anyString(), eq(HttpMethod.POST), any(HttpEntity.class), eq(String.class)))
                    .thenReturn(new ResponseEntity<>("{}", HttpStatus.OK));
            when(webhookRepository.save(any(Webhook.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            // Act
            webhookDeliveryService.dispatchEvent(TENANT_ID, WebhookEventType.EMPLOYEE_CREATED, Map.of("data", "test"));

            // Assert - should create deliveries for both webhooks
            verify(deliveryRepository, atLeast(2)).save(any(WebhookDelivery.class));
        }

        @Test
        @DisplayName("should do nothing when no active webhooks exist")
        void shouldDoNothingWhenNoActiveWebhooks() {
            // Arrange
            when(webhookService.findActiveWebhooks(TENANT_ID))
                    .thenReturn(Collections.emptyList());

            // Act
            webhookDeliveryService.dispatchEvent(TENANT_ID, WebhookEventType.EMPLOYEE_CREATED, Map.of("data", "test"));

            // Assert
            verify(deliveryRepository, never()).save(any());
            verify(restTemplate, never()).exchange(anyString(), any(), any(), eq(String.class));
        }
    }

    private Webhook createTestWebhook(Set<WebhookEventType> events) {
        Webhook webhook = new Webhook();
        webhook.setId(WEBHOOK_ID);
        webhook.setTenantId(TENANT_ID);
        webhook.setName("Test Webhook");
        webhook.setUrl("https://example.com/webhook");
        webhook.setSecret("test-secret");
        webhook.setStatus(WebhookStatus.ACTIVE);
        webhook.setEvents(events);
        webhook.setConsecutiveFailures(0);
        return webhook;
    }
}
