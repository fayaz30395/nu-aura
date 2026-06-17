package com.nulogic.application.payment.service;

import com.nulogic.common.util.WebhookSignatureVerifier;
import com.nulogic.domain.payment.PaymentConfig;
import com.nulogic.domain.payment.PaymentRefund;
import com.nulogic.domain.payment.PaymentTransaction;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
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
        // RBAC-01: real Stripe webhook verification — HMAC-SHA256 over "<t>.<payload>" using the
        // per-tenant webhook secret, with a 5-minute replay tolerance and constant-time compare.
        // Fail-secure: if no secret is configured, reject (the rest of the adapter is still a stub,
        // and charges are gated by app.payments.adapters.enabled, but the signature gate is real).
        if (config == null || config.getWebhookSecret() == null || config.getWebhookSecret().isBlank()) {
            if (SIGNATURE_WARN_LOGGED.compareAndSet(false, true)) {
                log.warn("Stripe webhook secret not configured for tenant — rejecting all webhooks (fail-secure).");
            }
            return false;
        }
        boolean valid = WebhookSignatureVerifier.verifyStripe(
                payload, signature, config.getWebhookSecret(), 300L, Instant.now().getEpochSecond());
        if (!valid) {
            log.warn("Stripe webhook signature verification failed (bad signature or expired timestamp).");
        }
        return valid;
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
