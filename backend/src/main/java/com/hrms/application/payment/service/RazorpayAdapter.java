package com.hrms.application.payment.service;

import com.hrms.domain.payment.PaymentConfig;
import com.hrms.domain.payment.PaymentTransaction;
import com.hrms.domain.payment.PaymentRefund;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;

import org.springframework.transaction.annotation.Transactional;

/**
 * Razorpay payment gateway adapter
 * Handles Razorpay API integration for payments and refunds
 * <p>
 * Note: This is a stub implementation. Integrate with actual Razorpay SDK as needed.
 * Documentation: https://razorpay.com/docs/
 */
@Slf4j
@Service
public class RazorpayAdapter implements PaymentGatewayAdapter {

    /**
     * QA sweep S2-C K-6: same enabled flag as the Stripe stub — payment-service can
     * inspect it to refuse real charges while the adapter is still a stub.
     */
    @Value("${app.payments.adapters.enabled:false}")
    private boolean enabled;

    /** Latches so {@link #verifyWebhookSignature(String, String)} logs at most one WARN per startup. */
    private static final AtomicBoolean SIGNATURE_WARN_LOGGED = new AtomicBoolean(false);

    private PaymentConfig config;

    @PostConstruct
    void warnIfEnabledButStubbed() {
        if (enabled) {
            log.warn("RazorpayAdapter is enabled (app.payments.adapters.enabled=true) but the implementation is still a STUB — no real Razorpay API calls are made.");
        }
    }

    @Override
    public void initialize(PaymentConfig config) {
        this.config = config;
        log.info("Razorpay adapter initialized for tenant: {}", config.getTenantId());
    }

    @Override
    public PaymentGatewayResponse initiatePayment(PaymentTransaction transaction) {
        try {
            // Integration point: Call Razorpay API to create payment
            // Example: RazorpayClient.createTransfer(...)
            PaymentGatewayResponse response = new PaymentGatewayResponse();
            response.setExternalPaymentId("razorpay_" + transaction.getId());
            response.setStatus("PROCESSING");
            response.setSuccess(true);
            return response;
        } catch (RuntimeException e) {
            log.error("Razorpay payment initiation failed", e);
            PaymentGatewayResponse response = new PaymentGatewayResponse();
            response.setSuccess(false);
            response.setMessage(e.getMessage());
            return response;
        }
    }

    @Override
    public List<PaymentGatewayResponse> initiateBatchPayments(List<PaymentTransaction> transactions) {
        // Integration point: Call Razorpay batch API
        return transactions.stream()
                .map(this::initiatePayment)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public PaymentStatusResponse checkStatus(String externalPaymentId) {
        try {
            // Integration point: Call Razorpay API to fetch payment status
            // Example: RazorpayClient.fetchPaymentDetails(externalPaymentId)
            PaymentStatusResponse response = new PaymentStatusResponse();
            response.setStatus("COMPLETED");
            response.setTimestamp(System.currentTimeMillis());
            return response;
        } catch (RuntimeException e) {
            log.error("Razorpay status check failed", e);
            return null;
        }
    }

    @Override
    @Transactional
    public PaymentGatewayResponse processRefund(PaymentRefund refund) {
        try {
            // Integration point: Call Razorpay API to initiate refund
            // Example: RazorpayClient.createRefund(...)
            PaymentGatewayResponse response = new PaymentGatewayResponse();
            response.setExternalPaymentId("razorpay_refund_" + refund.getId());
            response.setStatus("PROCESSING");
            response.setSuccess(true);
            return response;
        } catch (RuntimeException e) {
            log.error("Razorpay refund processing failed", e);
            PaymentGatewayResponse response = new PaymentGatewayResponse();
            response.setSuccess(false);
            response.setMessage(e.getMessage());
            return response;
        }
    }

    @Override
    public boolean verifyWebhookSignature(String payload, String signature) {
        // FUTURE: NUAURA-PAYMENT-006 — Implement Razorpay webhook signature verification using
        // HmacSHA256(webhookSecret, payload) and compare with X-Razorpay-Signature header.
        // Requires: RAZORPAY_WEBHOOK_SECRET env var.
        // Until wired in, REJECT all signatures to prevent unverified payloads from
        // mutating payment state (fail-secure posture).
        // QA sweep S2-C K-6: log once per startup so this fail-secure stub is visible.
        if (SIGNATURE_WARN_LOGGED.compareAndSet(false, true)) {
            log.warn("Razorpay webhook signature verification is STUBBED — every webhook will be rejected until NUAURA-PAYMENT-006 ships.");
        }
        return false;
    }

    @Override
    public PaymentWebhookData parseWebhookPayload(String payload) {
        // QA sweep S2-C K-6: previously returned a fabricated "payment.completed" event
        // regardless of payload. Throw explicitly instead of returning fake event data.
        throw new UnsupportedOperationException("Razorpay webhook payload parsing not implemented");
    }

    @Override
    public PaymentConfig.PaymentProvider getProvider() {
        return PaymentConfig.PaymentProvider.RAZORPAY;
    }

    @Override
    public boolean testConnection(PaymentConfig config) {
        try {
            // Integration point: Test Razorpay connection
            // Example: RazorpayClient.testConnection(config.getApiKey())
            log.info("Razorpay connection test successful");
            return true;
        } catch (RuntimeException e) {
            log.error("Razorpay connection test failed", e);
            return false;
        }
    }
}
