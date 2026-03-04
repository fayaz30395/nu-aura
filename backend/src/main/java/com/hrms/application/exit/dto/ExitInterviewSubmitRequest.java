package com.hrms.application.exit.dto;

import com.hrms.domain.exit.ExitInterview;
import lombok.Data;

@Data
public class ExitInterviewSubmitRequest {

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
    private String newEmployer;
    private String newRole;
    private Integer newSalaryIncreasePercentage;
}
