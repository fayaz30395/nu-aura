package com.hrms.application.payment.service;

import com.hrms.domain.payment.PaymentConfig;
import com.hrms.domain.payment.PaymentTransaction;
import com.hrms.domain.payment.PaymentRefund;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

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
    class PaymentGatewayResponse {
        public String externalPaymentId;
        public String status;
        public String message;
        public Map<String, Object> metadata;
        public boolean success;
    }

    class PaymentStatusResponse {
        public String status; // INITIATED, PROCESSING, COMPLETED, FAILED
        public BigDecimal amount;
        public String currency;
        public long timestamp;
    }

    class PaymentWebhookData {
        public String eventType;
        public String externalPaymentId;
        public String status;
        public BigDecimal amount;
        public Map<String, Object> metadata;
    }
}
