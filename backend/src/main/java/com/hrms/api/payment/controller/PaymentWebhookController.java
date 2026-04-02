package com.hrms.api.payment.controller;

import com.hrms.application.payment.service.PaymentService;
import com.hrms.common.security.PaymentFeatureGuard;
import com.hrms.common.security.RequiresFeature;
import com.hrms.common.security.SecurityContext;
import com.hrms.domain.featureflag.FeatureFlag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;

/**
 * Webhook endpoint for payment provider callbacks.
 * Gated behind the ENABLE_PAYMENTS feature flag — when payments are disabled,
 * all webhook endpoints return 403 (AccessDenied via FeatureFlagAspect).
 *
 * <p>These endpoints are listed under {@code permitAll} in SecurityConfig because
 * they are provider-initiated and carry no JWT. Provider signature verification
 * is performed inside the respective adapters (RazorpayAdapter, StripeAdapter).</p>
 *
 * <p>Pre-production checklist (tracked per FUTURE notes in adapters):
 * <ul>
 *   <li>FUTURE: NUAURA-PAYMENT-001 — Wire real Stripe signature verification in StripeAdapter</li>
 *   <li>FUTURE: NUAURA-PAYMENT-002 — Wire real Razorpay signature verification in RazorpayAdapter</li>
 *   <li>FUTURE: NUAURA-PAYMENT-003 — Add idempotency check using externalEventId</li>
 *   <li>FUTURE: NUAURA-PAYMENT-004 — Add rate limiting on webhook flood</li>
 * </ul>
 * </p>
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/payments/webhooks")
@RequiredArgsConstructor
@RequiresFeature(FeatureFlag.ENABLE_PAYMENTS)
public class PaymentWebhookController {

    private final PaymentService paymentService;
    private final PaymentFeatureGuard paymentFeatureGuard;

    /**
     * Handle payment provider webhook callbacks
     * Provider-specific endpoints for Razorpay, Stripe, etc.
     */
    @PostMapping("/{provider}")
    public ResponseEntity<String> handleWebhook(
            @PathVariable String provider,
            @Valid @RequestBody String payload,
            @RequestHeader(value = "X-Signature", required = false) String signature,
            @RequestHeader(value = "X-Razorpay-Signature", required = false) String razorpaySignature,
            @RequestHeader(value = "Stripe-Signature", required = false) String stripeSignature) {

        paymentFeatureGuard.requirePaymentsEnabled();
        try {
            String actualSignature = signature != null ? signature :
                                    (razorpaySignature != null ? razorpaySignature : stripeSignature);

            if (actualSignature == null) {
                log.warn("Webhook received without signature from provider: {}", provider);
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Signature verification failed");
            }

            paymentService.processWebhook(provider, payload, actualSignature);

            return ResponseEntity.ok("Webhook processed successfully");
        } catch (Exception e) { // Intentional broad catch — controller error boundary
            log.error("Error processing webhook from provider: {}", provider, e);
            // LOW-2 FIX: Do not expose internal exception details to the caller.
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Error processing webhook");
        }
    }

    /**
     * Razorpay specific webhook endpoint
     */
    @PostMapping("/razorpay")
    public ResponseEntity<String> handleRazorpayWebhook(
            @Valid @RequestBody String payload,
            @RequestHeader("X-Razorpay-Signature") String signature) {

        return handleWebhook("razorpay", payload, null, signature, null);
    }

    /**
     * Stripe specific webhook endpoint
     */
    @PostMapping("/stripe")
    public ResponseEntity<String> handleStripeWebhook(
            @Valid @RequestBody String payload,
            @RequestHeader("Stripe-Signature") String signature) {

        return handleWebhook("stripe", payload, null, null, signature);
    }

    /**
     * Health check for webhook endpoint
     */
    @GetMapping("/health")
    public ResponseEntity<String> webhookHealth() {
        paymentFeatureGuard.requirePaymentsEnabled();
        return ResponseEntity.ok("Webhook endpoint is active");
    }
}
