package com.hrms.infrastructure.payment;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentRequest {

    @NotNull(message = "Amount is required")
    @Min(value = 1, message = "Amount must be greater than 0")
    private Long amount;

    @NotBlank(message = "Currency is required")
    private String currency;

    @NotBlank(message = "Description is required")
    private String description;

    private String customerId;
    private String paymentMethod;
    private String paymentMethodId;
    private boolean captureImmediately;
    private String statementDescriptor;
    private Map<String, String> metadata;
    private String receiptEmail;
    private String returnUrl;
    private String cancelUrl;
}
