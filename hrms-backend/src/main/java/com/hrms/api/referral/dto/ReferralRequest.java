package com.hrms.api.referral.dto;

import com.hrms.domain.referral.EmployeeReferral;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.time.LocalDate;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReferralRequest {

    @NotBlank(message = "Candidate name is required")
    private String candidateName;

    @NotBlank(message = "Candidate email is required")
    @Email(message = "Invalid email format")
    private String candidateEmail;

    private String candidatePhone;
    private String candidateLinkedin;
    private String resumePath;

    private UUID jobId;
    private String jobTitle;
    private UUID departmentId;

    private EmployeeReferral.Relationship relationship;
    private LocalDate knownSince;
    private String referrerNotes;
}
