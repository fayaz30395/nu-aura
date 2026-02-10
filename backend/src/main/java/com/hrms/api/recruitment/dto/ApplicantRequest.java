package com.hrms.api.recruitment.dto;

import com.hrms.domain.recruitment.ApplicationSource;
import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

@Data
public class ApplicantRequest {
    private UUID candidateId;
    private UUID jobOpeningId;
    private ApplicationSource source;
    private String notes;
    private BigDecimal expectedSalary;
}
