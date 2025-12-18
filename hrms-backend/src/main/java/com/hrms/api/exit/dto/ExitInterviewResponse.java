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
public class ExitInterviewResponse {
    private UUID id;
    private UUID tenantId;
    private UUID exitProcessId;
    private UUID employeeId;
    private String employeeName;
    private UUID interviewerId;
    private String interviewerName;
    private LocalDate scheduledDate;
    private LocalDateTime scheduledTime;
    private LocalDate actualDate;
    private ExitInterview.InterviewMode interviewMode;
    private ExitInterview.InterviewStatus status;

    // Ratings
    private Integer overallExperienceRating;
    private Integer managementRating;
    private Integer workLifeBalanceRating;
    private Integer growthOpportunitiesRating;
    private Integer compensationRating;
    private Integer teamCultureRating;
    private Double averageRating;

    // Feedback
    private ExitInterview.LeavingReason primaryReasonForLeaving;
    private String detailedReason;
    private String whatLikedMost;
    private String whatCouldImprove;
    private String suggestions;
    private Boolean wouldRecommendCompany;
    private Boolean wouldConsiderReturning;

    // New employer
    private String newEmployer;
    private String newRole;
    private Integer newSalaryIncreasePercentage;

    private String interviewerNotes;
    private Boolean isConfidential;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
