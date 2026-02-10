package com.hrms.api.recruitment.dto;

import com.hrms.domain.recruitment.ApplicationStatus;
import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
@Builder
public class ApplicantPipelineResponse {
    private Map<ApplicationStatus, List<ApplicantResponse>> pipeline;
}
