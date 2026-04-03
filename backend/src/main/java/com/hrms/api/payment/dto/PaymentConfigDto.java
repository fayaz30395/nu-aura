package com.hrms.api.payment.dto;

import com.hrms.domain.payment.PaymentConfig;
import lombok.*;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentConfigDto {

    private UUID id;
    private PaymentConfig.PaymentProvider provider;
    private String apiKeyMasked;
    private String merchantId;
    private Boolean isActive;
    private String configKey;

    // Request only - API key in plaintext (must be sent over HTTPS)
    private String apiKey;
    private String webhookSecret;

    public static PaymentConfigDto fromEntity(PaymentConfig entity) {
        return builder()
                .id(entity.getId())
                .provider(entity.getProvider())
                .apiKeyMasked(maskApiKey(entity.getApiKeyEncrypted()))
                .merchantId(entity.getMerchantId())
                .isActive(entity.getIsActive())
                .configKey(entity.getConfigKey())
                .build();
    }

    private static String maskApiKey(String apiKey) {
        if (apiKey == null || apiKey.length() <= 4) {
            return "****";
        }
        return "****" + apiKey.substring(apiKey.length() - 4);
    }

    public PaymentConfig toEntity() {
        return PaymentConfig.builder()
                .id(id)
                .provider(provider)
                .apiKeyEncrypted(apiKey) // Will be encrypted in service
                .merchantId(merchantId)
                .isActive(isActive != null && isActive)
                .configKey(configKey)
                .build();
    }
}
