package com.hrms.domain.ai;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "ai_usage_log")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class AiUsageLog extends TenantAware {

    @Column(name = "user_id")
    private UUID userId;

    @Column(nullable = false, length = 100)
    private String feature;

    @Column(name = "tokens_used", nullable = false)
    @Builder.Default
    private Integer tokensUsed = 0;

    @Column(name = "cost_usd", precision = 10, scale = 6)
    @Builder.Default
    private BigDecimal costUsd = BigDecimal.ZERO;

    @Column(name = "model_name", length = 100)
    private String modelName;

    @Column(name = "request_metadata", columnDefinition = "JSONB")
    private String requestMetadata;
}
