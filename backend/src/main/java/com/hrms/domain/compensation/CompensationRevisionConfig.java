package com.hrms.domain.compensation;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;

@Entity
@Table(name = "compensation_revision_configs", indexes = {
        @Index(name = "idx_comp_rev_config_tenant", columnList = "tenant_id"),
        @Index(name = "idx_comp_rev_config_rating", columnList = "tenant_id, rating_label")
}, uniqueConstraints = {
        @UniqueConstraint(name = "uq_comp_rev_config_tenant_rating",
                columnNames = {"tenant_id", "rating_label"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class CompensationRevisionConfig extends TenantAware {

    @Column(name = "rating_label", nullable = false, length = 50)
    private String ratingLabel;

    @Column(name = "min_increment_pct", precision = 5, scale = 2)
    private BigDecimal minIncrementPct;

    @Column(name = "max_increment_pct", precision = 5, scale = 2)
    private BigDecimal maxIncrementPct;

    @Column(name = "default_increment_pct", nullable = false, precision = 5, scale = 2)
    private BigDecimal defaultIncrementPct;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;
}
