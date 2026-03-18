package com.hrms.api.payment.controller;

import com.hrms.api.payment.dto.PaymentTransactionDto;
import com.hrms.application.payment.service.PaymentService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.domain.payment.PaymentTransaction;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/payments")
@RequiredArgsConstructor
@Validated
public class PaymentController {

    private final PaymentService paymentService;

    /**
     * Initiate a single payment
     */
    @PostMapping
    @RequiresPermission(Permission.PAYMENT_INITIATE)
    public ResponseEntity<PaymentTransactionDto> initiatePayment(
            @Valid @RequestBody PaymentTransactionDto request) {

        PaymentTransaction transaction = request.toEntity();
        PaymentTransaction result = paymentService.initiatePayment(transaction);

        return ResponseEntity.status(HttpStatus.CREATED)
            .body(PaymentTransactionDto.fromEntity(result));
    }

    /**
     * Check payment status
     */
    @GetMapping("/{paymentId}/status")
    @RequiresPermission(Permission.PAYMENT_VIEW)
    public ResponseEntity<PaymentTransactionDto> checkPaymentStatus(@PathVariable UUID paymentId) {
        PaymentTransaction transaction = paymentService.checkPaymentStatus(paymentId);
        return ResponseEntity.ok(PaymentTransactionDto.fromEntity(transaction));
    }

    /**
     * Get payment details
     */
    @GetMapping("/{paymentId}")
    @RequiresPermission(Permission.PAYMENT_VIEW)
    public ResponseEntity<PaymentTransactionDto> getPaymentDetails(@PathVariable UUID paymentId) {
        PaymentTransaction transaction = paymentService.getPaymentTransaction(paymentId);
        return ResponseEntity.ok(PaymentTransactionDto.fromEntity(transaction));
    }

    /**
     * List all payments for tenant
     */
    @GetMapping
    @RequiresPermission(Permission.PAYMENT_VIEW)
    public ResponseEntity<Page<PaymentTransactionDto>> listPayments(Pageable pageable) {
        Page<PaymentTransaction> transactions = paymentService.listPaymentTransactions(pageable);
        Page<PaymentTransactionDto> dtos = new PageImpl<>(
            transactions.getContent().stream()
                .map(PaymentTransactionDto::fromEntity)
                .collect(Collectors.toList()),
            pageable,
            transactions.getTotalElements()
        );
        return ResponseEntity.ok(dtos);
    }

    /**
     * Process refund for a payment
     */
    @PostMapping("/{paymentId}/refund")
    @RequiresPermission(Permission.PAYMENT_REFUND)
    public ResponseEntity<String> refundPayment(
            @PathVariable UUID paymentId,
            @NotBlank @Size(max = 1000) @RequestParam String reason) {

        paymentService.processRefund(paymentId, reason);
        return ResponseEntity.ok("Refund initiated successfully");
    }
}
