package com.nulogic.api.recruitment.dto;

import com.nulogic.domain.recruitment.ApplicationStatus;
import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
@Builder
public class ApplicantPipelineResponse {
    private Map<ApplicationStatus, List<ApplicantResponse>> pipeline;
}
