package com.hrms.application.performance.dto;

import com.hrms.domain.performance.ReviewCompetency;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompetencyResponse {
    private UUID id;
    private UUID reviewId;
    private String competencyName;
    private ReviewCompetency.CompetencyCategory category;
    private BigDecimal rating;
    private String comments;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
