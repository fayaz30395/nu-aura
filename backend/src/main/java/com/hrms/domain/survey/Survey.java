package com.hrms.domain.survey;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "surveys")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Survey {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;
    @Column(name = "survey_code", nullable = false, length = 50)
    private String surveyCode;
    @Column(name = "title", nullable = false, length = 200)
    private String title;
    @Column(name = "description", columnDefinition = "TEXT")
    private String description;
    @Enumerated(EnumType.STRING)
    @Column(name = "survey_type", length = 50)
    private SurveyType surveyType;
    @Column(name = "is_anonymous")
    private Boolean isAnonymous = false;
    @Column(name = "start_date")
    private LocalDateTime startDate;
    @Column(name = "end_date")
    private LocalDateTime endDate;
    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20)
    private SurveyStatus status = SurveyStatus.DRAFT;
    @Column(name = "target_audience", length = 50)
    private String targetAudience;
    @Column(name = "total_responses")
    private Integer totalResponses = 0;
    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    @Column(name = "created_by")
    private UUID createdBy;
    @Version
    private Long version = 0L;

    public enum SurveyType {
        ENGAGEMENT, SATISFACTION, PULSE, EXIT, FEEDBACK, CUSTOM
    }

    public enum SurveyStatus {
        DRAFT, ACTIVE, PAUSED, COMPLETED, ARCHIVED
    }
}
