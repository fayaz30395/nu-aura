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
public class FeedbackSynthesisRequest {

    @NotNull
    private UUID candidateId;

    @NotNull
    private UUID jobOpeningId;
}
