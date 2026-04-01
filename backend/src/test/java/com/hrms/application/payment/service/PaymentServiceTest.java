package com.hrms.application.payment.service;

import com.hrms.common.exception.BusinessException;
import com.hrms.common.exception.ResourceNotFoundException;
import com.hrms.common.security.EncryptionService;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.payment.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for PaymentService.
 * Covers: payment initiation, status check, refund processing, webhook handling, config management.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("PaymentService Tests")
class PaymentServiceTest {

    private static final UUID TENANT_ID = UUID.randomUUID();
    private static final UUID USER_ID = UUID.randomUUID();

    @Mock
    private PaymentConfigRepository paymentConfigRepository;

    @Mock
    private PaymentTransactionRepository paymentTransactionRepository;

    @Mock
    private PaymentBatchRepository paymentBatchRepository;

    @Mock
    private PaymentWebhookRepository paymentWebhookRepository;

    @Mock
    private PaymentRefundRepository paymentRefundRepository;

    @Mock
    private RazorpayAdapter razorpayAdapter;

    @Mock
    private StripeAdapter stripeAdapter;

    @Mock
    private EncryptionService encryptionService;

    @InjectMocks
    private PaymentService paymentService;

    private MockedStatic<SecurityContext> securityContextMock;
    private MockedStatic<TenantContext> tenantContextMock;

    @BeforeEach
    void setUp() {
        securityContextMock = mockStatic(SecurityContext.class);
        tenantContextMock = mockStatic(TenantContext.class);
        securityContextMock.when(SecurityContext::getCurrentTenantId).thenReturn(TENANT_ID);
        securityContextMock.when(SecurityContext::getCurrentUserId).thenReturn(USER_ID);
        tenantContextMock.when(TenantContext::getCurrentTenant).thenReturn(TENANT_ID);
    }

    @AfterEach
    void tearDown() {
        securityContextMock.close();
        tenantContextMock.close();
    }

    // ===================== Initiate Payment Tests =====================

    @Nested
    @DisplayName("initiatePayment")
    class InitiatePayment {

