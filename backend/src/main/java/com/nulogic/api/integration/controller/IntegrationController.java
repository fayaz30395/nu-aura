package com.nulogic.api.integration.controller;

import com.nulogic.api.integration.dto.*;
import com.nulogic.common.security.Permission;
import com.nulogic.common.security.RequiresPermission;
import com.nulogic.common.security.TenantContext;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.infrastructure.payment.PaymentGatewayService;
import com.nulogic.infrastructure.payment.PaymentRequest;
import com.nulogic.infrastructure.payment.PaymentResponse;
import com.nulogic.infrastructure.sms.SmsService;
import com.nulogic.infrastructure.sms.SmsTemplate;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Controller for managing third-party integrations
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/integrations")
@RequiredArgsConstructor
public class IntegrationController {

    private final SmsService smsService;
    private final SmsTemplate smsTemplate;
    private final PaymentGatewayService paymentGatewayService;
    private final TenantTimeService tenantTimeService;

    // ===================== SMS Integration Endpoints =====================

    @GetMapping("/sms/status")
    @RequiresPermission(Permission.SYSTEM_ADMIN)
    public ResponseEntity<IntegrationStatusResponse> getSmsStatus() {
        UUID tenantId = TenantContext.requireCurrentTenant();
        boolean configured = smsService.isConfigured();

        return ResponseEntity.ok(IntegrationStatusResponse.builder()
                .integrationType("SMS")
                .provider("Twilio")
                .configured(configured)
                .enabled(configured)
                .lastChecked(tenantTimeService.now(tenantId))
                .message(configured ? "SMS service is operational" : "SMS service is not configured")
                .build());
    }

    @PostMapping("/sms/test")
    @RequiresPermission(Permission.SYSTEM_ADMIN)
    public ResponseEntity<IntegrationTestResponse> testSms(@Valid @RequestBody SmsTestRequest request) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        try {
            boolean success = smsService.testConnection(request.getPhoneNumber());

            return ResponseEntity.ok(IntegrationTestResponse.builder()
                    .success(success)
                    .message(success ? "Test SMS sent successfully" : "Failed to send test SMS")
                    .timestamp(tenantTimeService.now(tenantId))
                    .build());
        } catch (Exception e) { // Intentional broad catch — controller error boundary
            log.error("SMS test failed", e);
            return ResponseEntity.ok(IntegrationTestResponse.builder()
                    .success(false)
                    .message("Error: " + e.getMessage())
                    .timestamp(tenantTimeService.now(tenantId))
                    .build());
        }
    }

    @PostMapping("/sms/send")
    @RequiresPermission(Permission.SYSTEM_ADMIN)
    public ResponseEntity<SmsSendResponse> sendSms(@Valid @RequestBody SmsSendRequest request) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        try {
            String messageId;

            if (request.getTemplateId() != null && !request.getTemplateId().isEmpty()) {
                messageId = smsService.sendTemplatedSms(
                        request.getPhoneNumber(),
                        request.getTemplateId(),
                        request.getVariables()
                );
            } else {
                messageId = smsService.sendSms(request.getPhoneNumber(), request.getMessage());
            }

            return ResponseEntity.ok(SmsSendResponse.builder()
                    .messageId(messageId)
                    .success(true)
                    .phoneNumber(request.getPhoneNumber())
                    .timestamp(tenantTimeService.now(tenantId))
                    .build());
        } catch (Exception e) { // Intentional broad catch — controller error boundary
            log.error("Failed to send SMS", e);
            return ResponseEntity.ok(SmsSendResponse.builder()
                    .success(false)
                    .errorMessage(e.getMessage())
                    .phoneNumber(request.getPhoneNumber())
                    .timestamp(tenantTimeService.now(tenantId))
                    .build());
        }
    }

    @GetMapping("/sms/templates")
    @RequiresPermission(Permission.SYSTEM_ADMIN)
    public ResponseEntity<Map<String, String>> getSmsTemplates() {
        return ResponseEntity.ok(smsTemplate.getAllTemplates());
    }

    // ===================== Payment Gateway Integration Endpoints =====================

    @GetMapping("/payment/status")
    @RequiresPermission(Permission.SYSTEM_ADMIN)
    public ResponseEntity<IntegrationStatusResponse> getPaymentStatus() {
        UUID tenantId = TenantContext.requireCurrentTenant();
        boolean configured = paymentGatewayService.isConfigured();

        return ResponseEntity.ok(IntegrationStatusResponse.builder()
                .integrationType("PAYMENT_GATEWAY")
                .provider("Stripe")
                .configured(configured)
                .enabled(configured)
                .lastChecked(tenantTimeService.now(tenantId))
                .message(configured ? "Payment gateway is operational" : "Payment gateway is not configured")
                .supportedMethods(configured ?
                        Arrays.asList(paymentGatewayService.getSupportedPaymentMethods()) : null)
                .build());
    }

    @PostMapping("/payment/test")
    @RequiresPermission(Permission.SYSTEM_ADMIN)
    public ResponseEntity<IntegrationTestResponse> testPaymentGateway() {
        UUID tenantId = TenantContext.requireCurrentTenant();
        try {
            boolean success = paymentGatewayService.testConnection();

            return ResponseEntity.ok(IntegrationTestResponse.builder()
                    .success(success)
                    .message(success ? "Payment gateway connection successful" : "Payment gateway connection failed")
                    .timestamp(tenantTimeService.now(tenantId))
                    .build());
        } catch (Exception e) { // Intentional broad catch — controller error boundary
            log.error("Payment gateway test failed", e);
            return ResponseEntity.ok(IntegrationTestResponse.builder()
                    .success(false)
                    .message("Error: " + e.getMessage())
                    .timestamp(tenantTimeService.now(tenantId))
                    .build());
        }
    }

    @PostMapping("/payment/create")
    @RequiresPermission(Permission.SYSTEM_ADMIN)
    public ResponseEntity<PaymentResponse> createPayment(@Valid @RequestBody PaymentRequest request) {
        PaymentResponse response = paymentGatewayService.createPayment(request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/payment/supported-methods")
    @RequiresPermission(Permission.SYSTEM_ADMIN)
    public ResponseEntity<String[]> getSupportedPaymentMethods() {
        return ResponseEntity.ok(paymentGatewayService.getSupportedPaymentMethods());
    }

    // ===================== General Integration Endpoints =====================

    @GetMapping("/status")
    @RequiresPermission(Permission.SYSTEM_ADMIN)
    public ResponseEntity<Map<String, IntegrationStatusResponse>> getAllIntegrationsStatus() {
        UUID tenantId = TenantContext.requireCurrentTenant();
        Map<String, IntegrationStatusResponse> statusMap = new HashMap<>();

        // SMS Status
        boolean smsConfigured = smsService.isConfigured();
        statusMap.put("SMS", IntegrationStatusResponse.builder()
                .integrationType("SMS")
                .provider("Twilio")
                .configured(smsConfigured)
                .enabled(smsConfigured)
                .lastChecked(tenantTimeService.now(tenantId))
                .build());

        // Payment Gateway Status
        boolean paymentConfigured = paymentGatewayService.isConfigured();
        statusMap.put("PAYMENT", IntegrationStatusResponse.builder()
                .integrationType("PAYMENT_GATEWAY")
                .provider("Stripe")
                .configured(paymentConfigured)
                .enabled(paymentConfigured)
                .lastChecked(tenantTimeService.now(tenantId))
                .build());

        return ResponseEntity.ok(statusMap);
    }
}
