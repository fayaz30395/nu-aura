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
 * TODO: When enabling for production:
 * 1. Move webhook endpoints to permitAll in SecurityConfig (they are provider-initiated)
 * 2. Implement real signature verification in RazorpayAdapter and StripeAdapter
 * 3. Add idempotency check using externalEventId to prevent duplicate processing
 * 4. Add rate limiting to prevent webhook flood attacks
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