        @Test
        @DisplayName("Should initiate payment successfully with Razorpay")
        void shouldInitiatePaymentSuccessfully() {
            // Given
            PaymentTransaction transaction = buildTransaction(PaymentTransaction.PaymentProvider.RAZORPAY);
            PaymentConfig config = buildConfig(PaymentConfig.PaymentProvider.RAZORPAY);

            when(paymentConfigRepository.findByTenantIdAndProviderAndIsActiveTrueAndIsDeletedFalse(
                    TENANT_ID, PaymentConfig.PaymentProvider.RAZORPAY))
                    .thenReturn(Optional.of(config));

            PaymentGatewayAdapter.PaymentGatewayResponse successResponse = new PaymentGatewayAdapter.PaymentGatewayResponse();
            successResponse.setSuccess(true);
            successResponse.setExternalPaymentId("ext-pay-123");

            when(razorpayAdapter.initiatePayment(any())).thenReturn(successResponse);
            when(paymentTransactionRepository.save(any(PaymentTransaction.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            // When
            PaymentTransaction result = paymentService.initiatePayment(transaction);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.getStatus()).isEqualTo(PaymentTransaction.PaymentStatus.PROCESSING);
            assertThat(result.getExternalRef()).isEqualTo("ext-pay-123");
            assertThat(result.getTenantId()).isEqualTo(TENANT_ID);
            assertThat(result.getCreatedBy()).isEqualTo(USER_ID);

            verify(razorpayAdapter).initialize(config);
            verify(paymentTransactionRepository).save(any(PaymentTransaction.class));
        }

        @Test
        @DisplayName("Should mark payment as FAILED when provider returns failure")
        void shouldMarkPaymentAsFailedOnProviderFailure() {
            // Given
            PaymentTransaction transaction = buildTransaction(PaymentTransaction.PaymentProvider.RAZORPAY);
            PaymentConfig config = buildConfig(PaymentConfig.PaymentProvider.RAZORPAY);

            when(paymentConfigRepository.findByTenantIdAndProviderAndIsActiveTrueAndIsDeletedFalse(
                    TENANT_ID, PaymentConfig.PaymentProvider.RAZORPAY))
                    .thenReturn(Optional.of(config));

            PaymentGatewayAdapter.PaymentGatewayResponse failResponse = new PaymentGatewayAdapter.PaymentGatewayResponse();
            failResponse.setSuccess(false);
            failResponse.setMessage("Insufficient funds");

            when(razorpayAdapter.initiatePayment(any())).thenReturn(failResponse);
            when(paymentTransactionRepository.save(any(PaymentTransaction.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            // When
            PaymentTransaction result = paymentService.initiatePayment(transaction);

            // Then
            assertThat(result.getStatus()).isEqualTo(PaymentTransaction.PaymentStatus.FAILED);
            assertThat(result.getFailedReason()).isEqualTo("Insufficient funds");
        }

        @Test
        @DisplayName("Should throw BusinessException when provider not configured")
        void shouldThrowWhenProviderNotConfigured() {
            // Given
            PaymentTransaction transaction = buildTransaction(PaymentTransaction.PaymentProvider.RAZORPAY);

            when(paymentConfigRepository.findByTenantIdAndProviderAndIsActiveTrueAndIsDeletedFalse(
                    TENANT_ID, PaymentConfig.PaymentProvider.RAZORPAY))
                    .thenReturn(Optional.empty());

            // When/Then
            assertThatThrownBy(() -> paymentService.initiatePayment(transaction))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("Payment provider not configured");
        }
    }

    // ===================== Check Payment Status Tests =====================

    @Nested
    @DisplayName("checkPaymentStatus")
    class CheckPaymentStatus {

        @Test
        @DisplayName("Should return payment status and update to COMPLETED")
        void shouldReturnAndUpdatePaymentStatus() {
            // Given
            UUID paymentId = UUID.randomUUID();
            PaymentTransaction transaction = buildTransaction(PaymentTransaction.PaymentProvider.RAZORPAY);
            transaction.setId(paymentId);
            transaction.setTenantId(TENANT_ID);
            transaction.setExternalRef("ext-123");
            transaction.setStatus(PaymentTransaction.PaymentStatus.PROCESSING);

            PaymentConfig config = buildConfig(PaymentConfig.PaymentProvider.RAZORPAY);

            when(paymentTransactionRepository.findById(paymentId)).thenReturn(Optional.of(transaction));
            when(paymentConfigRepository.findByTenantIdAndProviderAndIsActiveTrueAndIsDeletedFalse(
                    TENANT_ID, PaymentConfig.PaymentProvider.RAZORPAY))
                    .thenReturn(Optional.of(config));

            PaymentGatewayAdapter.PaymentStatusResponse statusResponse = new PaymentGatewayAdapter.PaymentStatusResponse();
            statusResponse.setStatus("COMPLETED");

            when(razorpayAdapter.checkStatus("ext-123")).thenReturn(statusResponse);
            when(paymentTransactionRepository.save(any(PaymentTransaction.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            // When
            PaymentTransaction result = paymentService.checkPaymentStatus(paymentId);

            // Then
            assertThat(result.getStatus()).isEqualTo(PaymentTransaction.PaymentStatus.COMPLETED);
            assertThat(result.getCompletedAt()).isNotNull();
            verify(paymentTransactionRepository).save(any());
        }

        @Test
        @DisplayName("Should throw ResourceNotFoundException when payment not found")
        void shouldThrowWhenPaymentNotFound() {
            // Given
            UUID paymentId = UUID.randomUUID();
            when(paymentTransactionRepository.findById(paymentId)).thenReturn(Optional.empty());

            // When/Then
            assertThatThrownBy(() -> paymentService.checkPaymentStatus(paymentId))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessage("Payment not found");
        }

        @Test
        @DisplayName("Should throw BusinessException when accessing other tenant's payment")
        void shouldThrowWhenAccessingOtherTenantPayment() {
            // Given
            UUID paymentId = UUID.randomUUID();
            PaymentTransaction transaction = buildTransaction(PaymentTransaction.PaymentProvider.RAZORPAY);
            transaction.setId(paymentId);
            transaction.setTenantId(UUID.randomUUID()); // different tenant

            when(paymentTransactionRepository.findById(paymentId)).thenReturn(Optional.of(transaction));

            // When/Then
            assertThatThrownBy(() -> paymentService.checkPaymentStatus(paymentId))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("Unauthorized access");
        }
    }

    // ===================== Process Refund Tests =====================

    @Nested
    @DisplayName("processRefund")
    class ProcessRefund {

        @Test
        @DisplayName("Should process refund for completed payment")
        void shouldProcessRefundSuccessfully() {
            // Given
            UUID paymentId = UUID.randomUUID();
            PaymentTransaction transaction = buildTransaction(PaymentTransaction.PaymentProvider.RAZORPAY);
            transaction.setId(paymentId);
            transaction.setTenantId(TENANT_ID);
            transaction.setStatus(PaymentTransaction.PaymentStatus.COMPLETED);
            transaction.setAmount(new BigDecimal("5000.00"));

            PaymentConfig config = buildConfig(PaymentConfig.PaymentProvider.RAZORPAY);

            when(paymentTransactionRepository.findById(paymentId)).thenReturn(Optional.of(transaction));
            when(paymentConfigRepository.findByTenantIdAndProviderAndIsActiveTrueAndIsDeletedFalse(
                    TENANT_ID, PaymentConfig.PaymentProvider.RAZORPAY))
                    .thenReturn(Optional.of(config));

            PaymentGatewayAdapter.PaymentGatewayResponse refundResponse = new PaymentGatewayAdapter.PaymentGatewayResponse();
            refundResponse.setSuccess(true);
            refundResponse.setExternalPaymentId("refund-ext-456");

            when(razorpayAdapter.processRefund(any(PaymentRefund.class))).thenReturn(refundResponse);
            when(paymentRefundRepository.save(any(PaymentRefund.class)))
                    .thenAnswer(inv -> inv.getArgument(0));
            when(paymentTransactionRepository.save(any(PaymentTransaction.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            // When
            PaymentRefund result = paymentService.processRefund(paymentId, "Customer requested refund");

            // Then
            assertThat(result).isNotNull();
            assertThat(result.getStatus()).isEqualTo(PaymentRefund.RefundStatus.PROCESSING);
            assertThat(result.getExternalRefundId()).isEqualTo("refund-ext-456");
            assertThat(result.getAmount()).isEqualByComparingTo(new BigDecimal("5000.00"));

            verify(paymentRefundRepository).save(any(PaymentRefund.class));
            verify(paymentTransactionRepository).save(any(PaymentTransaction.class));
        }

        @Test
        @DisplayName("Should throw BusinessException when refunding non-completed payment")
        void shouldThrowWhenRefundingNonCompletedPayment() {
            // Given
            UUID paymentId = UUID.randomUUID();
            PaymentTransaction transaction = buildTransaction(PaymentTransaction.PaymentProvider.RAZORPAY);
            transaction.setId(paymentId);
            transaction.setTenantId(TENANT_ID);
            transaction.setStatus(PaymentTransaction.PaymentStatus.PROCESSING);

            when(paymentTransactionRepository.findById(paymentId)).thenReturn(Optional.of(transaction));

            // When/Then
            assertThatThrownBy(() -> paymentService.processRefund(paymentId, "Reason"))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("Only completed payments can be refunded");
        }

        @Test
        @DisplayName("Should mark refund as FAILED when provider rejects")
        void shouldMarkRefundAsFailedOnProviderRejection() {
            // Given
            UUID paymentId = UUID.randomUUID();
            PaymentTransaction transaction = buildTransaction(PaymentTransaction.PaymentProvider.RAZORPAY);
            transaction.setId(paymentId);
            transaction.setTenantId(TENANT_ID);
            transaction.setStatus(PaymentTransaction.PaymentStatus.COMPLETED);
            transaction.setAmount(new BigDecimal("1000.00"));

            PaymentConfig config = buildConfig(PaymentConfig.PaymentProvider.RAZORPAY);

            when(paymentTransactionRepository.findById(paymentId)).thenReturn(Optional.of(transaction));
            when(paymentConfigRepository.findByTenantIdAndProviderAndIsActiveTrueAndIsDeletedFalse(
                    TENANT_ID, PaymentConfig.PaymentProvider.RAZORPAY))
                    .thenReturn(Optional.of(config));

            PaymentGatewayAdapter.PaymentGatewayResponse failedRefund = new PaymentGatewayAdapter.PaymentGatewayResponse();
            failedRefund.setSuccess(false);

            when(razorpayAdapter.processRefund(any(PaymentRefund.class))).thenReturn(failedRefund);
            when(paymentRefundRepository.save(any(PaymentRefund.class)))
                    .thenAnswer(inv -> inv.getArgument(0));
            when(paymentTransactionRepository.save(any(PaymentTransaction.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            // When
            PaymentRefund result = paymentService.processRefund(paymentId, "Reason");

            // Then
            assertThat(result.getStatus()).isEqualTo(PaymentRefund.RefundStatus.FAILED);
        }
    }

    // ===================== Webhook Processing Tests =====================

    @Nested
    @DisplayName("processWebhook")
    class ProcessWebhook {

        @Test
        @DisplayName("Should process valid webhook and update transaction")
        void shouldProcessValidWebhook() {
            // Given
            String payload = "{\"event\":\"payment.captured\",\"payment_id\":\"ext-pay-123\"}";
            String signature = "valid-signature";
            PaymentConfig config = buildConfig(PaymentConfig.PaymentProvider.RAZORPAY);

            when(paymentConfigRepository.findByTenantIdAndProviderAndIsActiveTrueAndIsDeletedFalse(
                    TENANT_ID, PaymentConfig.PaymentProvider.RAZORPAY))
                    .thenReturn(Optional.of(config));
            when(razorpayAdapter.verifyWebhookSignature(payload, signature)).thenReturn(true);

            PaymentGatewayAdapter.PaymentWebhookData webhookData = new PaymentGatewayAdapter.PaymentWebhookData();
            webhookData.setEventType("payment.captured");
            webhookData.setExternalPaymentId("ext-pay-123");
            webhookData.setStatus("completed");

            when(razorpayAdapter.parseWebhookPayload(payload)).thenReturn(webhookData);

            PaymentTransaction txn = buildTransaction(PaymentTransaction.PaymentProvider.RAZORPAY);
            txn.setTenantId(TENANT_ID);
            txn.setStatus(PaymentTransaction.PaymentStatus.PROCESSING);
            when(paymentTransactionRepository.findByExternalRef("ext-pay-123"))
                    .thenReturn(Optional.of(txn));
            when(paymentTransactionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
            when(paymentWebhookRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            // When
            paymentService.processWebhook("razorpay", payload, signature);

            // Then
            verify(razorpayAdapter).verifyWebhookSignature(payload, signature);
            verify(paymentWebhookRepository, times(2)).save(any(PaymentWebhook.class));
            verify(paymentTransactionRepository).save(any(PaymentTransaction.class));
        }

        @Test
        @DisplayName("Should throw BusinessException when webhook signature is invalid")
        void shouldThrowOnInvalidSignature() {
            // Given
            String payload = "{\"event\":\"payment.captured\"}";
            String signature = "invalid-signature";
            PaymentConfig config = buildConfig(PaymentConfig.PaymentProvider.RAZORPAY);

            when(paymentConfigRepository.findByTenantIdAndProviderAndIsActiveTrueAndIsDeletedFalse(
                    TENANT_ID, PaymentConfig.PaymentProvider.RAZORPAY))
                    .thenReturn(Optional.of(config));
            when(razorpayAdapter.verifyWebhookSignature(payload, signature)).thenReturn(false);

            // When/Then
            assertThatThrownBy(() -> paymentService.processWebhook("razorpay", payload, signature))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("Invalid webhook signature");
        }

        @Test
        @DisplayName("Should throw BusinessException when provider not configured for webhook")
        void shouldThrowWhenProviderNotConfiguredForWebhook() {
            // Given
            when(paymentConfigRepository.findByTenantIdAndProviderAndIsActiveTrueAndIsDeletedFalse(
                    TENANT_ID, PaymentConfig.PaymentProvider.RAZORPAY))
                    .thenReturn(Optional.empty());

            // When/Then
            assertThatThrownBy(() -> paymentService.processWebhook("razorpay", "{}", "sig"))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("Payment provider not configured");
        }
    }

    // ===================== Config Tests =====================

    @Nested
    @DisplayName("savePaymentConfig")
    class SavePaymentConfig {

        @Test
        @DisplayName("Should encrypt API key and save config")
        void shouldEncryptApiKeyAndSave() {
            // Given
            PaymentConfig config = PaymentConfig.builder()
                    .provider(PaymentConfig.PaymentProvider.STRIPE)
                    .apiKeyEncrypted("raw-api-key")
                    .merchantId("merchant-123")
                    .isActive(true)
                    .configKey("stripe-prod")
                    .build();

            when(encryptionService.encrypt("raw-api-key")).thenReturn("encrypted-api-key");
            when(paymentConfigRepository.save(any(PaymentConfig.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            // When
            PaymentConfig result = paymentService.savePaymentConfig(config);

            // Then
            assertThat(result.getTenantId()).isEqualTo(TENANT_ID);
            assertThat(result.getApiKeyEncrypted()).isEqualTo("encrypted-api-key");
            verify(encryptionService).encrypt("raw-api-key");
            verify(paymentConfigRepository).save(any(PaymentConfig.class));
        }
    }

    // ===================== List & Get Tests =====================

    @Nested
    @DisplayName("listPaymentTransactions & getPaymentTransaction")
    class ListAndGetTests {

        @Test
        @DisplayName("Should list transactions for current tenant")
        void shouldListTransactionsForCurrentTenant() {
            // Given
            Pageable pageable = PageRequest.of(0, 10);
            PaymentTransaction txn = buildTransaction(PaymentTransaction.PaymentProvider.RAZORPAY);
            txn.setTenantId(TENANT_ID);
            Page<PaymentTransaction> page = new PageImpl<>(List.of(txn));

            when(paymentTransactionRepository.findByTenantId(TENANT_ID, pageable)).thenReturn(page);

            // When
            Page<PaymentTransaction> result = paymentService.listPaymentTransactions(pageable);

            // Then
            assertThat(result.getContent()).hasSize(1);
            verify(paymentTransactionRepository).findByTenantId(TENANT_ID, pageable);
        }

        @Test
        @DisplayName("Should get payment transaction by ID")
        void shouldGetPaymentTransactionById() {
            // Given
            UUID paymentId = UUID.randomUUID();
            PaymentTransaction txn = buildTransaction(PaymentTransaction.PaymentProvider.RAZORPAY);
            txn.setId(paymentId);
            txn.setTenantId(TENANT_ID);

            when(paymentTransactionRepository.findById(paymentId)).thenReturn(Optional.of(txn));

            // When
            PaymentTransaction result = paymentService.getPaymentTransaction(paymentId);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.getId()).isEqualTo(paymentId);
        }

        @Test
        @DisplayName("Should throw when getting payment from different tenant")
        void shouldThrowWhenGettingPaymentFromDifferentTenant() {
            // Given
            UUID paymentId = UUID.randomUUID();
            PaymentTransaction txn = buildTransaction(PaymentTransaction.PaymentProvider.RAZORPAY);
            txn.setId(paymentId);
            txn.setTenantId(UUID.randomUUID()); // different tenant

            when(paymentTransactionRepository.findById(paymentId)).thenReturn(Optional.of(txn));

            // When/Then
            assertThatThrownBy(() -> paymentService.getPaymentTransaction(paymentId))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("Unauthorized access");
        }
    }

    // ===================== Helper Methods =====================

    private PaymentTransaction buildTransaction(PaymentTransaction.PaymentProvider provider) {
        return PaymentTransaction.builder()
                .transactionRef("TXN-" + UUID.randomUUID())
                .type(PaymentTransaction.PaymentType.PAYROLL)
                .amount(new BigDecimal("5000.00"))
                .currency("INR")
                .provider(provider)
                .recipientName("John Doe")
                .recipientAccountNumber("1234567890")
                .recipientIfsc("SBIN0001234")
                .build();
    }

    private PaymentConfig buildConfig(PaymentConfig.PaymentProvider provider) {
        return PaymentConfig.builder()
                .provider(provider)
                .apiKeyEncrypted("encrypted-key")
                .isActive(true)
                .configKey("config-" + provider.name().toLowerCase())
                .build();
    }
}
