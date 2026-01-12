package com.hrms.api.referral.dto;

import com.hrms.domain.referral.EmployeeReferral;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReferralResponse {

    private UUID id;
    private UUID referrerId;
    private String referrerName;
    private String referralCode;

    // Candidate Info
    private String candidateName;
    private String candidateEmail;
    private String candidatePhone;
    private String candidateLinkedin;
    private String resumePath;

    // Job Details
    private UUID jobId;
    private String jobTitle;
    private UUID departmentId;
    private String departmentName;

    // Relationship
    private EmployeeReferral.Relationship relationship;
    private LocalDate knownSince;
    private String referrerNotes;

    // Status
    private EmployeeReferral.ReferralStatus status;
    private LocalDate submittedDate;
    private LocalDate screeningDate;
    private LocalDate interviewDate;
    private LocalDate offerDate;
    private LocalDate joiningDate;
    private UUID hiredEmployeeId;
    private String rejectionReason;
    private String rejectionStage;

    // Bonus
    private BigDecimal bonusAmount;
    private EmployeeReferral.BonusStatus bonusStatus;
    private LocalDate bonusEligibleDate;
    private LocalDate bonusPaidDate;
    private String bonusPaymentReference;
    private String processingNotes;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
