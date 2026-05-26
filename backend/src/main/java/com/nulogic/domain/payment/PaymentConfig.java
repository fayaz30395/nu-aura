package com.nulogic.domain.payment;

import com.nulogic.common.converter.EncryptedStringConverter;
import com.nulogic.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.Where;

@Where(clause = "is_deleted = false")
@Entity
@Table(name = "payment_configs", indexes = {
        @Index(name = "idx_payment_config_tenant", columnList = "tenant_id"),
        @Index(name = "idx_payment_config_provider", columnList = "tenant_id,provider")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class PaymentConfig extends TenantAware {

    @Column(nullable = false, length = 50)
    @Enumerated(EnumType.STRING)
    private PaymentProvider provider;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String apiKeyEncrypted;

    @Convert(converter = EncryptedStringConverter.class)
    @Column(columnDefinition = "TEXT")
    private String webhookSecret;

    @Column(length = 255)
    private String merchantId;

    @Builder.Default
    @Column(nullable = false)
    private Boolean isActive = false;

    @Column(columnDefinition = "JSONB")
    private String metadata;

    @Column(unique = true, nullable = false)
    private String configKey;

    public enum PaymentProvider {
        RAZORPAY,
        STRIPE,
        BANK_TRANSFER,
        PAYPAL
    }
}
