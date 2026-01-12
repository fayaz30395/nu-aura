package com.hrms.domain.organization;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "succession_plans")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SuccessionPlan extends TenantAware {


    @Column(nullable = false)
    private UUID positionId;

    private UUID currentIncumbentId;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private PlanStatus status = PlanStatus.ACTIVE;

    @Enumerated(EnumType.STRING)
    private RiskLevel riskLevel;

    private String riskReason;

    private LocalDate expectedVacancyDate;

    @Column(columnDefinition = "TEXT")
    private String notes;

    private UUID createdBy;
    private UUID lastReviewedBy;
    private LocalDateTime lastReviewedAt;

    public enum PlanStatus {
        DRAFT,
        ACTIVE,
        UNDER_REVIEW,
        COMPLETED,
        ARCHIVED
    }

    public enum RiskLevel {
        LOW,
        MEDIUM,
        HIGH,
        CRITICAL
    }
}
