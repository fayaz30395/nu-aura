package com.hrms.domain.payment;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.Where;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

@Where(clause = "is_deleted = false")
@Entity
@Table(name = "payment_configs", indexes = {
        @Index(name = "idx_payment_config_tenant", columnList = "tenantId"),
        @Index(name = "idx_payment_config_provider", columnList = "tenantId,provider")
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
