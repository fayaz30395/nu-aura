package com.hrms.api.recruitment.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
public class AgencyPerformanceDto {
    private UUID agencyId;
    private String agencyName;
    private long totalSubmissions;
    private long hiredCount;
    private long rejectedCount;
    private long activeSubmissions;
    private BigDecimal hireRate;
    private BigDecimal totalFeesPaid;
    private Integer rating;
}
