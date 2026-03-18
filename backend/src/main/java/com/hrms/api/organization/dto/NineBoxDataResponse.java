package com.hrms.api.organization.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Data;

import java.util.Map;

/**
 * Response DTO for Nine-Box talent assessment grid data.
 * The Nine-Box grid plots employees based on performance (X-axis) and potential (Y-axis).
 */
@Data
@Builder
@Schema(description = "Nine-Box talent assessment grid data")
public class NineBoxDataResponse {

    @Schema(description = "Distribution of candidates across the nine boxes. " +
            "Keys follow format: {Performance}_{Potential} (e.g., HIGH_HIGH, MEDIUM_LOW). " +
            "Values are candidate counts.",
            example = "{\"HIGH_HIGH\": 5, \"HIGH_MEDIUM\": 8, \"MEDIUM_HIGH\": 12, \"LOW_LOW\": 2}")
    private Map<String, Integer> distribution;

    @Schema(description = "Total number of candidates in the nine-box analysis", example = "45")
    private int totalCandidates;
}
