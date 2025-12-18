package com.hrms.application.performance.dto;

import com.hrms.domain.performance.ReviewCompetency;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompetencyRequest {
    private UUID reviewId;
    private String competencyName;
    private ReviewCompetency.CompetencyCategory category;
    private BigDecimal rating;
    private String comments;
}
