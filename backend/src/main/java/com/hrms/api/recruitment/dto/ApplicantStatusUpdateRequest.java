package com.hrms.api.recruitment.dto;

import com.hrms.domain.recruitment.ApplicationStatus;
import lombok.Data;

@Data
public class ApplicantStatusUpdateRequest {
    private ApplicationStatus status;
    private String notes;
    private String rejectionReason;
}
