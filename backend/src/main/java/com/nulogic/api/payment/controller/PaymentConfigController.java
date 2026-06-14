package com.nulogic.api.payment.controller;

import com.nulogic.api.payment.dto.PaymentConfigDto;
import com.nulogic.api.payment.dto.PaymentConfigToggleRequest;
import com.nulogic.application.payment.service.PaymentService;
import com.nulogic.common.security.PaymentFeatureGuard;
import com.nulogic.common.security.Permission;
import com.nulogic.common.security.RequiresFeature;
import com.nulogic.common.security.RequiresPermission;
import com.nulogic.domain.featureflag.FeatureFlag;
import com.nulogic.domain.payment.PaymentConfig;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/payments/config")
@RequiredArgsConstructor
@RequiresFeature(FeatureFlag.ENABLE_PAYMENTS)
public class PaymentConfigController {

    private final PaymentService paymentService;
    private final PaymentFeatureGuard paymentFeatureGuard;

    /**
     * List all payment configurations for the tenant
     */
    @GetMapping
    @RequiresPermission(Permission.PAYMENT_CONFIG_MANAGE)
    public ResponseEntity<List<PaymentConfigDto>> getAllPaymentConfigs() {
        paymentFeatureGuard.requirePaymentsEnabled();
        List<PaymentConfigDto> response = paymentService.listPaymentConfigs()
                .stream()
                .map(PaymentConfigDto::fromEntity)
                .toList();

        return ResponseEntity.ok(response);
    }

    /**
     * Get a payment configuration for a specific provider
     */
    @GetMapping("/{provider}")
    @RequiresPermission(Permission.PAYMENT_CONFIG_MANAGE)
    public ResponseEntity<PaymentConfigDto> getPaymentConfigByProvider(@PathVariable String provider) {
        paymentFeatureGuard.requirePaymentsEnabled();
        PaymentConfig config = paymentService.getPaymentConfigByProvider(provider);
        return ResponseEntity.ok(PaymentConfigDto.fromEntity(config));
    }

    /**
     * Save or update payment gateway configuration
     */
    @PostMapping
    @RequiresPermission(Permission.PAYMENT_CONFIG_MANAGE)
    public ResponseEntity<PaymentConfigDto> savePaymentConfig(
            @Valid @RequestBody PaymentConfigDto request) {

        paymentFeatureGuard.requirePaymentsEnabled();
        PaymentConfig config = request.toEntity();
        PaymentConfig saved = paymentService.savePaymentConfig(config);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(PaymentConfigDto.fromEntity(saved));
    }

    /**
     * Toggle active status for a provider config
     */
    @PatchMapping("/{provider}/toggle")
    @RequiresPermission(Permission.PAYMENT_CONFIG_MANAGE)
    public ResponseEntity<PaymentConfigDto> togglePaymentConfigActive(
            @PathVariable String provider,
            @Valid @RequestBody PaymentConfigToggleRequest request) {

        paymentFeatureGuard.requirePaymentsEnabled();
        PaymentConfig updated = paymentService.togglePaymentConfigActive(provider, request.getIsActive());
        return ResponseEntity.ok(PaymentConfigDto.fromEntity(updated));
    }

    /**
     * Test payment gateway connection
     */
    @PostMapping("/test-connection")
    @RequiresPermission(Permission.PAYMENT_CONFIG_MANAGE)
    public ResponseEntity<String> testConnection(@Valid @RequestBody PaymentConfigDto request) {
        paymentFeatureGuard.requirePaymentsEnabled();
        PaymentConfig config = request.toEntity();
        boolean success = paymentService.testPaymentGatewayConnection(config);

        if (success) {
            return ResponseEntity.ok("Connection test succeeded.");
        }
        return ResponseEntity.badRequest().body("Connection test failed.");
    }
}
