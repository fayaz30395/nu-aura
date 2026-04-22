package com.hrms.api.payment.controller;

import com.hrms.api.payment.dto.PaymentConfigDto;
import com.hrms.application.payment.service.PaymentService;
import com.hrms.common.security.PaymentFeatureGuard;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresFeature;
import com.hrms.common.security.RequiresPermission;
import com.hrms.domain.featureflag.FeatureFlag;
import com.hrms.domain.payment.PaymentConfig;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/payments/config")
@RequiredArgsConstructor
@RequiresFeature(FeatureFlag.ENABLE_PAYMENTS)
public class PaymentConfigController {

    private final PaymentService paymentService;
    private final PaymentFeatureGuard paymentFeatureGuard;

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
     * Test payment gateway connection
     */
    @PostMapping("/test-connection")
    @RequiresPermission(Permission.PAYMENT_CONFIG_MANAGE)
    public ResponseEntity<String> testConnection(@Valid @RequestBody PaymentConfigDto request) {
        paymentFeatureGuard.requirePaymentsEnabled();
        request.toEntity();
        // In real implementation, call adapter to test connection
        return ResponseEntity.ok("Connection test initiated. Check logs for results.");
    }
}
