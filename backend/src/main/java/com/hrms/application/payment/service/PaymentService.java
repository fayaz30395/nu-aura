package com.hrms.application.payment.service;

import com.hrms.common.exception.BusinessException;
import com.hrms.common.exception.ResourceNotFoundException;
import com.hrms.common.security.EncryptionService;
import com.hrms.common.security.SecurityContext;
import com.hrms.domain.payment.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Main payment service orchestrating payment operations
 * Handles initiation, status tracking, refunds, and webhook processing
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class PaymentService {

    private final PaymentConfigRepository paymentConfigRepository;
    private final PaymentTransactionRepository paymentTransactionRepository;
    private final PaymentBatchRepository paymentBatchRepository;
    private final PaymentWebhookRepository paymentWebhookRepository;
    private final PaymentRefundRepository paymentRefundRepository;
    private final RazorpayAdapter razorpayAdapter;
    private final StripeAdapter stripeAdapter;
    private final EncryptionService encryptionService;

    /**
     * Initiate a single payment transaction
     */
    @Transactional(isolation = Isolation.SERIALIZABLE)
    public PaymentTransaction initiatePayment(PaymentTransaction transaction) {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        UUID userId = SecurityContext.getCurrentUserId();

        transaction.setTenantId(tenantId);
        transaction.setCreatedBy(userId);
        transaction.setInitiatedAt(LocalDateTime.now());

        // Validate payment config exists
        PaymentConfig config = getActivePaymentConfig(tenantId, toConfigProvider(transaction.getProvider()));
        if (config == null) {
            throw new BusinessException("Payment provider not configured: " + transaction.getProvider());
        }

        // Call provider adapter to initiate payment
        PaymentGatewayAdapter adapter = getAdapterForProvider(toConfigProvider(transaction.getProvider()));
        adapter.initialize(config);

        PaymentGatewayAdapter.PaymentGatewayResponse providerResponse = adapter.initiatePayment(transaction);
        if (!providerResponse.isSuccess()) {
            transaction.setStatus(PaymentTransaction.PaymentStatus.FAILED);
            transaction.setFailedReason(providerResponse.getMessage());
        } else {
            transaction.setStatus(PaymentTransaction.PaymentStatus.PROCESSING);
            transaction.setExternalRef(providerResponse.getExternalPaymentId());
        }

        PaymentTransaction saved = paymentTransactionRepository.save(transaction);
        log.info("Payment initiated: {} by user {}", saved.getId(), userId);
        return saved;
    }

    /**
     * Initiate batch payments (for payroll, expense reimbursement, etc.)
     */
    @Transactional(isolation = Isolation.SERIALIZABLE)
    public PaymentBatch initiateBatchPayment(PaymentBatch batch, List<PaymentTransaction> transactions) {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        UUID userId = SecurityContext.getCurrentUserId();

        batch.setTenantId(tenantId);
        batch.setInitiatedBy(userId);
        batch.setCreatedBy(userId);

        // Validate provider config
        PaymentConfig config = getActivePaymentConfig(tenantId, toConfigProvider(transactions.get(0).getProvider()));
        if (config == null) {
            throw new BusinessException("Payment provider not configured");
        }

        // Initialize all transactions
        for (PaymentTransaction txn : transactions) {
            txn.setTenantId(tenantId);
            txn.setCreatedBy(userId);
            txn.setInitiatedAt(LocalDateTime.now());
        }

        // Save batch
        PaymentBatch savedBatch = paymentBatchRepository.save(batch);

        // Process transactions through adapter
        PaymentGatewayAdapter adapter = getAdapterForProvider(toConfigProvider(transactions.get(0).getProvider()));
        adapter.initialize(config);

        List<PaymentGatewayAdapter.PaymentGatewayResponse> responses = adapter.initiateBatchPayments(transactions);

        // Update transactions with provider responses
        for (int i = 0; i < transactions.size(); i++) {
            PaymentTransaction txn = transactions.get(i);
            PaymentGatewayAdapter.PaymentGatewayResponse response = responses.get(i);

            if (response.isSuccess()) {
                txn.setStatus(PaymentTransaction.PaymentStatus.PROCESSING);
                txn.setExternalRef(response.getExternalPaymentId());
                savedBatch.setSuccessCount(savedBatch.getSuccessCount() + 1);
            } else {
                txn.setStatus(PaymentTransaction.PaymentStatus.FAILED);
                txn.setFailedReason(response.getMessage());
                savedBatch.setFailedCount(savedBatch.getFailedCount() + 1);
            }

            paymentTransactionRepository.save(txn);
        }

        savedBatch.setStatus(savedBatch.getFailedCount() > 0 ?
            PaymentBatch.BatchStatus.PARTIAL_SUCCESS : PaymentBatch.BatchStatus.PROCESSING);
        paymentBatchRepository.save(savedBatch);

        log.info("Batch payment initiated: {} with {} transactions", savedBatch.getId(), transactions.size());
        return savedBatch;
    }

    /**
     * Check payment status
     */
    @Transactional(readOnly = true)
    public PaymentTransaction checkPaymentStatus(UUID paymentId) {
        UUID tenantId = SecurityContext.getCurrentTenantId();

        PaymentTransaction transaction = paymentTransactionRepository.findById(paymentId)
            .orElseThrow(() -> new ResourceNotFoundException("Payment not found"));

        if (!transaction.getTenantId().equals(tenantId)) {
            throw new BusinessException("Unauthorized access to payment");
        }

        // Check status with provider
        PaymentGatewayAdapter adapter = getAdapterForProvider(toConfigProvider(transaction.getProvider()));
        PaymentConfig config = getActivePaymentConfig(tenantId, toConfigProvider(transaction.getProvider()));
        adapter.initialize(config);

        PaymentGatewayAdapter.PaymentStatusResponse statusResponse = adapter.checkStatus(transaction.getExternalRef());
        if (statusResponse != null) {
            // Update transaction status based on provider response
            if ("COMPLETED".equals(statusResponse.getStatus())) {
                transaction.setStatus(PaymentTransaction.PaymentStatus.COMPLETED);
                transaction.setCompletedAt(LocalDateTime.now());
            } else if ("FAILED".equals(statusResponse.getStatus())) {
                transaction.setStatus(PaymentTransaction.PaymentStatus.FAILED);
            }
            paymentTransactionRepository.save(transaction);
        }

        return transaction;
    }

    /**
     * Process refund for a payment
     */
    @Transactional(isolation = Isolation.SERIALIZABLE)
    public PaymentRefund processRefund(UUID paymentId, String reason) {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        UUID userId = SecurityContext.getCurrentUserId();

        PaymentTransaction transaction = paymentTransactionRepository.findById(paymentId)
            .orElseThrow(() -> new ResourceNotFoundException("Payment not found"));

        if (!transaction.getTenantId().equals(tenantId)) {
            throw new BusinessException("Unauthorized access to payment");
        }

        if (!PaymentTransaction.PaymentStatus.COMPLETED.equals(transaction.getStatus())) {
            throw new BusinessException("Only completed payments can be refunded");
        }

        // Create refund record
        PaymentRefund refund = PaymentRefund.builder()
            .tenantId(tenantId)
            .transactionId(paymentId)
            .refundRef("REF-" + UUID.randomUUID())
            .amount(transaction.getAmount())
            .status(PaymentRefund.RefundStatus.INITIATED)
            .reason(reason)
            .initiatedBy(userId)
            .createdBy(userId)
            .build();

        // Call provider to process refund
        PaymentGatewayAdapter adapter = getAdapterForProvider(toConfigProvider(transaction.getProvider()));
        PaymentConfig config = getActivePaymentConfig(tenantId, toConfigProvider(transaction.getProvider()));
        adapter.initialize(config);

        PaymentGatewayAdapter.PaymentGatewayResponse refundResponse = adapter.processRefund(refund);
        if (refundResponse.isSuccess()) {
            refund.setStatus(PaymentRefund.RefundStatus.PROCESSING);
            refund.setExternalRefundId(refundResponse.getExternalPaymentId());
        } else {
            refund.setStatus(PaymentRefund.RefundStatus.FAILED);
        }

        PaymentRefund savedRefund = paymentRefundRepository.save(refund);
        transaction.setStatus(PaymentTransaction.PaymentStatus.REFUNDED);
        transaction.setRefundedAt(LocalDateTime.now());
        paymentTransactionRepository.save(transaction);

        log.info("Refund processed for payment: {}", paymentId);
        return savedRefund;
    }

    /**
     * Process incoming webhook from payment provider
     */
    @Transactional(isolation = Isolation.SERIALIZABLE)
    public void processWebhook(String provider, String payload, String signature) {
        UUID tenantId = SecurityContext.getCurrentTenantId();

        PaymentConfig config = getActivePaymentConfig(tenantId,
            PaymentConfig.PaymentProvider.valueOf(provider.toUpperCase()));

        if (config == null) {
            throw new BusinessException("Payment provider not configured");
        }

        PaymentGatewayAdapter adapter = getAdapterForProvider(
            PaymentConfig.PaymentProvider.valueOf(provider.toUpperCase()));
        adapter.initialize(config);

        // Verify signature
        if (!adapter.verifyWebhookSignature(payload, signature)) {
            throw new BusinessException("Invalid webhook signature");
        }

        // Save webhook record
        PaymentWebhook webhook = new PaymentWebhook();
        webhook.setTenantId(tenantId);
        webhook.setProvider(provider);
        webhook.setPayload(payload);
        webhook.setStatus("RECEIVED");
        paymentWebhookRepository.save(webhook);

        // Parse and process webhook
        try {
            PaymentGatewayAdapter.PaymentWebhookData data = adapter.parseWebhookPayload(payload);
            webhook.setEventType(data.getEventType());
            webhook.setExternalEventId(data.getExternalPaymentId());

            // Update transaction status based on webhook
            Optional<PaymentTransaction> txnOpt = paymentTransactionRepository.findByExternalRef(data.externalPaymentId);
            if (txnOpt.isPresent()) {
                PaymentTransaction transaction = txnOpt.get();
                updateTransactionFromWebhook(transaction, data);
                paymentTransactionRepository.save(transaction);
            }

            webhook.setProcessed(true);
            webhook.setProcessedAt(LocalDateTime.now());
            webhook.setStatus("PROCESSED");
        } catch (Exception e) { // Intentional broad catch — service error boundary
            log.error("Error processing webhook", e);
            webhook.setStatus("FAILED");
            webhook.setErrorMessage(e.getMessage());
        }

        paymentWebhookRepository.save(webhook);
    }

    /**
     * Save payment configuration
     */
    @Transactional(isolation = Isolation.SERIALIZABLE)
    public PaymentConfig savePaymentConfig(PaymentConfig config) {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        config.setTenantId(tenantId);

        // Encrypt API key
        config.setApiKeyEncrypted(encryptionService.encrypt(config.getApiKeyEncrypted()));

        return paymentConfigRepository.save(config);
    }

    /**
     * Get active payment configuration for a provider
     */
    @Transactional(readOnly = true)
    public PaymentConfig getActivePaymentConfig(UUID tenantId, PaymentConfig.PaymentProvider provider) {
        return paymentConfigRepository.findByTenantIdAndProviderAndIsActiveTrueAndIsDeletedFalse(tenantId, provider)
            .orElse(null);
    }

    /**
     * List payment transactions
     */
    @Transactional(readOnly = true)
    public Page<PaymentTransaction> listPaymentTransactions(Pageable pageable) {
        UUID tenantId = SecurityContext.getCurrentTenantId();
        return paymentTransactionRepository.findByTenantId(tenantId, pageable);
    }

    /**
     * Get payment transaction details
     */
    @Transactional(readOnly = true)
    public PaymentTransaction getPaymentTransaction(UUID paymentId) {
        UUID tenantId = SecurityContext.getCurrentTenantId();

        PaymentTransaction transaction = paymentTransactionRepository.findById(paymentId)
            .orElseThrow(() -> new ResourceNotFoundException("Payment not found"));

        if (!transaction.getTenantId().equals(tenantId)) {
            throw new BusinessException("Unauthorized access to payment");
        }

        return transaction;
    }

    /**
     * Get adapter for payment provider
     */
    private PaymentGatewayAdapter getAdapterForProvider(PaymentConfig.PaymentProvider provider) {
        return switch (provider) {
            case RAZORPAY -> razorpayAdapter;
            case STRIPE -> stripeAdapter;
            default -> throw new BusinessException("Unsupported payment provider: " + provider);
        };
    }

    /**
     * Convert PaymentTransaction provider enum to PaymentConfig provider enum
     */
    private PaymentConfig.PaymentProvider toConfigProvider(PaymentTransaction.PaymentProvider provider) {
        return PaymentConfig.PaymentProvider.valueOf(provider.name());
    }

    /**
     * Update transaction status from webhook data
     */
    private void updateTransactionFromWebhook(PaymentTransaction transaction,
                                               PaymentGatewayAdapter.PaymentWebhookData data) {
        if ("completed".equalsIgnoreCase(data.getStatus()) || "succeeded".equalsIgnoreCase(data.getStatus())) {
            transaction.setStatus(PaymentTransaction.PaymentStatus.COMPLETED);
            transaction.setCompletedAt(LocalDateTime.now());
        } else if ("failed".equalsIgnoreCase(data.getStatus())) {
            transaction.setStatus(PaymentTransaction.PaymentStatus.FAILED);
        }
    }
}
