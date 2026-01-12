package com.hrms.api.exit.dto;

import com.hrms.domain.exit.ExitInterview;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExitInterviewRequest {
    private UUID exitProcessId;
    private UUID employeeId;
    private UUID interviewerId;
    private LocalDate scheduledDate;
    private LocalDateTime scheduledTime;
    private LocalDate actualDate;
    private ExitInterview.InterviewMode interviewMode;
    private ExitInterview.InterviewStatus status;

    // Ratings (1-5)
    private Integer overallExperienceRating;
    private Integer managementRating;
    private Integer workLifeBalanceRating;
    private Integer growthOpportunitiesRating;
    private Integer compensationRating;
    private Integer teamCultureRating;

    // Feedback
    private ExitInterview.LeavingReason primaryReasonForLeaving;
    private String detailedReason;
    private String whatLikedMost;
    private String whatCouldImprove;
    private String suggestions;
    private Boolean wouldRecommendCompany;
    private Boolean wouldConsiderReturning;

    // New employer info
    private String newEmployer;
    private String newRole;
    private Integer newSalaryIncreasePercentage;

    // Notes
    private String interviewerNotes;
    private Boolean isConfidential;
}
