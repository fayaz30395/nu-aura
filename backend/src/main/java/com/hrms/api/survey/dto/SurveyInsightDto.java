package com.hrms.api.survey.dto;

import com.hrms.domain.survey.SurveyInsight.*;
import com.hrms.domain.survey.SurveyQuestion.EngagementCategory;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SurveyInsightDto {

    private UUID id;
    private UUID surveyId;
    private String surveyTitle;
    private InsightType insightType;
    private InsightPriority priority;
    private String title;
    private String description;
    private String recommendation;
    private EngagementCategory category;
    private UUID departmentId;
    private String departmentName;
    private UUID locationId;
    private String locationName;
    private Double impactScore;
    private Double confidenceScore;
    private Integer affectedEmployees;
    private Double percentageChange;
    private List<String> keyThemes;
    private List<UUID> relatedQuestions;
    private TrendDirection trend;
    private Integer trendPeriodWeeks;
    private ActionStatus actionStatus;
    private UUID assignedTo;
    private String assignedToName;
    private LocalDateTime actionDueDate;
    private String actionNotes;
    private boolean isAcknowledged;
    private UUID acknowledgedBy;
    private String acknowledgedByName;
    private LocalDateTime acknowledgedAt;
    private LocalDateTime generatedAt;
}
