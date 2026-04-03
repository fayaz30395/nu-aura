package com.hrms.domain.exit;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.Where;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Where(clause = "is_deleted = false")
@Entity
@Table(name = "exit_interviews")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class ExitInterview extends TenantAware {


    @Column(name = "exit_process_id", nullable = false)
    private UUID exitProcessId;

    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    @Column(name = "interviewer_id")
    private UUID interviewerId;

    @Column(name = "scheduled_date")
    private LocalDate scheduledDate;

    @Column(name = "scheduled_time")
    private LocalDateTime scheduledTime;

    @Column(name = "actual_date")
    private LocalDate actualDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "interview_mode")
    private InterviewMode interviewMode;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    @Builder.Default
    private InterviewStatus status = InterviewStatus.SCHEDULED;

    // Survey responses (JSON or structured)
    @Column(name = "overall_experience_rating")
    private Integer overallExperienceRating; // 1-5

    @Column(name = "management_rating")
    private Integer managementRating; // 1-5

    @Column(name = "work_life_balance_rating")
    private Integer workLifeBalanceRating; // 1-5

    @Column(name = "growth_opportunities_rating")
    private Integer growthOpportunitiesRating; // 1-5

    @Column(name = "compensation_rating")
    private Integer compensationRating; // 1-5

    @Column(name = "team_culture_rating")
    private Integer teamCultureRating; // 1-5

    @Enumerated(EnumType.STRING)
    @Column(name = "primary_reason_for_leaving")
    private LeavingReason primaryReasonForLeaving;

    @Column(name = "detailed_reason", columnDefinition = "TEXT")
    private String detailedReason;

    @Column(name = "what_liked_most", columnDefinition = "TEXT")
    private String whatLikedMost;

    @Column(name = "what_could_improve", columnDefinition = "TEXT")
    private String whatCouldImprove;

    @Column(name = "suggestions", columnDefinition = "TEXT")
    private String suggestions;

    @Column(name = "would_recommend_company")
    private Boolean wouldRecommendCompany;

    @Column(name = "would_consider_returning")
    private Boolean wouldConsiderReturning;

    @Column(name = "new_employer")
    private String newEmployer;

    @Column(name = "new_role")
    private String newRole;

    @Column(name = "new_salary_increase_percentage")
    private Integer newSalaryIncreasePercentage;

    @Column(name = "interviewer_notes", columnDefinition = "TEXT")
    private String interviewerNotes;

    @Column(name = "is_confidential")
    @Builder.Default
    private Boolean isConfidential = true;

    /**
     * Token for token-based public survey link (shared with departing employee)
     */
    @Column(name = "public_token", unique = true)
    private String publicToken;

    public Double getAverageRating() {
        int count = 0;
        int sum = 0;

        if (overallExperienceRating != null) {
            sum += overallExperienceRating;
            count++;
        }
        if (managementRating != null) {
            sum += managementRating;
            count++;
        }
        if (workLifeBalanceRating != null) {
            sum += workLifeBalanceRating;
            count++;
        }
        if (growthOpportunitiesRating != null) {
            sum += growthOpportunitiesRating;
            count++;
        }
        if (compensationRating != null) {
            sum += compensationRating;
            count++;
        }
        if (teamCultureRating != null) {
            sum += teamCultureRating;
            count++;
        }

        return count > 0 ? (double) sum / count : null;
    }

    public enum InterviewMode {
        IN_PERSON,
        VIDEO_CALL,
        PHONE,
        WRITTEN_SURVEY
    }

    public enum InterviewStatus {
        SCHEDULED,
        COMPLETED,
        CANCELLED,
        NO_SHOW,
        RESCHEDULED
    }

    public enum LeavingReason {
        BETTER_OPPORTUNITY,
        COMPENSATION,
        CAREER_GROWTH,
        WORK_LIFE_BALANCE,
        MANAGEMENT_ISSUES,
        RELOCATION,
        PERSONAL_REASONS,
        HEALTH_ISSUES,
        HIGHER_EDUCATION,
        STARTING_OWN_BUSINESS,
        RETIREMENT,
        COMPANY_CULTURE,
        JOB_SECURITY,
        OTHER
    }
}
