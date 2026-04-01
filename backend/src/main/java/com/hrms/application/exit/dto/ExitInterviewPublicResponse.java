package com.hrms.application.exit.dto;

import com.hrms.domain.exit.ExitInterview;
import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class ExitInterviewPublicResponse {

    private UUID id;
    private String employeeName;
    private String scheduledDate;
    private ExitInterview.InterviewStatus status;

    // Ratings (for pre-fill if partially completed)
    private Integer overallExperienceRating;
    private Integer managementRating;
    private Integer workLifeBalanceRating;
    private Integer growthOpportunitiesRating;
    private Integer compensationRating;
    private Integer teamCultureRating;

    private ExitInterview.LeavingReason primaryReasonForLeaving;
    private String detailedReason;
    private String whatLikedMost;
    private String whatCouldImprove;
    private String suggestions;
    private Boolean wouldRecommendCompany;
    private Boolean wouldConsiderReturning;
}
