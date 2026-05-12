package com.nulogic.api.recruitment.dto;

import com.nulogic.domain.recruitment.ApplicationStatus;
import lombok.Data;

@Data
public class ApplicantStatusUpdateRequest {
    private ApplicationStatus status;
    private String notes;
    private String rejectionReason;
}
