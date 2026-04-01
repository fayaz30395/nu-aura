package com.hrms.domain.wellness;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.Where;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Where(clause = "is_deleted = false")
@Entity
@Table(name = "wellness_programs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class WellnessProgram extends TenantAware {

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ProgramType programType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ProgramCategory category;

    private LocalDate startDate;
    private LocalDate endDate;

    @Column(name = "max_participants")
    private Integer maxParticipants;

    @Column(name = "points_reward")
    private Integer pointsReward;

    @Column(name = "budget_amount", precision = 12, scale = 2)
    private BigDecimal budgetAmount;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "is_featured")
    @Builder.Default
    private Boolean isFeatured = false;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(name = "external_link")
    private String externalLink;

    @Column(name = "instructions", columnDefinition = "TEXT")
    private String instructions;

    @OneToMany(mappedBy = "program", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<WellnessChallenge> challenges = new ArrayList<>();

    public enum ProgramType {
        ONGOING,
        CHALLENGE,
        WORKSHOP,
        CAMPAIGN,
        ASSESSMENT
    }

    public enum ProgramCategory {
        PHYSICAL_FITNESS,
        MENTAL_HEALTH,
        NUTRITION,
        SLEEP,
        STRESS_MANAGEMENT,
        FINANCIAL_WELLNESS,
        SOCIAL_WELLNESS,
        PREVENTIVE_HEALTH,
        WORK_LIFE_BALANCE
    }
}
