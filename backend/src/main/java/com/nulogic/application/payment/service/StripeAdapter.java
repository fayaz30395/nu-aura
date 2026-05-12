package com.nulogic.application.payment.service;

import com.nulogic.domain.payment.PaymentConfig;
import com.nulogic.domain.payment.PaymentRefund;
import com.nulogic.domain.payment.PaymentTransaction;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Stripe payment gateway adapter
 * Handles Stripe API integration for payments and refunds
 * <p>
 * Note: This is a stub implementation. Integrate with actual Stripe SDK as needed.
 * Documentation: https://stripe.com/docs/payments
 */
@Slf4j
@Service
public class StripeAdapter implements PaymentGatewayAdapter {

    /**
     * Latches so {@link #verifyWebhookSignature(String, String)} logs at most one WARN per startup.
     */
    private static final AtomicBoolean SIGNATURE_WARN_LOGGED = new AtomicBoolean(false);
    /**
     * QA sweep S2-C K-6: Stripe (and Razorpay) adapters are stubs. The enabled flag
     * lets payment-service code know not to route real money through them yet; if it
     * is flipped on while the adapter is still a stub, log a startup WARN.
     */
    @Value("${app.payments.adapters.enabled:false}")
    private boolean enabled;
    private PaymentConfig config;

    @PostConstruct
    void warnIfEnabledButStubbed() {
        if (enabled) {
            log.warn("StripeAdapter is enabled (app.payments.adapters.enabled=true) but the implementation is still a STUB — no real Stripe API calls are made.");
        }
    }

    @Override
    public void initialize(PaymentConfig config) {
        this.config = config;
        log.info("Stripe adapter initialized for tenant: {}", config.getTenantId());
    }

    @Override
    public PaymentGatewayResponse initiatePayment(PaymentTransaction transaction) {
        try {
            // Integration point: Call Stripe API to create payment intent
            // Example: PaymentIntent.create(...)
            PaymentGatewayResponse response = new PaymentGatewayResponse();
            response.setExternalPaymentId("stripe_" + transaction.getId());
            response.setStatus("PROCESSING");
            response.setSuccess(true);
            return response;
        } catch (RuntimeException e) {
            log.error("Stripe payment initiation failed", e);
            PaymentGatewayResponse response = new PaymentGatewayResponse();
            response.setSuccess(false);
            response.setMessage(e.getMessage());
            return response;
        }
    }

    @Override
    public List<PaymentGatewayResponse> initiateBatchPayments(List<PaymentTransaction> transactions) {
        // Integration point: Call Stripe batch API
        return transactions.stream()
                .map(this::initiatePayment)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public PaymentStatusResponse checkStatus(String externalPaymentId) {
        try {
            // Integration point: Call Stripe API to fetch payment intent status
            // Example: PaymentIntent.retrieve(externalPaymentId)
            PaymentStatusResponse response = new PaymentStatusResponse();
            response.setStatus("COMPLETED");
            response.setTimestamp(System.currentTimeMillis());
            return response;
        } catch (RuntimeException e) {
            log.error("Stripe status check failed", e);
            return null;
        }
    }

    @Override
    @Transactional
    public PaymentGatewayResponse processRefund(PaymentRefund refund) {
        try {
            // Integration point: Call Stripe API to create refund
            // Example: Refund.create(...)
            PaymentGatewayResponse response = new PaymentGatewayResponse();
            response.setExternalPaymentId("stripe_refund_" + refund.getId());
            response.setStatus("PROCESSING");
            response.setSuccess(true);
            return response;
        } catch (RuntimeException e) {
            log.error("Stripe refund processing failed", e);
            PaymentGatewayResponse response = new PaymentGatewayResponse();
            response.setSuccess(false);
            response.setMessage(e.getMessage());
            return response;
        }
    }

    @Override
    public boolean verifyWebhookSignature(String payload, String signature) {
        // FUTURE: NUAURA-PAYMENT-005 — Implement Stripe webhook signature verification using
        // Webhook.constructEvent(payload, signature, webhookSecret) from the Stripe Java SDK.
        // Requires: stripe-java dependency + STRIPE_WEBHOOK_SECRET env var.
        // Until the SDK is integrated, REJECT all signatures to prevent unverified
        // webhook payloads from mutating payment state (fail-secure posture).
        // QA sweep S2-C K-6: log once per startup so this fail-secure stub is visible
        // in deployment logs without spamming each webhook.
        if (SIGNATURE_WARN_LOGGED.compareAndSet(false, true)) {
            log.warn("Stripe webhook signature verification is STUBBED — every webhook will be rejected until NUAURA-PAYMENT-005 ships.");
        }
        return false;
    }

    @Override
    public PaymentWebhookData parseWebhookPayload(String payload) {
        // QA sweep S2-C K-6: previously this returned a fabricated "payment_intent.succeeded"
        // event regardless of the real payload — extremely dangerous for any caller that
        // believed the parse "worked". Throw explicitly until the real parser ships.
        throw new UnsupportedOperationException("Stripe webhook payload parsing not implemented");
    }

    @Override
    public PaymentConfig.PaymentProvider getProvider() {
        return PaymentConfig.PaymentProvider.STRIPE;
    }

    @Override
    public boolean testConnection(PaymentConfig config) {
        try {
            // Integration point: Test Stripe connection
            // Example: Stripe.apiKey = config.getApiKey(); Customer.list(...)
            log.info("Stripe connection test successful");
            return true;
        } catch (RuntimeException e) {
            log.error("Stripe connection test failed", e);
            return false;
        }
    }
}
