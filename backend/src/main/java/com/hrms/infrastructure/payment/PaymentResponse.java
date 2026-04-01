package com.hrms.infrastructure.payment;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentResponse {
    private String paymentId;
    private String status;
    private Long amount;
    private String currency;
    private String description;
    private String customerId;
    private String paymentMethod;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String clientSecret;
    private String receiptUrl;
    private String errorMessage;
    private String errorCode;
    private Map<String, String> metadata;
    private boolean captured;
    private Long amountCaptured;
    private Long amountRefunded;
    private String refundId;
}
