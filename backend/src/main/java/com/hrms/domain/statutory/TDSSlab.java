package com.hrms.domain.statutory;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "tds_slabs")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TDSSlab {
    @Id
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "assessment_year", nullable = false, length = 10) // e.g., "2024-25"
    private String assessmentYear;

    @Column(name = "tax_regime", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private TaxRegime taxRegime;

    @Column(name = "min_income", nullable = false, precision = 12, scale = 2)
    private BigDecimal minIncome;

    @Column(name = "max_income", precision = 12, scale = 2)
    private BigDecimal maxIncome;

    @Column(name = "tax_percentage", nullable = false, precision = 5, scale = 2)
    private BigDecimal taxPercentage;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "created_by")
    private UUID createdBy;

    @Column(name = "updated_by")
    private UUID updatedBy;

    public enum TaxRegime {
        OLD_REGIME,
        NEW_REGIME
    }
}
