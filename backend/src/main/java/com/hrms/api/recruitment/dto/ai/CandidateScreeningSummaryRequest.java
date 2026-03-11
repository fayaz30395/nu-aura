package com.hrms.api.recruitment.dto.ai;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CandidateScreeningSummaryRequest {

    @NotNull
    private UUID candidateId;

    @NotNull
    private UUID jobOpeningId;

    /**
     * Optional free-form context for the AI to consider,
     * e.g. stage of pipeline or specific focus areas.
     */
    private String context;
}

