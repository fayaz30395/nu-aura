package com.hrms.domain.performance;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "review_competencies")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class ReviewCompetency extends TenantAware {

    @Column(name = "review_id", nullable = false)
    private UUID reviewId;

    @Column(name = "competency_name", nullable = false, length = 200)
    private String competencyName;

    @Enumerated(EnumType.STRING)
    @Column(length = 100)
    private CompetencyCategory category;

    @Column(precision = 3, scale = 2)
    private BigDecimal rating;

    @Column(columnDefinition = "TEXT")
    private String comments;

    public enum CompetencyCategory {
        TECHNICAL,      // Technical skills (coding, tools, methodologies)
        BEHAVIORAL,     // Soft skills (communication, teamwork, adaptability)
        LEADERSHIP,     // Leadership skills (decision-making, delegation, mentoring)
        DOMAIN,         // Domain expertise
        PROBLEM_SOLVING // Analytical and problem-solving abilities
    }
}
