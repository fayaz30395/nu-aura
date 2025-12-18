package com.hrms.api.recruitment.dto.ai;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JobDescriptionRequest {
    private String jobTitle;
    private String department;
    private String location;
    private String employmentType; // Full-time, Part-time, Contract
    private String experienceRange; // e.g., "3-5 years"
    private List<String> keySkills;
    private String industry;
    private String companyCulture;
    private String salaryRange;
    private String additionalContext;
}
