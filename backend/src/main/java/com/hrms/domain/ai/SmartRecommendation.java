package com.hrms.domain.ai;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "smart_recommendations")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SmartRecommendation {
    @Id
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "target_type", nullable = false, length = 50)
    @Enumerated(EnumType.STRING)
    private TargetType targetType;

    @Column(name = "target_id", nullable = false)
    private UUID targetId; // Employee, manager, job opening, etc.

    @Column(name = "recommendation_type", nullable = false, length = 50)
    @Enumerated(EnumType.STRING)
    private RecommendationType recommendationType;

    @Column(name = "recommendation_data", columnDefinition = "TEXT")
    private String recommendationData; // JSON with recommendation details

    @Column(name = "confidence_score")
    private Double confidenceScore;

    @Column(name = "priority", length = 20)
    @Enumerated(EnumType.STRING)
    private Priority priority;

    @Column(name = "is_acted_upon")
    private Boolean isActedUpon;

    @Column(name = "action_taken", columnDefinition = "TEXT")
    private String actionTaken;

    @Column(name = "was_useful")
    private Boolean wasUseful; // User feedback

    @Column(name = "ai_model_version", length = 50)
    private String aiModelVersion;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    public enum TargetType {
        EMPLOYEE,
        MANAGER,
        JOB_OPENING,
        TRAINING_PROGRAM,
        PROJECT
    }

    public enum RecommendationType {
        LEARNING_PATH,
        CAREER_DEVELOPMENT,
        SKILL_DEVELOPMENT,
        TEAM_ASSIGNMENT,
        MENTOR_MATCH,
        TRAINING_COURSE,
        ROLE_SUITABILITY,
        SUCCESSION_CANDIDATE
    }

    public enum Priority {
        LOW,
        MEDIUM,
        HIGH,
        URGENT
    }
}
