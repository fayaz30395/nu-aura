package com.hrms.domain.ai;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "candidate_match_scores")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CandidateMatchScore {
    @Id
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "candidate_id", nullable = false)
    private UUID candidateId;

    @Column(name = "job_opening_id", nullable = false)
    private UUID jobOpeningId;

    @Column(name = "overall_match_score", nullable = false)
    private Double overallMatchScore; // 0-100

    @Column(name = "skills_match_score")
    private Double skillsMatchScore;

    @Column(name = "experience_match_score")
    private Double experienceMatchScore;

    @Column(name = "education_match_score")
    private Double educationMatchScore;

    @Column(name = "cultural_fit_score")
    private Double culturalFitScore;

    @Column(name = "matching_criteria", columnDefinition = "TEXT")
    private String matchingCriteria; // JSON with detailed breakdown

    @Column(name = "strengths", columnDefinition = "TEXT")
    private String strengths; // JSON array

    @Column(name = "gaps", columnDefinition = "TEXT")
    private String gaps; // JSON array

    @Column(name = "recommendation", length = 50)
    @Enumerated(EnumType.STRING)
    private Recommendation recommendation;

    @Column(name = "ai_model_version", length = 50)
    private String aiModelVersion;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum Recommendation {
        HIGHLY_RECOMMENDED,
        RECOMMENDED,
        CONSIDER,
        NOT_RECOMMENDED
    }
}
