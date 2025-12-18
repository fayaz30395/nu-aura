package com.hrms.domain.statutory;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "esi_configs")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ESIConfig {
    @Id
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "effective_from", nullable = false)
    private LocalDate effectiveFrom;

    @Column(name = "effective_to")
    private LocalDate effectiveTo;

    @Column(name = "employee_contribution_percentage", nullable = false, precision = 5, scale = 2)
    private BigDecimal employeeContributionPercentage;

    @Column(name = "employer_contribution_percentage", nullable = false, precision = 5, scale = 2)
    private BigDecimal employerContributionPercentage;

    @Column(name = "wage_ceiling", precision = 10, scale = 2)
    private BigDecimal wageCeiling; // Maximum wage for ESI applicability

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
}
