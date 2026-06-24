package com.nulogic.infrastructure.payment;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
public class PaymentGatewayService {

    private final Map<String, PaymentResponse> payments = new ConcurrentHashMap<>();

    @Value("${hrms.payment.enabled:false}")
    private boolean enabled;

    @Transactional
    public PaymentResponse createPayment(PaymentRequest request) {
        String paymentId = "pay_" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        PaymentResponse response = PaymentResponse.builder()
                .paymentId(paymentId)
                .status("requires_confirmation")
                .amount(request.getAmount())
                .currency(request.getCurrency())
                .description(request.getDescription())
                .customerId(request.getCustomerId())
                .paymentMethod(request.getPaymentMethod())
                .createdAt(/* JVM-local: mock dev/test gateway, no tenant context */ LocalDateTime.now())
                .clientSecret(paymentId + "_secret_" + UUID.randomUUID().toString().substring(0, 8))
                .metadata(request.getMetadata() != null ? request.getMetadata() : new HashMap<>())
                .captured(request.isCaptureImmediately())
                .amountCaptured(request.isCaptureImmediately() ? request.getAmount() : 0L)
                .build();
        payments.put(paymentId, response);
        log.info("[MOCK PAYMENT] Created payment: {} for amount: {} {}", paymentId, request.getAmount(), request.getCurrency());
        return response;
    }

    public PaymentResponse capturePayment(String paymentId) {
        PaymentResponse payment = payments.get(paymentId);
        if (payment == null) {
            return PaymentResponse.builder().paymentId(paymentId).status("failed").errorMessage("Payment not found").build();
        }
        payment.setStatus("succeeded");
        payment.setCaptured(true);
        payment.setAmountCaptured(payment.getAmount());
        payment.setUpdatedAt(/* JVM-local: mock dev/test gateway, no tenant context */ LocalDateTime.now());
        log.info("[MOCK PAYMENT] Captured payment: {}", paymentId);
        return payment;
    }

    public PaymentResponse refundPayment(String paymentId, Long amount, String reason) {
        PaymentResponse payment = payments.get(paymentId);
        if (payment == null) {
            return PaymentResponse.builder().paymentId(paymentId).status("failed").errorMessage("Payment not found").build();
        }
        Long refundAmount = amount != null ? amount : payment.getAmount();
        payment.setAmountRefunded(refundAmount);
        payment.setRefundId("re_" + UUID.randomUUID().toString().substring(0, 16));
        payment.setStatus("refunded");
        payment.setUpdatedAt(/* JVM-local: mock dev/test gateway, no tenant context */ LocalDateTime.now());
        log.info("[MOCK PAYMENT] Refunded payment: {} amount: {}", paymentId, refundAmount);
        return payment;
    }

    @Transactional(readOnly = true)
    public PaymentResponse getPaymentStatus(String paymentId) {
        PaymentResponse payment = payments.get(paymentId);
        if (payment == null) {
            return PaymentResponse.builder().paymentId(paymentId).status("not_found").errorMessage("Payment not found").build();
        }
        return payment;
    }

    @Transactional
    public PaymentResponse cancelPayment(String paymentId) {
        PaymentResponse payment = payments.get(paymentId);
        if (payment == null) {
            return PaymentResponse.builder().paymentId(paymentId).status("failed").errorMessage("Payment not found").build();
        }
        payment.setStatus("canceled");
        payment.setUpdatedAt(/* JVM-local: mock dev/test gateway, no tenant context */ LocalDateTime.now());
        log.info("[MOCK PAYMENT] Canceled payment: {}", paymentId);
        return payment;
    }

    public boolean isConfigured() {
        return enabled;
    }

    public boolean testConnection() {
        log.info("[MOCK PAYMENT] Testing connection - success");
        return true;
    }

    @Transactional(readOnly = true)
    public String[] getSupportedPaymentMethods() {
        return new String[]{"card", "bank_transfer", "upi", "netbanking"};
    }
}
