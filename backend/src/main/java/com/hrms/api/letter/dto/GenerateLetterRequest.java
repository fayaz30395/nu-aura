package com.hrms.api.letter.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GenerateLetterRequest {

    @NotNull(message = "Template ID is required")
    private UUID templateId;

    @NotNull(message = "Employee ID is required")
    private UUID employeeId;

    private String letterTitle;

    private LocalDate letterDate;
    private LocalDate effectiveDate;
    private LocalDate expiryDate;

    private Map<String, String> customPlaceholderValues;

    private String additionalNotes;

    @Builder.Default
    private Boolean submitForApproval = false;
}
