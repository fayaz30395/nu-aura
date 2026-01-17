package com.hrms.api.letter.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GenerateOfferLetterRequest {

    @NotNull(message = "Template ID is required")
    private UUID templateId;

    @NotNull(message = "Candidate ID is required")
    private UUID candidateId;

    private String letterTitle;

    @NotNull(message = "Offered CTC is required")
    private BigDecimal offeredCtc;

    @NotNull(message = "Offered designation is required")
    private String offeredDesignation;

    @NotNull(message = "Proposed joining date is required")
    private LocalDate proposedJoiningDate;

    private LocalDate letterDate;
    private LocalDate expiryDate;

    private Map<String, String> customPlaceholderValues;

    private String additionalNotes;

    @Builder.Default
    private Boolean submitForApproval = false;

    @Builder.Default
    private Boolean sendForESign = false;
}
