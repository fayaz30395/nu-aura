package com.hrms.application.payment.service;

import com.hrms.domain.payment.PaymentConfig;
import com.hrms.domain.payment.PaymentTransaction;
import com.hrms.domain.payment.PaymentRefund;

import lombok.Data;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * Abstract payment gateway adapter for provider-specific implementations
 * Razorpay, Stripe, Bank Transfer, etc.
 */
public interface PaymentGatewayAdapter {

    /**
     * Initialize payment configuration
     */
    void initialize(PaymentConfig config);

    /**
     * Initiate a single payment transaction
     */
    PaymentGatewayResponse initiatePayment(PaymentTransaction transaction);

    /**
     * Initiate batch payments
     */
    List<PaymentGatewayResponse> initiateBatchPayments(List<PaymentTransaction> transactions);

    /**
     * Check payment status
     */
    PaymentStatusResponse checkStatus(String externalPaymentId);

    /**
     * Process refund
     */
    PaymentGatewayResponse processRefund(PaymentRefund refund);

    /**
     * Verify webhook signature
     */
    boolean verifyWebhookSignature(String payload, String signature);

    /**
     * Parse webhook payload
     */
    PaymentWebhookData parseWebhookPayload(String payload);

    /**
     * Get provider name
     */
    PaymentConfig.PaymentProvider getProvider();

    /**
     * Test connection
     */
    boolean testConnection(PaymentConfig config);

    // Response DTOs
    @Data
    class PaymentGatewayResponse {
        private String externalPaymentId;
        private String status;
        private String message;
        private Map<String, Object> metadata;
        private boolean success;
    }

    @Data
    class PaymentStatusResponse {
        private String status; // INITIATED, PROCESSING, COMPLETED, FAILED
        private BigDecimal amount;
        private String currency;
        private long timestamp;
    }

    @Data
    class PaymentWebhookData {
        private String eventType;
        private String externalPaymentId;
        private String status;
        private BigDecimal amount;
        private Map<String, Object> metadata;
    }
}
