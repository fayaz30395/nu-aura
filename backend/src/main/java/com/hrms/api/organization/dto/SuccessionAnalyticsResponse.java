package com.hrms.api.organization.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Data;

import java.util.Map;

/**
 * Response DTO for succession planning analytics.
 */
@Data
@Builder
@Schema(description = "Succession planning analytics summary")
public class SuccessionAnalyticsResponse {

    @Schema(description = "Number of active succession plans", example = "15")
    private long activePlans;

    @Schema(description = "Number of high-risk succession plans (critical positions with no ready candidates)", example = "3")
    private int highRiskPlans;

    @Schema(description = "Total number of critical positions in the organization", example = "25")
    private int criticalPositions;

    @Schema(description = "Number of critical positions without an active succession plan", example = "5")
    private long criticalWithoutPlan;

    @Schema(description = "Distribution of candidates by readiness level (READY_NOW, READY_1_YEAR, READY_2_YEARS, etc.)")
    private Map<String, Integer> readinessDistribution;

    @Schema(description = "Number of active talent pools", example = "4")
    private int talentPools;

    @Schema(description = "Total members across all talent pools", example = "45")
    private int totalPoolMembers;
}
