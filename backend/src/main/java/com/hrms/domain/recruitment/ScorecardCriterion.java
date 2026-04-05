package com.hrms.domain.recruitment;

import com.hrms.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.SQLRestriction;

import java.util.UUID;

@SQLRestriction("is_deleted = false")
@Entity
@Table(name = "scorecard_criteria", indexes = {
        @Index(name = "idx_criteria_scorecard", columnList = "scorecard_id"),
        @Index(name = "idx_criteria_tenant", columnList = "tenant_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
@EqualsAndHashCode(callSuper = true)
public class ScorecardCriterion extends BaseEntity {

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "scorecard_id", nullable = false)
    private UUID scorecardId;

    @Column(name = "name", nullable = false, length = 200)
    private String name;

    @Column(name = "category", length = 100)
    private String category;

    @Column(name = "rating", nullable = false)
    private Integer rating;

    @lombok.Builder.Default
    @Column(name = "weight", nullable = false)
    private Double weight = 1.0;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "order_index")
    private Integer orderIndex;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "scorecard_id", referencedColumnName = "id", insertable = false, updatable = false)
    private InterviewScorecard scorecard;
}
