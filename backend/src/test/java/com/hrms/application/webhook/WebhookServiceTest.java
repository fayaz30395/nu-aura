package com.hrms.application.webhook;

import com.hrms.application.webhook.service.WebhookService;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.webhook.Webhook;
import com.hrms.domain.webhook.WebhookEventType;
import com.hrms.domain.webhook.WebhookStatus;
import com.hrms.infrastructure.webhook.repository.WebhookRepository;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for WebhookService.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("WebhookService Tests")
class WebhookServiceTest {

    private static final UUID TENANT_ID = UUID.fromString("550e8400-e29b-41d4-a716-446655440000");
    private static final UUID WEBHOOK_ID = UUID.randomUUID();
    @Mock
    private WebhookRepository webhookRepository;
    @InjectMocks
    private WebhookService webhookService;

    @BeforeEach
    void setUp() {
        TenantContext.setCurrentTenant(TENANT_ID);
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    private Webhook createWebhook(String name, WebhookStatus status) {
        Webhook webhook = new Webhook();
        webhook.setId(WEBHOOK_ID);
        webhook.setTenantId(TENANT_ID);
        webhook.setName(name);
        webhook.setUrl("https://example.com/webhook/" + name.toLowerCase().replace(" ", "-"));
        webhook.setSecret("test-secret-" + UUID.randomUUID());
        webhook.setStatus(status);
        webhook.setEvents(Set.of(WebhookEventType.EMPLOYEE_CREATED));
        webhook.setConsecutiveFailures(0);
        return webhook;
    }

    @Nested
    @DisplayName("findActiveWebhooks")
    class FindActiveWebhooksTests {

        @Test
        @DisplayName("should return active webhooks for tenant")
        void shouldReturnActiveWebhooksForTenant() {
            // Arrange
            Webhook webhook1 = createWebhook("Webhook 1", WebhookStatus.ACTIVE);
            Webhook webhook2 = createWebhook("Webhook 2", WebhookStatus.ACTIVE);
            when(webhookRepository.findByTenantIdAndStatus(TENANT_ID, WebhookStatus.ACTIVE))
                    .thenReturn(List.of(webhook1, webhook2));

            // Act
            List<Webhook> result = webhookService.findActiveWebhooks(TENANT_ID);

            // Assert
            assertThat(result).hasSize(2);
            assertThat(result).extracting(Webhook::getName)
                    .containsExactlyInAnyOrder("Webhook 1", "Webhook 2");
            verify(webhookRepository).findByTenantIdAndStatus(TENANT_ID, WebhookStatus.ACTIVE);
        }

        @Test
        @DisplayName("should return empty list when no active webhooks")
        void shouldReturnEmptyListWhenNoActiveWebhooks() {
            // Arrange
            when(webhookRepository.findByTenantIdAndStatus(TENANT_ID, WebhookStatus.ACTIVE))
                    .thenReturn(Collections.emptyList());

            // Act
            List<Webhook> result = webhookService.findActiveWebhooks(TENANT_ID);

            // Assert
            assertThat(result).isEmpty();
        }
    }

    @Nested
    @DisplayName("findAllByTenant")
    class FindAllByTenantTests {

        @Test
        @DisplayName("should return all webhooks for tenant")
        void shouldReturnAllWebhooksForTenant() {
            // Arrange
            Webhook active = createWebhook("Active", WebhookStatus.ACTIVE);
            Webhook disabled = createWebhook("Disabled", WebhookStatus.DISABLED_FAILURES);
            Webhook paused = createWebhook("Paused", WebhookStatus.PAUSED);
            when(webhookRepository.findByTenantId(TENANT_ID))
                    .thenReturn(List.of(active, disabled, paused));

            // Act
            List<Webhook> result = webhookService.findAllByTenant(TENANT_ID);

            // Assert
            assertThat(result).hasSize(3);
            assertThat(result).extracting(Webhook::getStatus)
                    .containsExactlyInAnyOrder(WebhookStatus.ACTIVE, WebhookStatus.DISABLED_FAILURES, WebhookStatus.PAUSED);
        }
    }

    @Nested
    @DisplayName("findById")
    class FindByIdTests {

        @Test
        @DisplayName("should return webhook when found")
        void shouldReturnWebhookWhenFound() {
            // Arrange
            Webhook webhook = createWebhook("Test Webhook", WebhookStatus.ACTIVE);
            when(webhookRepository.findByIdAndTenantId(WEBHOOK_ID, TENANT_ID))
                    .thenReturn(Optional.of(webhook));

            // Act
            Optional<Webhook> result = webhookService.findById(WEBHOOK_ID);

            // Assert
            assertThat(result).isPresent();
            assertThat(result.get().getName()).isEqualTo("Test Webhook");
        }

        @Test
        @DisplayName("should return empty when webhook not found")
        void shouldReturnEmptyWhenNotFound() {
            // Arrange
            when(webhookRepository.findByIdAndTenantId(WEBHOOK_ID, TENANT_ID))
                    .thenReturn(Optional.empty());

            // Act
            Optional<Webhook> result = webhookService.findById(WEBHOOK_ID);

            // Assert
            assertThat(result).isEmpty();
        }

        @Test
        @DisplayName("should return empty when no tenant context")
        void shouldReturnEmptyWhenNoTenantContext() {
            // Arrange
            TenantContext.clear();

            // Act
            Optional<Webhook> result = webhookService.findById(WEBHOOK_ID);

            // Assert
            assertThat(result).isEmpty();
            verify(webhookRepository, never()).findByIdAndTenantId(any(), any());
        }
    }

    @Nested
    @DisplayName("create")
    class CreateTests {

        @Test
        @DisplayName("should create webhook successfully")
        void shouldCreateWebhookSuccessfully() {
            // Arrange
            Webhook webhook = createWebhook("New Webhook", WebhookStatus.ACTIVE);
            when(webhookRepository.existsByTenantIdAndUrl(TENANT_ID, webhook.getUrl()))
                    .thenReturn(false);
            when(webhookRepository.save(any(Webhook.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            // Act
            Webhook result = webhookService.create(webhook);

            // Assert
            assertThat(result.getName()).isEqualTo("New Webhook");
            verify(webhookRepository).save(webhook);
        }

        @Test
        @DisplayName("should throw exception when URL already exists")
        void shouldThrowExceptionWhenUrlExists() {
            // Arrange
            Webhook webhook = createWebhook("Duplicate Webhook", WebhookStatus.ACTIVE);
            when(webhookRepository.existsByTenantIdAndUrl(TENANT_ID, webhook.getUrl()))
                    .thenReturn(true);

            // Act & Assert
            assertThatThrownBy(() -> webhookService.create(webhook))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessage("A webhook with this URL already exists");
            verify(webhookRepository, never()).save(any());
        }
    }

    @Nested
    @DisplayName("update")
    class UpdateTests {

        @Test
        @DisplayName("should update webhook successfully")
        void shouldUpdateWebhookSuccessfully() {
            // Arrange
            Webhook webhook = createWebhook("Updated Webhook", WebhookStatus.ACTIVE);
            when(webhookRepository.save(any(Webhook.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            // Act
            Webhook result = webhookService.update(webhook);

            // Assert
            assertThat(result.getName()).isEqualTo("Updated Webhook");
            verify(webhookRepository).save(webhook);
        }
    }

    @Nested
    @DisplayName("delete")
    class DeleteTests {

        @Test
        @DisplayName("should delete webhook when found")
        void shouldDeleteWebhookWhenFound() {
            // Arrange
            Webhook webhook = createWebhook("To Delete", WebhookStatus.ACTIVE);
            when(webhookRepository.findByIdAndTenantId(WEBHOOK_ID, TENANT_ID))
                    .thenReturn(Optional.of(webhook));

            // Act
            webhookService.delete(WEBHOOK_ID, TENANT_ID);

            // Assert
            verify(webhookRepository).delete(webhook);
        }

        @Test
        @DisplayName("should do nothing when webhook not found")
        void shouldDoNothingWhenNotFound() {
            // Arrange
            when(webhookRepository.findByIdAndTenantId(WEBHOOK_ID, TENANT_ID))
                    .thenReturn(Optional.empty());

            // Act
            webhookService.delete(WEBHOOK_ID, TENANT_ID);

            // Assert
            verify(webhookRepository, never()).delete(any());
        }
    }

    @Nested
    @DisplayName("activate")
    class ActivateTests {

        @Test
        @DisplayName("should activate webhook successfully")
        void shouldActivateWebhookSuccessfully() {
            // Arrange
            Webhook webhook = createWebhook("To Activate", WebhookStatus.PAUSED);
            webhook.setConsecutiveFailures(5);
            when(webhookRepository.findByIdAndTenantId(WEBHOOK_ID, TENANT_ID))
                    .thenReturn(Optional.of(webhook));
            when(webhookRepository.save(any(Webhook.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            // Act
            Optional<Webhook> result = webhookService.activate(WEBHOOK_ID, TENANT_ID);

            // Assert
            assertThat(result).isPresent();
            assertThat(result.get().getStatus()).isEqualTo(WebhookStatus.ACTIVE);
            assertThat(result.get().getConsecutiveFailures()).isZero();
        }

        @Test
        @DisplayName("should return empty when webhook not found")
        void shouldReturnEmptyWhenNotFound() {
            // Arrange
            when(webhookRepository.findByIdAndTenantId(WEBHOOK_ID, TENANT_ID))
                    .thenReturn(Optional.empty());

            // Act
            Optional<Webhook> result = webhookService.activate(WEBHOOK_ID, TENANT_ID);

            // Assert
            assertThat(result).isEmpty();
            verify(webhookRepository, never()).save(any());
        }
    }

    @Nested
    @DisplayName("deactivate")
    class DeactivateTests {

        @Test
        @DisplayName("should deactivate webhook successfully")
        void shouldDeactivateWebhookSuccessfully() {
            // Arrange
            Webhook webhook = createWebhook("To Deactivate", WebhookStatus.ACTIVE);
            when(webhookRepository.findByIdAndTenantId(WEBHOOK_ID, TENANT_ID))
                    .thenReturn(Optional.of(webhook));
            when(webhookRepository.save(any(Webhook.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            // Act
            Optional<Webhook> result = webhookService.deactivate(WEBHOOK_ID, TENANT_ID);

            // Assert
            assertThat(result).isPresent();
            assertThat(result.get().getStatus()).isEqualTo(WebhookStatus.PAUSED);
        }

        @Test
        @DisplayName("should return empty when webhook not found")
        void shouldReturnEmptyWhenNotFound() {
            // Arrange
            when(webhookRepository.findByIdAndTenantId(WEBHOOK_ID, TENANT_ID))
                    .thenReturn(Optional.empty());

            // Act
            Optional<Webhook> result = webhookService.deactivate(WEBHOOK_ID, TENANT_ID);

            // Assert
            assertThat(result).isEmpty();
            verify(webhookRepository, never()).save(any());
        }
    }
}
