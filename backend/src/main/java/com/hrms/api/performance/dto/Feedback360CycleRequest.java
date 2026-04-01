package com.hrms.api.performance.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Feedback360CycleRequest {

    @NotBlank(message = "Name is required")
    private String name;

    private String description;

    @NotNull(message = "Start date is required")
    private LocalDate startDate;

    @NotNull(message = "End date is required")
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
}
