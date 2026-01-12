package com.hrms.api.analytics.dto;

import com.hrms.domain.analytics.AnalyticsInsight;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AnalyticsInsightDto {

    private UUID id;
    private String title;
    private String description;
    private String insightType;
    private String category;
    private String severity;
    private UUID departmentId;
    private String departmentName;

    // Impact assessment
    private Integer impactScore;
    private Integer affectedEmployees;
    private BigDecimal potentialCostImpact;

    // Recommendation
    private String recommendation;
    private List<String> actionItems;

    // Status tracking
    private String status;
    private UUID assignedTo;
    private String assigneeName;
    private LocalDate dueDate;
    private LocalDateTime resolvedAt;
    private String resolutionNotes;

    // Data source
    private String dataSource;
    private LocalDateTime generatedAt;
    private LocalDate validUntil;

    public static AnalyticsInsightDto fromEntity(AnalyticsInsight insight) {
        List<String> actionItemsList = null;
        if (insight.getActionItems() != null) {
            try {
                actionItemsList = new com.fasterxml.jackson.databind.ObjectMapper()
                        .readValue(insight.getActionItems(),
                                   new com.fasterxml.jackson.core.type.TypeReference<List<String>>() {});
            } catch (Exception e) {
                actionItemsList = List.of(insight.getActionItems());
            }
        }

        return AnalyticsInsightDto.builder()
                .id(insight.getId())
                .title(insight.getTitle())
                .description(insight.getDescription())
                .insightType(insight.getInsightType() != null ? insight.getInsightType().name() : null)
                .category(insight.getCategory() != null ? insight.getCategory().name() : null)
                .severity(insight.getSeverity() != null ? insight.getSeverity().name() : null)
                .departmentId(insight.getDepartmentId())
                .departmentName(insight.getDepartmentName())
                .impactScore(insight.getImpactScore())
                .affectedEmployees(insight.getAffectedEmployees())
                .potentialCostImpact(insight.getPotentialCostImpact())
                .recommendation(insight.getRecommendation())
                .actionItems(actionItemsList)
                .status(insight.getStatus() != null ? insight.getStatus().name() : null)
                .assignedTo(insight.getAssignedTo())
                .dueDate(insight.getDueDate())
                .resolvedAt(insight.getResolvedAt())
                .resolutionNotes(insight.getResolutionNotes())
                .dataSource(insight.getDataSource())
                .generatedAt(insight.getGeneratedAt())
                .validUntil(insight.getValidUntil())
                .build();
    }
}
