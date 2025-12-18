package com.hrms.api.performance.dto;

import com.hrms.domain.performance.Feedback360Cycle;
import com.hrms.domain.performance.Feedback360Cycle.CycleStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Feedback360CycleResponse {

    private UUID id;
    private UUID tenantId;
    private String name;
    private String description;
    private CycleStatus status;
    private LocalDate startDate;
    private LocalDate endDate;
    private LocalDate nominationDeadline;
    private LocalDate selfReviewDeadline;
    private LocalDate peerReviewDeadline;
    private LocalDate managerReviewDeadline;
    private Integer minPeersRequired;
    private Integer maxPeersAllowed;
    private Boolean isAnonymous;
    private Boolean includeSelfReview;
    private Boolean includeManagerReview;
    private Boolean includePeerReview;
    private Boolean includeUpwardReview;
    private UUID templateId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static Feedback360CycleResponse fromEntity(Feedback360Cycle cycle) {
        return Feedback360CycleResponse.builder()
                .id(cycle.getId())
                .tenantId(cycle.getTenantId())
                .name(cycle.getName())
                .description(cycle.getDescription())
                .status(cycle.getStatus())
                .startDate(cycle.getStartDate())
                .endDate(cycle.getEndDate())
                .nominationDeadline(cycle.getNominationDeadline())
                .selfReviewDeadline(cycle.getSelfReviewDeadline())
                .peerReviewDeadline(cycle.getPeerReviewDeadline())
                .managerReviewDeadline(cycle.getManagerReviewDeadline())
                .minPeersRequired(cycle.getMinPeersRequired())
                .maxPeersAllowed(cycle.getMaxPeersAllowed())
                .isAnonymous(cycle.getIsAnonymous())
                .includeSelfReview(cycle.getIncludeSelfReview())
                .includeManagerReview(cycle.getIncludeManagerReview())
                .includePeerReview(cycle.getIncludePeerReview())
                .includeUpwardReview(cycle.getIncludeUpwardReview())
                .templateId(cycle.getTemplateId())
                .createdAt(cycle.getCreatedAt())
                .updatedAt(cycle.getUpdatedAt())
                .build();
    }
}
