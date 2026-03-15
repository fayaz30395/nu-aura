package com.hrms.api.payment.controller;

import com.hrms.application.payment.service.PaymentService;
import com.hrms.common.security.SecurityContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;

/**
 * Webhook endpoint for payment provider callbacks
 * No authentication required - signature verification is handled by the service
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/payments/webhooks")
@RequiredArgsConstructor
public class PaymentWebhookController {

    private final PaymentService paymentService;

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
        } catch (Exception e) {
            log.error("Error processing webhook from provider: {}", provider, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Error processing webhook: " + e.getMessage());
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
        return ResponseEntity.ok("Webhook endpoint is active");
    }
}
