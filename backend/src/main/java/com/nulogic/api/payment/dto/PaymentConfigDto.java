package com.nulogic.api.payment.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nulogic.domain.payment.PaymentConfig;
import lombok.Builder;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentConfigDto {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper()
            .findAndRegisterModules()
            .configure(com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
    private static final String META_CREDENTIALS = "credentials";
    private static final String META_WEBHOOK_URL = "webhookUrl";
    private static final String META_TEST_MODE = "testMode";

    private UUID id;
    private PaymentConfig.PaymentProvider provider;
    private String apiKeyMasked;
    private String merchantId;
    private Boolean isActive;
    private String configKey;
    private Map<String, Object> credentials;
    private String webhookUrl;
    private Boolean testMode;

    // Request only
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String apiKey;

    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String webhookSecret;

    public static PaymentConfigDto fromEntity(PaymentConfig entity) {
        Map<String, Object> metadata = parseMetadata(entity.getMetadata());

        return PaymentConfigDto.builder()
                .id(entity.getId())
                .provider(entity.getProvider())
                .apiKeyMasked(maskApiKey(entity.getApiKeyEncrypted()))
                .merchantId(entity.getMerchantId())
                .isActive(entity.getIsActive())
                .configKey(entity.getConfigKey())
                .credentials(castCredentials(metadata.get(META_CREDENTIALS)))
                .webhookUrl(castWebhookUrl(metadata.get(META_WEBHOOK_URL)))
                .testMode(castBoolean(metadata.get(META_TEST_MODE)))
                .build();
    }

    public PaymentConfig toEntity() {
        PaymentConfig.PaymentConfigBuilder<?, ?> builder = PaymentConfig.builder()
                .id(id)
                .provider(provider)
                .isActive(isActive != null && isActive)
                .merchantId(merchantId)
                .configKey(configKey)
                .webhookSecret(webhookSecret)
                .apiKeyEncrypted(apiKey);

        if (provider != null) {
            builder.provider(provider);
        }
        if (isActive != null) {
            builder.isActive(isActive);
        }
        if (merchantId != null) {
            builder.merchantId(merchantId);
        }

        builder.metadata(toMetadataJson());
        return builder.build();
    }

    private static String maskApiKey(String apiKey) {
        if (apiKey == null || apiKey.length() <= 4) {
            return "****";
        }
        return "****" + apiKey.substring(apiKey.length() - 4);
    }

    private String toMetadataJson() {
        Map<String, Object> metadata = new HashMap<>();
        if (credentials != null && !credentials.isEmpty()) {
            metadata.put(META_CREDENTIALS, credentials);
        }
        if (webhookUrl != null && !webhookUrl.isBlank()) {
            metadata.put(META_WEBHOOK_URL, webhookUrl);
        }
        if (testMode != null) {
            metadata.put(META_TEST_MODE, testMode);
        }

        if (metadata.isEmpty()) {
            return null;
        }

        try {
            return OBJECT_MAPPER.writeValueAsString(metadata);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Invalid payment config payload");
        }
    }

    private static Map<String, Object> parseMetadata(String metadata) {
        if (metadata == null || metadata.isBlank()) {
            return new HashMap<>();
        }
        try {
            return OBJECT_MAPPER.readValue(metadata, new TypeReference<Map<String, Object>>() {
            });
        } catch (JsonProcessingException e) {
            return new HashMap<>();
        }
    }

    private static Map<String, Object> castCredentials(Object raw) {
        if (raw instanceof Map<?, ?> map) {
            Map<String, Object> safe = new HashMap<>();
            map.forEach((k, v) -> {
                if (k != null) {
                    safe.put(k.toString(), v);
                }
            });
            return safe;
        }
        return new HashMap<>();
    }

    private static String castWebhookUrl(Object value) {
        if (value instanceof String s) {
            return s;
        }
        return null;
    }

    private static Boolean castBoolean(Object value) {
        if (value instanceof Boolean b) {
            return b;
        }
        if (value instanceof String s && !s.isBlank()) {
            return Boolean.parseBoolean(s);
        }
        return null;
    }
}
